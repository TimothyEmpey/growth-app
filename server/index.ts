import {
  accountIdForRequest,
  accountRoute,
  accountsConfigured,
  requireAccountId,
} from './accounts';
import { fatSecretConfigured, foodDetail, searchFoods } from './food';
import { authorize, nativeExchange, oauthCallback } from './oauth';
import { hash, rateLimit } from './security';
import {
  disconnectAccountStrava,
  getAccountConnection,
  getConnection,
  normalizeRun,
  processJob,
  storeRun,
  stravaGet,
  type StravaActivity,
} from './strava';
import { configured, type Env, json, now, ServiceError, type SyncJob } from './types';
import type { Run } from '../src/domain/types';

// Worker entry point: HTTP routes below, queue processing and scheduled reconciliation at the end.
async function requestSync(env: Env, athleteId: string) {
  const connection = await getConnection(env, athleteId);
  if (!connection || connection.status !== 'connected')
    throw new ServiceError('Reconnect Strava to sync your activities.', 401);
  const generation = connection.generation;
  // Resume unfinished imports at their saved page and cutoff; completed imports start a new pass.
  const before = connection.sync_complete ? now() : connection.sync_before;
  const page = connection.sync_complete ? 1 : connection.sync_cursor;
  if (connection.sync_complete)
    await env.DB.prepare(
      'UPDATE connections SET sync_before=?,sync_cursor=1,sync_complete=0,sync_error=NULL WHERE athlete_id=? AND generation=? AND sync_complete=1',
    )
      .bind(before, athleteId, generation)
      .run();
  await env.SYNC_QUEUE.send({ kind: 'import', athleteId, generation, page, before });
}
async function webhook(request: Request, env: Env) {
  const url = new URL(request.url);
  if (!env.WEBHOOK_PATH_SECRET || url.pathname !== `/api/strava/webhook/${env.WEBHOOK_PATH_SECRET}`)
    throw new ServiceError('Not found.', 404);
  if (request.method === 'GET') {
    if (
      !env.STRAVA_VERIFY_TOKEN ||
      url.searchParams.get('hub.verify_token') !== env.STRAVA_VERIFY_TOKEN ||
      url.searchParams.get('hub.mode') !== 'subscribe'
    )
      throw new ServiceError('Invalid webhook verification.', 403);
    return json({ 'hub.challenge': url.searchParams.get('hub.challenge') });
  }
  if (request.method !== 'POST') throw new ServiceError('Method not allowed.', 405);
  const event = (await request.json()) as {
    owner_id: number;
    subscription_id: number;
    object_id: number;
    object_type: string;
    aspect_type: string;
    event_time: number;
    updates?: { authorized?: string };
  };
  if (String(event.subscription_id) !== env.STRAVA_SUBSCRIPTION_ID)
    throw new ServiceError('Invalid webhook subscription.', 403);
  if (
    !['activity', 'athlete'].includes(event.object_type) ||
    !['create', 'update', 'delete'].includes(event.aspect_type) ||
    !Number.isSafeInteger(event.object_id) ||
    !Number.isSafeInteger(event.event_time)
  )
    throw new ServiceError('Invalid webhook event.');
  const connection = await getConnection(env, String(event.owner_id));
  if (!connection) return json({ received: true });
  const eventKey = await hash(
    JSON.stringify([
      event.owner_id,
      event.object_id,
      event.object_type,
      event.aspect_type,
      event.event_time,
      event.updates,
    ]),
  );
  await env.DB.prepare('INSERT OR IGNORE INTO events (event_key,created_at) VALUES (?,?)')
    .bind(eventKey, now())
    .run();
  await env.SYNC_QUEUE.send({
    kind: 'event',
    athleteId: String(event.owner_id),
    generation: connection.generation,
    eventKey,
    objectId: String(event.object_id),
    objectType: event.object_type,
    aspect: event.aspect_type,
    authorized: event.updates?.authorized,
    eventTime: event.event_time,
  });
  return json({ received: true });
}
async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname,
    method = request.method;
  if (path === '/api/account' || path.startsWith('/api/account/'))
    return accountRoute(request, env);
  if (path.startsWith('/api/strava/webhook/')) return webhook(request, env);
  if (path === '/api/health')
    return json({
      ok: true,
      accountsConfigured: accountsConfigured(env),
      stravaConfigured: configured(env),
      foodConfigured: fatSecretConfigured(env),
    });
  if (path === '/api/strava/status' && method === 'GET') {
    if (!configured(env)) return json({ configured: false, connected: false });
    const accountId = await accountIdForRequest(request, env);
    const connection = accountId ? await getAccountConnection(env, accountId) : null;
    if (!connection) return json({ configured: true, connected: false });
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM runs WHERE athlete_id=?')
      .bind(connection.athlete_id)
      .first<{ count: number }>();
    return json({
      configured: true,
      connected: connection.status === 'connected',
      status: connection.status,
      athleteName: connection.name,
      complete: !!connection.sync_complete,
      importedCount: count?.count ?? 0,
      lastSync: connection.last_sync,
      error: connection.sync_error,
    });
  }
  if (path === '/api/strava/authorize' && method === 'POST') {
    await rateLimit(request, env, 'authorize', 8);
    return authorize(request, env);
  }
  if (path === '/api/strava/callback' && method === 'GET') return oauthCallback(request, env);
  if (path === '/api/strava/exchange' && method === 'POST') {
    await rateLimit(request, env, 'exchange', 15);
    return nativeExchange(request, env);
  }
  if (path === '/api/strava/disconnect' && method === 'POST') {
    const accountId = await requireAccountId(request, env);
    await disconnectAccountStrava(env, accountId);
    return json({ disconnected: true });
  }
  if (path === '/api/strava/sync' && method === 'POST') {
    const accountId = await requireAccountId(request, env);
    const connection = await getAccountConnection(env, accountId);
    if (!connection) throw new ServiceError('Connect your Strava account to continue.', 401);
    await rateLimit(request, env, 'sync', 3);
    await requestSync(env, connection.athlete_id);
    return json({ queued: true }, 202);
  }
  if (path === '/api/run-days' && method === 'GET') {
    const accountId = await requireAccountId(request, env);
    const connection = await getAccountConnection(env, accountId);
    if (connection?.status !== 'connected')
      throw new ServiceError('Reconnect Strava to include activities in your streak.', 401);
    const days = await env.DB.prepare(
      'SELECT DISTINCT local_date FROM runs WHERE athlete_id=? ORDER BY local_date',
    )
      .bind(connection.athlete_id)
      .all<{ local_date: string }>();
    return json({
      dates: days.results.map((row) => row.local_date),
      complete: !!connection.sync_complete,
    });
  }
  if (path === '/api/runs' && method === 'GET') {
    const accountId = await requireAccountId(request, env);
    const connection = await getAccountConnection(env, accountId);
    if (connection?.status !== 'connected')
      throw new ServiceError('Reconnect Strava to view your activities.', 401);
    const athleteId = connection.athlete_id;
    const start = url.searchParams.get('start') ?? '0001-01-01',
      end = url.searchParams.get('end') ?? '9999-12-31',
      activity = url.searchParams.get('activity') ?? 'run';
    if (![start, end].every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) || start > end)
      throw new ServiceError('Invalid date range.');
    if (!['run', 'hike', 'all'].includes(activity))
      throw new ServiceError('Invalid activity filter.');
    const activitySql =
      activity === 'run'
        ? "AND json_extract(data,'$.sport') IN ('Run','TrailRun','VirtualRun')"
        : activity === 'hike'
          ? "AND json_extract(data,'$.sport') = 'Hike'"
          : '';
    let cursorDate = '9999-12-31',
      cursorId = '~';
    if (url.searchParams.has('cursor')) {
      try {
        const parsed = JSON.parse(atob(url.searchParams.get('cursor')!));
        if (
          !Array.isArray(parsed) ||
          parsed.length !== 2 ||
          !parsed.every((v) => typeof v === 'string')
        )
          throw new Error();
        [cursorDate, cursorId] = parsed;
      } catch {
        throw new ServiceError('Invalid page cursor.');
      }
    }
    const result = await env.DB.prepare(
      `SELECT data,local_date,id FROM runs WHERE athlete_id=? AND local_date>=? AND local_date<=? ${activitySql} AND (local_date < ? OR (local_date = ? AND id < ?)) ORDER BY local_date DESC,id DESC LIMIT 31`,
    )
      .bind(athleteId, start, end, cursorDate, cursorDate, cursorId)
      .all<{ data: string; local_date: string; id: string }>();
    const rows = result.results.slice(0, 30),
      last = rows.at(-1);
    // Aggregate the full period so pace uses total moving time divided by total distance.
    const summary = await env.DB.prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(distance),0) AS distanceMeters, COALESCE(SUM(moving_seconds),0) AS movingSeconds FROM runs WHERE athlete_id=? AND local_date>=? AND local_date<=? ${activitySql}`,
    )
      .bind(athleteId, start, end)
      .first();
    return json({
      runs: rows.map((r) => JSON.parse(r.data)),
      nextCursor:
        result.results.length > 30 && last
          ? btoa(JSON.stringify([last.local_date, last.id]))
          : null,
      summary,
      complete: !!connection.sync_complete,
    });
  }
  if (/^\/api\/runs\/\d+$/.test(path) && method === 'GET') {
    const accountId = await requireAccountId(request, env);
    const id = path.split('/').at(-1)!;
    const connection = await getAccountConnection(env, accountId);
    if (!connection || connection.status !== 'connected')
      throw new ServiceError('Reconnect Strava to view your activities.', 401);
    const athleteId = connection.athlete_id;
    const cached = await env.DB.prepare(
      'SELECT data,detailed FROM runs WHERE athlete_id=? AND id=?',
    )
      .bind(athleteId, id)
      .first<{ data: string; detailed: number }>();
    if (!cached) throw new ServiceError('Run not found.', 404);
    if (cached.detailed && 'metricSplits' in JSON.parse(cached.data))
      return json(JSON.parse(cached.data) as Run);
    const run = normalizeRun(await stravaGet<StravaActivity>(`activities/${id}`, env, athleteId));
    if (!run) {
      await env.DB.prepare('DELETE FROM runs WHERE athlete_id=? AND id=?')
        .bind(athleteId, id)
        .run();
      throw new ServiceError('This activity is no longer a supported run or hike.', 404);
    }
    await storeRun(env, athleteId, connection.generation, run, true);
    return json(run);
  }
  if (path === '/api/foods/search' && method === 'GET') {
    const query = url.searchParams.get('q')?.trim() ?? '',
      page = Number(url.searchParams.get('page') ?? 1);
    if (
      query.length < 2 ||
      query.length > 120 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1000
    )
      throw new ServiceError('Enter a food name between 2 and 120 characters.');
    await rateLimit(request, env, 'food', 60);
    return json(await searchFoods(query, page, env));
  }
  if (/^\/api\/foods\/(?:fs|off):\d+$/.test(path) && method === 'GET') {
    await rateLimit(request, env, 'food', 60);
    return json(await foodDetail(path.split('/').at(-1)!, env));
  }
  if (path.startsWith('/api/')) throw new ServiceError('Endpoint not found.', 404);
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    // Keep the previous web origin usable while clients migrate to the custom domain.
    const accepted = [env.APP_ORIGIN, env.LEGACY_APP_ORIGIN, env.DEV_CLIENT_ORIGIN].filter(Boolean);
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') && origin && !accepted.includes(origin))
      return json({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...(origin && accepted.includes(origin)
            ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }
            : {}),
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Growth-Platform',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          Vary: 'Origin',
        },
      });
    let response: Response;
    try {
      if (request.method === 'POST' && !path.includes('/webhook/')) {
        if (!request.headers.get('Content-Type')?.includes('application/json'))
          throw new ServiceError('Expected a JSON request.');
        const maximumBodySize = path === '/api/account/journal' ? 2_000_000 : 16_384;
        if (Number(request.headers.get('Content-Length') ?? 0) > maximumBodySize)
          throw new ServiceError('Request too large.', 413);
      }
      response = await route(request, env);
    } catch (error) {
      const known = error instanceof ServiceError;
      response = json(
        {
          error: known
            ? error.message
            : 'The service is temporarily unavailable. Please try again.',
        },
        known ? error.status : 503,
        known && error.status === 429 ? { 'Retry-After': String(error.retryAfter) } : {},
      );
      if (!known)
        console.error('Growth request failed', {
          path: path.split('/').slice(0, 4).join('/'),
          category: error instanceof Error ? error.name : 'UnknownError',
        });
    }
    const headers = new Headers(response.headers);
    if (origin && accepted.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Vary', 'Origin');
    }
    if (path.startsWith('/api/account')) headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, { status: response.status, headers });
  },
  async queue(batch: MessageBatch<SyncJob>, env: Env) {
    for (const message of batch.messages) {
      try {
        await processJob(message.body, env);
        message.ack();
      } catch (error) {
        const retryAfter = error instanceof ServiceError ? error.retryAfter : 60;
        const reason =
          error instanceof ServiceError
            ? error.message
            : 'Activity sync was interrupted. It will retry automatically.';
        await env.DB.prepare(
          'UPDATE connections SET sync_error=? WHERE athlete_id=? AND generation=?',
        )
          .bind(reason, message.body.athleteId, message.body.generation)
          .run();
        if (error instanceof ServiceError && error.status === 401) message.ack();
        else message.retry({ delaySeconds: Math.min(43200, retryAfter) });
      }
    }
  },
  // Expire temporary records and reconcile history to catch missed activity edits or deletions.
  async scheduled(_event: ScheduledEvent, env: Env) {
    await env.DB.batch(
      [
        'sessions',
        'account_sessions',
        'account_challenges',
        'oauth_attempts',
        'native_exchanges',
        'food_cache',
        'rate_buckets',
      ].map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE expires_at < ?`).bind(now())),
    );
    await env.DB.prepare('DELETE FROM events WHERE processed=1 AND created_at < ?')
      .bind(now() - 7 * 86400)
      .run();
    const rows = await env.DB.prepare(
      "SELECT athlete_id FROM connections WHERE status='connected'",
    ).all<{ athlete_id: string }>();
    for (const row of rows.results) await requestSync(env, row.athlete_id);
  },
};
