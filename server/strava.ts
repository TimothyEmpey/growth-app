import type { Run } from '../src/domain/types';
import { decrypt, encrypt } from './security';
import { type ConnectionRow, type Env, now, ServiceError, type SyncJob } from './types';

export interface StravaActivity {
  id: number;
  name: string;
  start_date: string;
  start_date_local: string;
  sport_type?: string;
  type?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  splits_metric?: { distance: number; moving_time: number; elevation_difference: number }[];
  splits_standard?: { distance: number; moving_time: number; elevation_difference: number }[];
}
export function normalizeRun(activity: StravaActivity): Run | null {
  const sport = activity.sport_type ?? activity.type ?? '';
  if (!['Run', 'TrailRun', 'VirtualRun'].includes(sport)) return null;
  return {
    id: String(activity.id),
    title: activity.name,
    date: activity.start_date,
    localDate: activity.start_date_local.slice(0, 10),
    sport,
    distanceMeters: activity.distance,
    movingSeconds: activity.moving_time,
    elapsedSeconds: activity.elapsed_time,
    elevationMeters: activity.total_elevation_gain,
    averageHeartRate: activity.average_heartrate ?? null,
    metricSplits: (activity.splits_metric ?? []).map((s) => ({
      distanceMeters: s.distance,
      movingSeconds: s.moving_time,
      elevationDifference: s.elevation_difference,
    })),
    ...(activity.splits_standard
      ? {
          splits: activity.splits_standard.map((s) => ({
            distanceMeters: s.distance,
            movingSeconds: s.moving_time,
            elevationDifference: s.elevation_difference,
          })),
        }
      : {}),
  };
}
export const getConnection = (env: Env, athleteId: string) =>
  env.DB.prepare('SELECT * FROM connections WHERE athlete_id = ?')
    .bind(athleteId)
    .first<ConnectionRow>();
