import { afterEach, describe, expect, test } from 'bun:test';
import worker from '../server/index';
import {
  accessToken,
  getConnection,
  normalizeRun,
  processJob,
  rateDelay,
  storeRun,
  stravaGet,
} from '../server/strava';
import { decrypt, encrypt, hash } from '../server/security';
import { now } from '../server/types';
import { accountSession, activity, connection, environment } from './helpers';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const request = (path: string, body?: unknown, cookie?: string) =>
  new Request(`http://localhost:8787${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
const mockTokens = () => {
  globalThis.fetch = (async () =>
    Response.json({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_at: now() + 21600,
      athlete: { id: 42, firstname: 'Test', lastname: 'Runner' },
      scope: 'activity:read,activity:read_all',
    })) as typeof fetch;
};

describe('OAuth and session security', () => {
  test('web state is browser-bound, single-use, and tied to a Growth account', async () => {
    const { env } = environment();
    const accountToken = await accountSession(env);
    mockTokens();
    const start = await worker.fetch(
      request('/api/strava/authorize', { platform: 'web' }, `growth_account=${accountToken}`),
      env,
    );
    const url = new URL((await start.json()).url);
    const state = url.searchParams.get('state');
    const callback = `/api/strava/callback?state=${state}&code=test&scope=activity:read_all`;
    expect(
      (await worker.fetch(request(callback, undefined, 'growth_oauth=wrong'), env)).status,
    ).toBe(400);
    const response = await worker.fetch(
      request(callback, undefined, `growth_oauth=${state}; growth_account=${accountToken}`),
      env,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('strava=connected');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(
      (await worker.fetch(request(callback, undefined, `growth_oauth=${state}`), env)).status,
    ).toBe(400);
  });
  test('cancellation creates no session and returns to the app', async () => {
    const { env, sqlite } = environment();
    const accountToken = await accountSession(env);
    const response = await worker.fetch(
      request('/api/strava/authorize', { platform: 'web' }, `growth_account=${accountToken}`),
      env,
    );
    const state = new URL((await response.json()).url).searchParams.get('state');
    const cancelled = await worker.fetch(
      request(
        `/api/strava/callback?state=${state}&error=access_denied`,
        undefined,
        `growth_oauth=${state}`,
      ),
      env,
    );
    expect(cancelled.headers.get('Location')).toContain('error=access_denied');
    expect(sqlite.query('SELECT * FROM sessions').all()).toHaveLength(0);
  });
  test('native callback contains only a one-time code bound to the initiating device', async () => {
    const { env } = environment();
    const accountToken = await accountSession(env);
    const otherAccountToken = await accountSession(env, 'other-account');
    mockTokens();
    const verifier = 'device-verifier';
    const response = await worker.fetch(
      request(
        '/api/strava/authorize',
        { platform: 'native', challenge: await hash(verifier) },
        `growth_account=${accountToken}`,
      ),
      env,
    );
    const state = new URL((await response.json()).url).searchParams.get('state');
    const result = await worker.fetch(
      request(`/api/strava/callback?state=${state}&code=provider-code`),
      env,
    );
    const callback = new URL(result.headers.get('Location')!);
    const code = callback.searchParams.get('code');
    expect(callback.protocol).toBe('growth:');
    expect(callback.searchParams.has('token')).toBe(false);
    expect(
      (
        await worker.fetch(
          request(
            '/api/strava/exchange',
            { code, verifier },
            `growth_account=${otherAccountToken}`,
          ),
          env,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await worker.fetch(
          request(
            '/api/strava/exchange',
            { code, verifier: 'wrong-device' },
            `growth_account=${accountToken}`,
          ),
          env,
        )
      ).status,
    ).toBe(401);
    const exchange = await worker.fetch(
      request('/api/strava/exchange', { code, verifier }, `growth_account=${accountToken}`),
      env,
    );
    expect(exchange.status).toBe(200);
    expect((await exchange.json()).connected).toBe(true);
    expect(
      (
        await worker.fetch(
          request('/api/strava/exchange', { code, verifier }, `growth_account=${accountToken}`),
          env,
        )
      ).status,
    ).toBe(401);
  });
  test('encrypted tokens round-trip and expired concurrent refresh calls cannot rotate twice', async () => {
    const { env } = environment();
    await connection(env, now() - 10);
    let calls = 0;
    const cipher = await encrypt('private-value', env);
    expect(cipher).not.toContain('private-value');
    expect(await decrypt(cipher, env)).toBe('private-value');
    globalThis.fetch = (async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return Response.json({
        access_token: 'rotated',
        refresh_token: 'rotated-refresh',
        expires_at: now() + 3600,
      });
    }) as typeof fetch;
    const results = await Promise.allSettled([accessToken(env, '42'), accessToken(env, '42')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(calls).toBe(1);
    expect(await accessToken(env, '42')).toBe('rotated');
    expect(await accessToken(env, '42', 'access')).toBe('rotated');
    expect(calls).toBe(1);
    expect(await decrypt((await getConnection(env, '42'))!.refresh_cipher, env)).toBe(
      'rotated-refresh',
    );
  });
  test('untrusted origins and missing sessions cannot access runs', async () => {
    const { env } = environment();
    expect((await worker.fetch(request('/api/runs'), env)).status).toBe(401);
    expect(
      (await worker.fetch(request('/api/strava/authorize', { platform: 'web' }), env)).status,
    ).toBe(401);
    const response = await worker.fetch(
      new Request('http://localhost:8787/api/strava/authorize', {
        method: 'POST',
        headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
        body: '{}',
      }),
      env,
    );
    expect(response.status).toBe(403);
  });
  test('Growth accounts see only their own linked Strava runs and logout keeps the link', async () => {
    const { env } = environment();
    await connection(env, now() + 3600, '42', 'account-a');
    await connection(env, now() + 3600, '84', 'account-b');
    await storeRun(env, '42', 'generation', normalizeRun(activity(1))!, false);
    await storeRun(env, '84', 'generation', normalizeRun(activity(2))!, false);
    const tokenA = await accountSession(env, 'account-a');
    const tokenB = await accountSession(env, 'account-b');
    const runsA = await worker.fetch(
      request('/api/runs', undefined, `growth_account=${tokenA}`),
      env,
    );
    const runsB = await worker.fetch(
      request('/api/runs', undefined, `growth_account=${tokenB}`),
      env,
    );
    expect((await runsA.json()).runs.map((run: { id: string }) => run.id)).toEqual(['1']);
    expect((await runsB.json()).runs.map((run: { id: string }) => run.id)).toEqual(['2']);
    await worker.fetch(request('/api/account/logout', {}, `growth_account=${tokenA}`), env);
    expect(await getConnection(env, '42')).not.toBeNull();
  });
  test('disconnect deauthorizes Strava and deletes its tokens, connection and imported runs', async () => {
    const { env, sqlite } = environment();
    const accountToken = await accountSession(env);
    await connection(env);
    await storeRun(env, '42', 'generation', normalizeRun(activity(8))!, false);
    await env.DB.prepare('INSERT INTO sessions (token_hash,athlete_id,expires_at) VALUES (?,?,?)')
      .bind('strava-session', '42', now() + 3600)
      .run();
    await env.DB.prepare(
      'INSERT INTO native_exchanges (code_hash,athlete_id,verifier_hash,expires_at,account_id) VALUES (?,?,?,?,?)',
    )
      .bind('exchange', '42', 'verifier', now() + 3600, 'account-1')
      .run();
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      expect(String(url)).toBe('https://www.strava.com/oauth/deauthorize');
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer access');
      return Response.json({});
    }) as typeof fetch;

    const response = await worker.fetch(
      request('/api/strava/disconnect', {}, `growth_account=${accountToken}`),
      env,
    );
    expect(response.status).toBe(200);
    for (const table of ['connections', 'runs', 'sessions', 'native_exchanges'])
      expect(sqlite.query(`SELECT * FROM ${table}`).all(), table).toHaveLength(0);
  });
});
describe('running synchronization', () => {
  test('imports multiple pages, filters sports, resumes and deduplicates deliveries', async () => {
    const { env, jobs, sqlite, queries } = environment();
    await connection(env);
    let calls = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls++;
      return Response.json(
        String(url).includes('page=1&')
          ? Array.from({ length: 25 }, (_, i) =>
              activity(i + 1, i === 0 ? 'Ride' : i % 2 ? 'TrailRun' : 'VirtualRun'),
            )
          : Array.from({ length: 15 }, (_, i) => activity(i + 26)),
      );
    }) as typeof fetch;
    const first = {
      kind: 'import' as const,
      athleteId: '42',
      generation: 'generation',
      page: 1,
      before: now(),
    };
    queries.count = 0;
    await processJob(first, env);
    expect(queries.count).toBeLessThanOrEqual(50);
    expect(sqlite.query('SELECT * FROM runs').all()).toHaveLength(24);
    expect(jobs).toHaveLength(1);
    expect((await getConnection(env, '42'))?.sync_complete).toBe(0);
    await processJob(first, env);
    expect(calls).toBe(1);
    await processJob(jobs[0], env);
    expect((await getConnection(env, '42'))?.sync_complete).toBe(1);
    const token = await accountSession(env);
    const page = await worker.fetch(
      request('/api/runs?start=2024-01-01&end=2024-01-31', undefined, `growth_account=${token}`),
      env,
    );
    const payload = await page.json();
    expect(payload.runs).toHaveLength(30);
    expect(payload.summary.count).toBe(39);
    expect(payload.nextCursor).toBeTruthy();
    const next = await worker.fetch(
      request(
        `/api/runs?start=2024-01-01&end=2024-01-31&cursor=${encodeURIComponent(payload.nextCursor)}`,
        undefined,
        `growth_account=${token}`,
      ),
      env,
    );
    expect((await next.json()).runs[0].id).not.toBe(payload.runs[0].id);
  });
  test('a refresh preserves queued updates and rejects imports from an earlier connection', async () => {
    const { env, jobs, sqlite } = environment();
    await connection(env);
    sqlite.exec('UPDATE connections SET sync_complete=1');
    const event = {
      owner_id: 42,
      subscription_id: 1,
      object_id: 8,
      object_type: 'activity',
      aspect_type: 'update',
      event_time: now(),
    };
    await worker.fetch(request('/api/strava/webhook/secret-webhook-path', event), env);
    const token = await accountSession(env);
    await worker.fetch(request('/api/strava/sync', {}, `growth_account=${token}`), env);
    globalThis.fetch = (async () =>
      Response.json({ ...activity(8), name: 'Updated run' })) as typeof fetch;
    await processJob(jobs[0], env);
    const stored = sqlite.query('SELECT data FROM runs WHERE id=?').get('8') as { data: string };
    expect(JSON.parse(stored.data).title).toBe('Updated run');
    sqlite.exec("UPDATE connections SET generation='reconnected'");
    await storeRun(env, '42', 'generation', normalizeRun(activity(9))!, false, now());
    await processJob(jobs[1], env);
    expect(sqlite.query('SELECT * FROM runs').all()).toHaveLength(1);
    expect((await getConnection(env, '42'))?.sync_complete).toBe(0);
  });
  test('a provider 401 rotates the token once and a revoked token requests reconnection', async () => {
    const { env } = environment();
    await connection(env);
    let requests = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      if (String(url).includes('/oauth/token'))
        return Response.json({
          access_token: 'fresh',
          refresh_token: 'fresh-refresh',
          expires_at: now() + 3600,
        });
      requests++;
      return requests === 1 ? new Response('', { status: 401 }) : Response.json(activity(1));
    }) as typeof fetch;
    expect((await stravaGet<{ id: number }>('activities/1', env, '42')).id).toBe(1);
    expect(requests).toBe(2);
    globalThis.fetch = (async () => new Response('', { status: 401 })) as typeof fetch;
    await expect(stravaGet('activities/1', env, '42')).rejects.toThrow('expired');
    expect((await getConnection(env, '42'))?.status).toBe('reconnect');
  });
  test('webhook verification, deletion and deauthorization clean cached data', async () => {
    const { env, jobs, sqlite } = environment();
    await connection(env);
    await storeRun(env, '42', 'generation', normalizeRun(activity(8))!, false);
    const verify = await worker.fetch(
      request(
        '/api/strava/webhook/secret-webhook-path?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=hello',
      ),
      env,
    );
    expect((await verify.json())['hub.challenge']).toBe('hello');
    expect(
      (await worker.fetch(request('/api/strava/webhook/wrong', { owner_id: 42 }), env)).status,
    ).toBe(404);
    const event = {
      owner_id: 42,
      subscription_id: 1,
      object_id: 8,
      object_type: 'activity',
      aspect_type: 'delete',
      event_time: now(),
    };
    expect(
      (await worker.fetch(request('/api/strava/webhook/secret-webhook-path', event), env)).status,
    ).toBe(200);
    globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;
    await processJob(jobs[0], env);
    await processJob(jobs[0], env);
    expect(sqlite.query('SELECT * FROM runs').all()).toHaveLength(0);
    await worker.fetch(
      request('/api/strava/webhook/secret-webhook-path', {
        ...event,
        object_id: 42,
        object_type: 'athlete',
        aspect_type: 'update',
        updates: { authorized: 'false' },
      }),
      env,
    );
    await processJob(jobs[1], env);
    expect(await getConnection(env, '42')).toBeNull();
  });
  test('rate limits schedule a retry without skipping an import page', async () => {
    const { env } = environment();
    await connection(env);
    const delays: number[] = [];
    globalThis.fetch = (async () =>
      new Response('', { status: 429, headers: { 'Retry-After': '300' } })) as typeof fetch;
    const message = {
      body: { kind: 'import', athleteId: '42', generation: 'generation', page: 1, before: now() },
      ack: () => {
        throw new Error('Must not acknowledge');
      },
      retry: ({ delaySeconds }: { delaySeconds: number }) => delays.push(delaySeconds),
    };
    await worker.queue({ messages: [message] } as any, env);
    expect(delays).toEqual([300]);
    expect((await getConnection(env, '42'))?.sync_cursor).toBe(1);
    expect(
      rateDelay(
        new Response('', {
          headers: { 'X-ReadRateLimit-Usage': '1,2000', 'X-ReadRateLimit-Limit': '200,2000' },
        }),
      ),
    ).toBeGreaterThan(0);
  });
});
