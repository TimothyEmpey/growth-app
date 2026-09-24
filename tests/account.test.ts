import { afterEach, expect, test } from 'bun:test';
import worker from '../server/index';
import { accountSession, environment, connection } from './helpers';
import { now } from '../server/types';
import {
  activityStreak,
  displayWeight,
  distanceValue,
  normalizeEmail,
  normalizePreferences,
  validateProfile,
  weightToPounds,
} from '../src/domain/account';
import { emptyJournal, migrateJournal, pace } from '../src/domain/journal';
import { mergeJournals } from '../src/domain/journal-sync';
import { loadJournal, saveJournal } from '../src/data/storage.web';
import 'fake-indexeddb/auto';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
function setup() {
  const { env, sqlite } = environment();
  env.RESEND_API_KEY = 'test-email-key';
  env.EMAIL_FROM = 'Growth <growth@example.invalid>';
  const sent: { to: string[]; text: string; subject: string }[] = [];
  globalThis.fetch = (async (url: any, options: any) => {
    expect(String(url)).toBe('https://api.resend.com/emails');
    sent.push(JSON.parse(options.body));
    return Response.json({ id: 'test-message' });
  }) as typeof fetch;
  const call = async (
    path: string,
    body?: unknown,
    token?: string,
    headers: Record<string, string> = {},
  ) => {
    const response = await worker.fetch(
      new Request(`http://localhost:8787/api/account${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Growth-Platform': 'native',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    );
    return { response, data: (await response.json()) as any };
  };
  const code = (index = sent.length - 1) => sent[index].text.match(/code is (\d{6})/)![1];
  const register = async () => {
    const { data } = await call('/register', {
      name: 'Test Person',
      email: 'test@example.invalid',
      password: 'strong-passphrase-123',
    });
    return call('/verify', { challengeId: data.challengeId, code: code() });
  };
  return { env, sqlite, sent, call, code, register };
}

test('streaks combine meals and runs once per day, survive today, gaps, leap days and ignore future dates', () => {
  const result = activityStreak(
    ['2024-02-28', '2024-02-29', '2024-02-29'],
    ['2024-03-01', '2024-03-01', '2025-01-01'],
    '2024-03-02',
  );
  expect(result.current).toBe(3);
  expect(result.best).toBe(3);
  expect(result.todayComplete).toBe(false);
  expect(activityStreak(['2024-02-28'], ['2024-03-01'], '2024-03-03').current).toBe(0);
  expect(activityStreak([], [], '2024-03-02').current).toBe(0);
  expect(activityStreak(['2024-02-30'], [], '2024-03-02').best).toBe(0);
  expect(activityStreak(['2024-03-09', '2024-03-10'], ['2024-03-11'], '2024-03-11').current).toBe(
    3,
  );
});

test('profile validation, unit conversion and old journal migration preserve real measurements', async () => {
  const journal = emptyJournal();
  journal.weights.push({ id: 'measurement', date: '2024-01-02', pounds: 180.12345 });
  const legacy = { ...journal } as any;
  delete legacy.preferences;
  delete legacy.profile;
  expect(migrateJournal(legacy).preferences.units).toBe('us');
  journal.preferences = {
    appearance: 'system',
    units: 'metric',
    defaultPeriod: 'Week',
    startPage: '/account',
  };
  journal.profile = { name: 'Alex', gender: '', age: 30, heightCm: 180, weightKg: 80 };
  await saveJournal(journal);
  expect(await loadJournal()).toEqual(journal);
  expect(weightToPounds(81.6466266, 'metric')).toBeCloseTo(180, 8);
  expect(displayWeight(180, 'metric')).toBe(81.6);
  expect(distanceValue(5000, 'metric')).toBe(5);
  expect(pace(1500, 5000, 'metric')).toBe('5:00');
  expect(normalizeEmail(' TEST@Example.com ')).toBe('test@example.com');
  expect(() => validateProfile({ ...journal.profile, age: 21.5 })).toThrow();
  expect(() => validateProfile({ ...journal.profile, heightCm: NaN })).toThrow();
  expect(migrateJournal(legacy).weights[0].pounds).toBe(180.12345);
});

test('preserves every supported appearance theme', () => {
  for (const appearance of [
    'light',
    'dark',
    'system',
    'coffee',
    'aqua',
    'forest',
    'skinty',
  ] as const) {
    expect(normalizePreferences({ appearance }).appearance).toBe(appearance);
  }
});

test('registration requires email verification; sessions are HttpOnly and passwords are hashed', async () => {
  const { call, code, sqlite } = setup();
  const requested = await call('/register', {
    name: 'Test',
    email: 'TEST@example.invalid',
    password: 'strong-passphrase-123',
  });
  expect(requested.response.status).toBe(200);
  expect(sqlite.query('SELECT * FROM accounts').all()).toHaveLength(0);
  const confirmed = await call(
    '/verify',
    { challengeId: requested.data.challengeId, code: code() },
    undefined,
    { 'X-Growth-Platform': 'web' },
  );
  expect(confirmed.response.status).toBe(200);
  expect(confirmed.data.token).toBeUndefined();
  expect(confirmed.response.headers.get('Set-Cookie')).toContain('HttpOnly');
  expect(confirmed.response.headers.get('Cache-Control')).toBe('no-store');
  expect(confirmed.data.account.email).toBe('test@example.invalid');
  expect(JSON.stringify(confirmed.data)).not.toContain('password');
  const row = sqlite.query('SELECT password_hash FROM accounts').get() as any;
  expect(row.password_hash).toStartWith('scrypt-v1:');
  expect(row.password_hash).not.toContain('strong-passphrase');
  expect(
    (await call('/verify', { challengeId: requested.data.challengeId, code: code() })).response
      .status,
  ).toBe(400);
});

test('verification codes expire, cap attempts and do not leak through API responses', async () => {
  const { call, code, sqlite } = setup();
  const requested = await call('/register', {
    name: 'Test',
    email: 'test@example.invalid',
    password: 'strong-passphrase-123',
  });
  expect(JSON.stringify(requested.data)).not.toContain(code());
  for (let i = 0; i < 5; i++)
    expect(
      (
        await call('/verify', {
          challengeId: requested.data.challengeId,
          code: code() === '000000' ? '111111' : '000000',
        })
      ).response.status,
    ).toBe(400);
  expect(
    (await call('/verify', { challengeId: requested.data.challengeId, code: code() })).response
      .status,
  ).toBe(400);
  expect(sqlite.query('SELECT * FROM accounts').all()).toHaveLength(0);
  sqlite.exec('DELETE FROM rate_buckets');
  const next = await call('/register', {
    name: 'Test',
    email: 'other@example.invalid',
    password: 'strong-passphrase-123',
  });
  sqlite
    .query('UPDATE account_challenges SET expires_at=? WHERE id=?')
    .run(now() - 1, next.data.challengeId);
  expect(
    (await call('/verify', { challengeId: next.data.challengeId, code: code() })).response.status,
  ).toBe(400);
});

test('profile edits persist; anonymous writes and wrong current passwords are rejected', async () => {
  const { call, register } = setup();
  const signedIn = await register();
  const token = signedIn.data.token;
  const profile = {
    name: 'Updated Name',
    gender: 'Nonbinary',
    age: 32,
    heightCm: 174,
    weightKg: 70,
  };
  expect((await call('/profile', profile)).response.status).toBe(401);
  expect((await call('/profile', profile, token)).response.status).toBe(200);
  expect((await call('', undefined, token)).data.account).toMatchObject(profile);
  expect(
    (await call('/email', { email: 'next@example.invalid', password: 'wrong' }, token)).response
      .status,
  ).toBe(403);
});

test('account journals sync by revision and reject stale device writes', async () => {
  const { call, register } = setup();
  const signedIn = await register();
  const token = signedIn.data.token;
  expect((await call('/journal')).response.status).toBe(401);
  expect((await call('/journal', undefined, token)).data).toMatchObject({
    journal: null,
    revision: 0,
  });
  expect(
    (await call('/journal', { journal: emptyJournal(), baseRevision: 0 })).response.status,
  ).toBe(401);
  const fromDeviceA = emptyJournal();
  fromDeviceA.weights.push({ id: 'weight-a', date: '2025-01-01', pounds: 180 });
  const created = await call('/journal', { journal: fromDeviceA, baseRevision: 0 }, token);
  expect(created.response.status).toBe(200);
  expect(created.data.revision).toBe(1);
  expect((await call('/journal', undefined, token)).data.journal.weights).toEqual(
    fromDeviceA.weights,
  );

  const fromDeviceB = emptyJournal();
  fromDeviceB.meals.push({
    id: 'meal-b',
    date: '2025-01-02',
    meal: 'breakfast',
    food: {
      id: 'food',
      name: 'Oats',
      per100g: { calories: 1, protein: 1, carbs: 1, fat: 1 },
      portions: [],
    },
    portionId: 'portion',
    quantity: 1,
    nutrition: { calories: 1, protein: 1, carbs: 1, fat: 1 },
  });
  const stale = await call('/journal', { journal: fromDeviceB, baseRevision: 0 }, token);
  expect(stale.response.status).toBe(409);
  expect(stale.data.revision).toBe(1);

  const merged = mergeJournals(emptyJournal(), fromDeviceA, fromDeviceB);
  const updated = await call('/journal', { journal: merged, baseRevision: 1 }, token);
  expect(updated.data.revision).toBe(2);
  expect(updated.data.journal.weights).toHaveLength(1);
  expect(updated.data.journal.meals).toHaveLength(1);
});

test('three-way journal merge keeps independent edits and resolves same-field conflicts locally', () => {
  const base = emptyJournal();
  base.weights.push({ id: 'shared', date: '2025-01-01', pounds: 180 });
  const local = structuredClone(base);
  const remote = structuredClone(base);
  local.weights[0].pounds = 181;
  remote.goals.protein = 150;
  remote.weights.push({ id: 'remote', date: '2025-01-02', pounds: 179 });
  const merged = mergeJournals(base, local, remote);
  expect(merged.weights).toEqual([
    { id: 'shared', date: '2025-01-01', pounds: 181 },
    { id: 'remote', date: '2025-01-02', pounds: 179 },
  ]);
  expect(merged.goals.protein).toBe(150);
});

test('email changes require both inbox codes and invalidate older sessions', async () => {
  const { call, code, register } = setup();
  const signedIn = await register();
  const token = signedIn.data.token;
  const requested = await call(
    '/email',
    { email: 'new@example.invalid', password: 'strong-passphrase-123' },
    token,
  );
  const oldCode = code(1),
    newCode = code(2);
  expect((await call('', undefined, token)).data.account.email).toBe('test@example.invalid');
  expect(
    (
      await call(
        '/verify',
        { challengeId: requested.data.challengeId, code: newCode, oldCode: 'bad' },
        token,
      )
    ).response.status,
  ).toBe(400);
  const verified = await call(
    '/verify',
    { challengeId: requested.data.challengeId, code: newCode, oldCode },
    token,
  );
  expect(verified.response.status).toBe(200);
  expect(verified.data.account.email).toBe('new@example.invalid');
  expect((await call('', undefined, token)).data.account).toBeNull();
  expect((await call('', undefined, verified.data.token)).data.account.email).toBe(
    'new@example.invalid',
  );
});

test('password changes revoke other sessions and outstanding email changes', async () => {
  const { call, code, register } = setup();
  const signedIn = await register();
  const token = signedIn.data.token;
  const requested = await call(
    '/email',
    { email: 'new@example.invalid', password: 'strong-passphrase-123' },
    token,
  );
  const oldCode = code(1),
    newCode = code(2);
  const changed = await call(
    '/password',
    { currentPassword: 'strong-passphrase-123', password: 'a-different-password-456' },
    token,
  );
  expect(changed.response.status).toBe(200);
  expect((await call('', undefined, token)).data.account).toBeNull();
  expect(
    (
      await call(
        '/verify',
        { challengeId: requested.data.challengeId, code: newCode, oldCode },
        changed.data.token,
      )
    ).response.status,
  ).toBe(400);
  expect(
    (await call('/login', { email: 'test@example.invalid', password: 'strong-passphrase-123' }))
      .response.status,
  ).toBe(401);
  expect(
    (await call('/login', { email: 'test@example.invalid', password: 'a-different-password-456' }))
      .response.status,
  ).toBe(200);
});

test('password recovery uses a single-use code and logout removes access', async () => {
  const { call, code, register } = setup();
  const signedIn = await register();
  const reset = await call('/reset', { email: 'test@example.invalid' });
  const resetCode = code();
  const verified = await call('/verify', {
    challengeId: reset.data.challengeId,
    code: resetCode,
    password: 'recovered-password-123',
  });
  expect(verified.response.status).toBe(200);
  expect((await call('', undefined, signedIn.data.token)).data.account).toBeNull();
  expect((await call('/logout', {}, verified.data.token)).response.status).toBe(200);
  expect((await call('', undefined, verified.data.token)).data.account).toBeNull();
  expect(
    (
      await call('/verify', {
        challengeId: reset.data.challengeId,
        code: resetCode,
        password: 'attacker-password-123',
      })
    ).response.status,
  ).toBe(400);
});

test('account deletion requires confirmation and removes account, journal, sessions and Strava data', async () => {
  const { env, call, register, sqlite } = setup();
  const signedIn = await register();
  const token = signedIn.data.token;
  await call('/journal', { journal: emptyJournal(), baseRevision: 0 }, token);
  await connection(env, now() + 3600, '42', signedIn.data.account.id);
  await env.DB.prepare(
    'INSERT INTO runs (id,athlete_id,local_date,start_date,distance,moving_seconds,data,updated_at,seen_generation) VALUES (?,?,?,?,?,?,?,?,?)',
  )
    .bind('run-1', '42', '2025-01-01', '2025-01-01', 1000, 300, '{}', now(), 'generation')
    .run();

  expect(
    (await call('/delete', { password: 'strong-passphrase-123', confirmation: 'KEEP' }, token))
      .response.status,
  ).toBe(400);
  expect(
    (await call('/delete', { password: 'wrong', confirmation: 'DELETE' }, token)).response.status,
  ).toBe(403);

  let deauthorized = false;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    expect(String(url)).toBe('https://www.strava.com/oauth/deauthorize');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer access');
    deauthorized = true;
    return Response.json({});
  }) as typeof fetch;
  const deleted = await call(
    '/delete',
    { password: 'strong-passphrase-123', confirmation: 'DELETE' },
    token,
  );
  expect(deleted.response.status).toBe(200);
  expect(deleted.data.deleted).toBe(true);
  expect(deauthorized).toBe(true);
  for (const table of [
    'accounts',
    'account_sessions',
    'account_challenges',
    'account_journals',
    'connections',
    'runs',
    'sessions',
    'native_exchanges',
  ])
    expect(sqlite.query(`SELECT * FROM ${table}`).all(), table).toHaveLength(0);
  expect((await call('', undefined, token)).data.account).toBeNull();
});

test('email failure and missing provider configuration cannot silently complete verification', async () => {
  const { env, call, sqlite } = setup();
  globalThis.fetch = (async () =>
    Response.json({ error: 'provider unavailable' }, { status: 503 })) as typeof fetch;
  const signup = { name: 'Test', email: 'test@example.invalid', password: 'strong-passphrase-123' };
  expect((await call('/register', signup)).response.status).toBe(502);
  expect(sqlite.query('SELECT * FROM account_challenges').all()).toHaveLength(0);
  delete env.RESEND_API_KEY;
  expect((await call('/register', signup)).response.status).toBe(503);
  expect((await call('', undefined)).data.configured).toBe(false);
});

test('untrusted origins, oversized bodies, and attempts to send recovery codes to arbitrary addresses are rejected', async () => {
  const { call, sent } = setup();
  expect(
    (await call('/login', {}, undefined, { Origin: 'https://untrusted.invalid' })).response.status,
  ).toBe(403);
  expect((await call('/login', { email: 'a'.repeat(17_000) })).response.status).toBe(413);
  expect((await call('/reset', { email: 'unknown@example.invalid' })).response.status).toBe(200);
  expect(sent).toHaveLength(0);
});

test('streak endpoint reads distinct run dates across the entire history, not a single page', async () => {
  const { env } = setup();
  await connection(env);
  const token = await accountSession(env);
  for (let i = 1; i <= 40; i++)
    await env.DB.prepare(
      'INSERT INTO runs (id,athlete_id,local_date,start_date,distance,moving_seconds,data,updated_at,seen_generation) VALUES (?,?,?,?,?,?,?,?,?)',
    )
      .bind(
        String(i),
        '42',
        `2024-${i > 28 ? '02' : '01'}-${String(((i - 1) % 28) + 1).padStart(2, '0')}`,
        '2024-01-01',
        1000,
        300,
        '{}',
        now(),
        'test',
      )
      .run();
  const response = await worker.fetch(
    new Request('http://localhost:8787/api/run-days', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env,
  );
  expect(((await response.json()) as any).dates).toHaveLength(40);
});

test('parallel verification requests cannot create two sessions from one code', async () => {
  const { call, code, sqlite } = setup();
  const requested = await call('/register', {
    name: 'Test',
    email: 'test@example.invalid',
    password: 'strong-passphrase-123',
  });
  const data = { challengeId: requested.data.challengeId, code: code() };
  const responses = await Promise.all([call('/verify', data), call('/verify', data)]);
  expect(responses.map((result) => result.response.status).sort()).toEqual([200, 400]);
  expect(sqlite.query('SELECT * FROM accounts').all()).toHaveLength(1);
  expect(sqlite.query('SELECT * FROM account_sessions').all()).toHaveLength(1);
});

test('cancelling a pending email change invalidates its codes on the server', async () => {
  const { call, code, register } = setup();
  const signedIn = await register();
  const token = signedIn.data.token;
  const requested = await call(
    '/email',
    { email: 'cancelled@example.invalid', password: 'strong-passphrase-123' },
    token,
  );
  const oldCode = code(1),
    newCode = code(2);
  expect(
    (await call('/cancel', { challengeId: requested.data.challengeId }, token)).response.status,
  ).toBe(200);
  expect(
    (
      await call(
        '/verify',
        { challengeId: requested.data.challengeId, code: newCode, oldCode },
        token,
      )
    ).response.status,
  ).toBe(400);
  expect((await call('', undefined, token)).data.account.email).toBe('test@example.invalid');
});