export function rateDelay(response: Response): number {
  const pairs = [
    ['X-ReadRateLimit-Usage', 'X-ReadRateLimit-Limit'],
    ['X-RateLimit-Usage', 'X-RateLimit-Limit'],
  ];
  const dailyExceeded = pairs.some(([usage, limit]) => {
    const used = response.headers.get(usage)?.split(',').map(Number);
    const max = response.headers.get(limit)?.split(',').map(Number);
    return used && max && used[1] >= max[1];
  });
  const window = dailyExceeded ? 86400 : 900;
  return Math.max(
    1,
    Math.min(43200, Number(response.headers.get('Retry-After')) || window - (now() % window) + 5),
  );
}
export async function tokenRequest(env: Env, values: Record<string, string>) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID!,
      client_secret: env.STRAVA_CLIENT_SECRET!,
      ...values,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 429)
    throw new ServiceError(
      'Strava is busy. Your sync will resume automatically after its request limit resets.',
      429,
      rateDelay(response),
    );
  if (response.status >= 500) throw new ServiceError('Strava is temporarily unavailable.', 502);
  if (!response.ok)
    throw new ServiceError('Your Strava connection has expired. Please reconnect.', 401);
  return (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    scope?: string;
    athlete?: { id: number; firstname: string; lastname: string };
  };
}
export async function accessToken(
  env: Env,
  athleteId: string,
  rejectedToken?: string,
): Promise<string> {
  const connection = await getConnection(env, athleteId);
  if (!connection || connection.status !== 'connected')
    throw new ServiceError('Reconnect your Strava account to continue.', 401);
  if (connection.expires_at > now() + 60) {
    const token = await decrypt(connection.access_cipher, env);
    if (!rejectedToken || token !== rejectedToken) return token;
  }
  // A database lease serializes rotating refresh tokens across Worker invocations.
  const lease = now() + 30;
  const lock = await env.DB.prepare(
    'UPDATE connections SET refresh_lock_until = ? WHERE athlete_id = ? AND generation = ? AND refresh_lock_until < ? RETURNING athlete_id',
  )
    .bind(lease, athleteId, connection.generation, now())
    .first();
  if (!lock)
    throw new ServiceError(
      'Your Strava connection is refreshing. Please try again shortly.',
      503,
      5,
    );
  try {
    const current = await getConnection(env, athleteId);
    if (!current || current.generation !== connection.generation || current.status !== 'connected')
      throw new ServiceError('The Strava connection changed. Please try again.', 503, 5);
    if (current.expires_at > now() + 60) {
      const token = await decrypt(current.access_cipher, env);
      if (!rejectedToken || token !== rejectedToken) return token;
    }
    const tokens = await tokenRequest(env, {
      grant_type: 'refresh_token',
      refresh_token: await decrypt(current.refresh_cipher, env),
    });
    await env.DB.prepare(
      'UPDATE connections SET access_cipher = ?, refresh_cipher = ?, expires_at = ? WHERE athlete_id = ? AND generation = ?',
    )
      .bind(
        await encrypt(tokens.access_token, env),
        await encrypt(tokens.refresh_token, env),
        tokens.expires_at,
        athleteId,
        current.generation,
      )
      .run();
    return tokens.access_token;
  } catch (error) {
    if (error instanceof ServiceError && error.status === 401)
      await env.DB.prepare(
        "UPDATE connections SET status='reconnect', sync_error=? WHERE athlete_id=? AND generation=?",
      )
        .bind(error.message, athleteId, connection.generation)
        .run();
    throw error;
  } finally {
    await env.DB.prepare(
      'UPDATE connections SET refresh_lock_until = 0 WHERE athlete_id = ? AND generation = ? AND refresh_lock_until = ?',
    )
      .bind(athleteId, connection.generation, lease)
      .run();
  }
}
export async function stravaGet<T>(path: string, env: Env, athleteId: string): Promise<T> {
  let token = await accessToken(env, athleteId);
  const request = (token: string) =>
    fetch(`https://www.strava.com/api/v3/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
  let response = await request(token);
  if (response.status === 401) {
    token = await accessToken(env, athleteId, token);
    response = await request(token);
  }
  if (response.status === 429)
    throw new ServiceError(
      'Strava’s request limit was reached. Sync will resume automatically.',
      429,
      rateDelay(response),
    );
  if (response.status === 404)
    throw new ServiceError('This run is no longer available in Strava.', 404);
  if (response.status === 401 || response.status === 403) {
    await env.DB.prepare(
      "UPDATE connections SET status='reconnect', sync_error='Please reconnect Strava to restore access.' WHERE athlete_id=?",
    )
      .bind(athleteId)
      .run();
    throw new ServiceError('Please reconnect Strava to restore access.', 401);
  }
  if (!response.ok)
    throw new ServiceError('Strava is temporarily unavailable. Please try again.', 502);
  return response.json() as Promise<T>;
}
export async function storeRun(
  env: Env,
  athleteId: string,
  generation: string,
  run: Run,
  detailed: boolean,
  importedBefore?: number,
) {
  // seen_generation stores the import cutoff, distinct from the OAuth connection generation.
  const seenBefore = importedBefore ?? (await getConnection(env, athleteId))?.sync_before;
  if (seenBefore === undefined) return;
  // The connection generation prevents an old import from writing after disconnect/reconnect.
  await env.DB.prepare(
    `INSERT INTO runs (id, athlete_id, local_date, start_date, distance, moving_seconds, data, detailed, updated_at, seen_generation)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM connections WHERE athlete_id = ? AND generation = ? AND sync_before = ?)
    ON CONFLICT(athlete_id, id) DO UPDATE SET local_date=excluded.local_date, start_date=excluded.start_date, distance=excluded.distance,
    moving_seconds=excluded.moving_seconds, data=excluded.data, detailed=excluded.detailed, updated_at=excluded.updated_at, seen_generation=excluded.seen_generation`,
  )
    .bind(
      run.id,
      athleteId,
      run.localDate,
      run.date,
      run.distanceMeters,
      run.movingSeconds,
      JSON.stringify(run),
      detailed ? 1 : 0,
      now(),
      String(seenBefore),
      athleteId,
      generation,
      seenBefore,
    )
    .run();
}
export async function removeConnection(env: Env, athleteId: string) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM native_exchanges WHERE athlete_id=?').bind(athleteId),
    env.DB.prepare('DELETE FROM sessions WHERE athlete_id=?').bind(athleteId),
    env.DB.prepare('DELETE FROM runs WHERE athlete_id=?').bind(athleteId),
    env.DB.prepare('DELETE FROM connections WHERE athlete_id=?').bind(athleteId),
  ]);
}
// Each delivery handles one import page or one webhook; persisted progress makes retries safe.
export async function processJob(job: SyncJob, env: Env) {
  const connection = await getConnection(env, job.athleteId);
  if (!connection || connection.generation !== job.generation || connection.status !== 'connected')
    return;
  if (job.kind === 'import') {
    if (
      connection.sync_complete ||
      job.page < connection.sync_cursor ||
      job.before !== connection.sync_before
    )
      return;
    const activities = await stravaGet<StravaActivity[]>(
      // Keep each invocation below D1's free-tier limit of 50 queries, including token refresh.
      `athlete/activities?per_page=25&page=${job.page}&before=${job.before}`,
      env,
      job.athleteId,
    );
    for (const activity of activities) {
      const run = normalizeRun(activity);
      if (run) await storeRun(env, job.athleteId, job.generation, run, false, job.before);
    }
    if (activities.length === 25) {
      // Enqueue before advancing: duplicate page delivery is safe, a lost next page is not.
      await env.SYNC_QUEUE.send({ ...job, page: job.page + 1 });
      await env.DB.prepare(
        'UPDATE connections SET sync_cursor=?, sync_error=NULL WHERE athlete_id=? AND generation=? AND sync_before=?',
      )
        .bind(job.page + 1, job.athleteId, job.generation, job.before)
        .run();
    } else {
      // Only the final page removes unseen runs older than this import's cutoff.
      await env.DB.batch([
        env.DB.prepare(
          'DELETE FROM runs WHERE athlete_id=? AND seen_generation != ? AND start_date < ? AND EXISTS (SELECT 1 FROM connections WHERE athlete_id=? AND generation=? AND sync_before=?)',
        ).bind(
          job.athleteId,
          String(job.before),
          new Date(job.before * 1000).toISOString(),
          job.athleteId,
          job.generation,
          job.before,
        ),
        env.DB.prepare(
          'UPDATE connections SET sync_complete=1, last_sync=?, sync_error=NULL WHERE athlete_id=? AND generation=? AND sync_before=?',
        ).bind(new Date().toISOString(), job.athleteId, job.generation, job.before),
      ]);
    }
  } else {
    if (job.eventTime < connection.linked_at) return;
    const prior = await env.DB.prepare('SELECT processed FROM events WHERE event_key=?')
      .bind(job.eventKey)
      .first<{ processed: number }>();
    if (prior?.processed) return;
    if (job.objectType === 'athlete' && job.authorized === 'false') {
      await removeConnection(env, job.athleteId);
    } else if (job.objectType === 'activity') {
      // Re-fetch even for delete events so delayed/replayed events cannot remove a current activity.
      try {
        const run = normalizeRun(
          await stravaGet<StravaActivity>(`activities/${job.objectId}`, env, job.athleteId),
        );
        if (run) await storeRun(env, job.athleteId, job.generation, run, true);
        else
          await env.DB.prepare('DELETE FROM runs WHERE athlete_id=? AND id=?')
            .bind(job.athleteId, job.objectId)
            .run();
      } catch (error) {
        if (error instanceof ServiceError && error.status === 404)
          await env.DB.prepare('DELETE FROM runs WHERE athlete_id=? AND id=?')
            .bind(job.athleteId, job.objectId)
            .run();
        else throw error;
      }
      await env.DB.prepare(
        'UPDATE connections SET last_sync=?, sync_error=NULL WHERE athlete_id=? AND generation=?',
      )
        .bind(new Date().toISOString(), job.athleteId, job.generation)
        .run();
    }
    await env.DB.prepare('UPDATE events SET processed=1 WHERE event_key=?')
      .bind(job.eventKey)
      .run();
  }
}
