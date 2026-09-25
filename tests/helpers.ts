import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import type { Env, SyncJob } from '../server/types';
import { encrypt, hash } from '../server/security';
import { now } from '../server/types';

export function environment() {
  const queries = { count: 0 };
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(new URL('../server/migrations/', import.meta.url)).sort())
    sqlite.exec(readFileSync(new URL(`../server/migrations/${file}`, import.meta.url), 'utf8'));
  const prepare = (sql: string) => {
    let values: any[] = [];
    const statement = {
      bind: (...args: any[]) => {
        values = args;
        return statement;
      },
      first: async (column?: string) => {
        queries.count++;
        const row = sqlite.query(sql).get(...values) as any;
        return column ? (row?.[column] ?? null) : (row ?? null);
      },
      all: async () => {
        queries.count++;
        return { results: sqlite.query(sql).all(...values), success: true };
      },
      run: async () => {
        queries.count++;
        const result = sqlite.query(sql).run(...values);
        return { success: true, meta: { changes: result.changes } };
      },
    };
    return statement;
  };
  const jobs: SyncJob[] = [];
  const env = {
    DB: {
      prepare,
      batch: async (statements: any[]) => Promise.all(statements.map((s) => s.run())),
    },
    ASSETS: { fetch: async () => new Response('asset') },
    SYNC_QUEUE: {
      send: async (job: SyncJob) => {
        jobs.push(job);
      },
    },
    APP_ORIGIN: 'http://localhost:8787',
    STRAVA_CLIENT_ID: '123',
    STRAVA_CLIENT_SECRET: 'test-secret',
    STRAVA_SUBSCRIPTION_ID: '1',
    STRAVA_VERIFY_TOKEN: 'verify-test',
    WEBHOOK_PATH_SECRET: 'secret-webhook-path',
    TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
    OPEN_FOOD_FACTS_USER_AGENT: 'Growth-tests/1.0 (https://example.invalid)',
  } as unknown as Env;
  return { env, jobs, sqlite, queries };
}
export async function accountSession(env: Env, accountId = 'account-1') {
  await env.DB.prepare(
    'INSERT OR IGNORE INTO accounts (id,email,password_hash,name,created_at) VALUES (?,?,?,?,?)',
  )
    .bind(accountId, `${accountId}@example.invalid`, 'test-hash', 'Test Account', now())
    .run();
  const token = `token-${accountId}`;
  await env.DB.prepare(
    'INSERT OR REPLACE INTO account_sessions (token_hash,account_id,expires_at,security_version) VALUES (?,?,?,0)',
  )
    .bind(await hash(token), accountId, now() + 3600)
    .run();
  return token;
}
export async function connection(
  env: Env,
  expires = now() + 3600,
  athleteId = '42',
  accountId = 'account-1',
) {
  await accountSession(env, accountId);
  await env.DB.prepare(
    'INSERT INTO connections (athlete_id,account_id,name,access_cipher,refresh_cipher,expires_at,scopes,generation,sync_before) VALUES (?,?,?,?,?,?,?,?,?)',
  )
    .bind(
      athleteId,
      accountId,
      'Test Runner',
      await encrypt('access', env),
      await encrypt('refresh', env),
      expires,
      'activity:read_all',
      'generation',
      now(),
    )
    .run();
}
export const activity = (id: number, sport_type = 'Run') => ({
  id,
  sport_type,
  name: `Run ${id}`,
  start_date: '2024-01-02T14:00:00Z',
  start_date_local: '2024-01-02T09:00:00Z',
  distance: 1609.344,
  moving_time: 600,
  elapsed_time: 660,
  total_elevation_gain: 10,
});
