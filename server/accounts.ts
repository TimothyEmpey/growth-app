import {
  normalizeEmail,
  validatePassword,
  validateProfile,
  type Account,
} from '../src/domain/account';
import { migrateJournal } from '../src/domain/journal';
import type { Journal } from '../src/domain/types';
import { cookie, hash, randomToken, rateLimit, setCookie } from './security';
import { passwordHash, passwordMatches } from './passwords';
import { type Env, json, now, ServiceError } from './types';

type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  gender: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  security_version: number;
};
type Challenge = {
  id: string;
  account_id: string | null;
  purpose: 'register' | 'email' | 'reset';
  email: string;
  code_hash: string;
  old_code_hash: string | null;
  payload: string;
  security_version: number;
};
type JournalRow = { payload: string; revision: number; updated_at: string };
export const accountsConfigured = (env: Env) => !!(env.RESEND_API_KEY && env.EMAIL_FROM);
const publicAccount = (a: AccountRow): Account => ({
  id: a.id,
  email: a.email,
  name: a.name,
  gender: a.gender,
  age: a.age,
  heightCm: a.height_cm,
  weightKg: a.weight_kg,
});
const accountToken = (request: Request) =>
  request.headers.get('Authorization')?.replace(/^Bearer /, '') ||
  cookie(request, 'growth_account');
async function signedIn(request: Request, env: Env) {
  const token = accountToken(request);
  return token
    ? env.DB.prepare(
        'SELECT a.* FROM accounts a JOIN account_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>? AND s.security_version=a.security_version',
      )
        .bind(await hash(token), now())
        .first<AccountRow>()
    : null;
}
async function requireAccount(request: Request, env: Env) {
  const account = await signedIn(request, env);
  if (!account) throw new ServiceError('Sign in to your Growth account to continue.', 401);
  return account;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 16_384) throw new ServiceError('Request too large.', 413);
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new ServiceError('Enter valid account details.');
  }
}
async function journalBody(request: Request): Promise<{ journal: Journal; baseRevision: number }> {
  const text = await request.text();
  if (text.length > 2_000_000) throw new ServiceError('Journal is too large to sync.', 413);
  try {
    const input = JSON.parse(text) as { journal?: unknown; baseRevision?: unknown };
    if (!Number.isSafeInteger(input.baseRevision) || (input.baseRevision as number) < 0)
      throw new Error('Invalid revision.');
    return { journal: migrateJournal(input.journal), baseRevision: input.baseRevision as number };
  } catch (error) {
    throw new ServiceError(error instanceof Error ? error.message : 'Enter valid journal data.');
  }
}

async function syncedJournal(request: Request, env: Env, account: AccountRow) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT payload,revision,updated_at FROM account_journals WHERE account_id=?',
    )
      .bind(account.id)
      .first<JournalRow>();
    return json(
      row
        ? {
            journal: migrateJournal(JSON.parse(row.payload)),
            revision: row.revision,
            updatedAt: row.updated_at,
          }
        : { journal: null, revision: 0, updatedAt: null },
      200,
      { 'Cache-Control': 'no-store' },
    );
  }
  if (request.method !== 'POST') throw new ServiceError('Endpoint not found.', 404);
  await rateLimit(request, env, `journal:${account.id}`, 120);
  const { journal, baseRevision } = await journalBody(request);
  const payload = JSON.stringify(journal);
  const updatedAt = new Date().toISOString();
  if (baseRevision === 0) {
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO account_journals (account_id,payload,revision,updated_at) VALUES (?,?,1,?)',
    )
      .bind(account.id, payload, updatedAt)
      .run();
    if (result.meta.changes === 1) return json({ journal, revision: 1, updatedAt });
  } else {
    const result = await env.DB.prepare(
      'UPDATE account_journals SET payload=?,revision=revision+1,updated_at=? WHERE account_id=? AND revision=?',
    )
      .bind(payload, updatedAt, account.id, baseRevision)
      .run();
    if (result.meta.changes === 1) return json({ journal, revision: baseRevision + 1, updatedAt });
  }
  const latest = await env.DB.prepare(
    'SELECT payload,revision,updated_at FROM account_journals WHERE account_id=?',
  )
    .bind(account.id)
    .first<JournalRow>();
  return json(
    latest
      ? {
          journal: migrateJournal(JSON.parse(latest.payload)),
          revision: latest.revision,
          updatedAt: latest.updated_at,
        }
      : { journal: null, revision: 0, updatedAt: null },
    409,
  );
}
function validate<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new ServiceError(error instanceof Error ? error.message : 'Check your details.');
  }
}
async function checkPassword(account: AccountRow, password: unknown) {
  if (
    typeof password !== 'string' ||
    password.length > 128 ||
    !(await passwordMatches(password, account.password_hash))
  )
    throw new ServiceError('The current password is incorrect.', 403);
}
async function session(request: Request, env: Env, account: AccountRow) {
  const token = randomToken();
  await env.DB.prepare(
    'INSERT INTO account_sessions (token_hash,account_id,expires_at,security_version) VALUES (?,?,?,?)',
  )
    .bind(await hash(token), account.id, now() + 30 * 86400, account.security_version)
    .run();
  // Browsers receive only an HttpOnly cookie. Native callers request a secure-store token.
  return json(
    {
      account: publicAccount(account),
      ...(request.headers.get('X-Growth-Platform') === 'native' ? { token } : {}),
    },
    200,
    {
      'Set-Cookie': setCookie(env, 'growth_account', token, 30 * 86400),
      'Cache-Control': 'no-store',
    },
  );
}
async function sendCode(env: Env, email: string, code: string, subject: string, context: string) {
  if (!accountsConfigured(env))
    throw new ServiceError('Account email delivery has not been configured yet.', 503);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject,
      text: `${context}\n\nYour Growth verification code is ${code}.\n\nThis code expires in 10 minutes and can be used once. If you did not request this, do not share the code; you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new ServiceError('We could not send the verification email. Please try again.', 502);
}
function randomCode() {
  // Rejection sampling keeps six-digit codes uniformly distributed.
  let n: number;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= 4_294_000_000);
  return String(n % 1_000_000).padStart(6, '0');
}
async function issueChallenge(
  env: Env,
  purpose: Challenge['purpose'],
  email: string,
  account: AccountRow | null,
  payload = {},
) {
  if (!accountsConfigured(env))
    throw new ServiceError('Account email delivery has not been configured yet.', 503);
  const id = randomToken(),
    code = randomCode(),
    oldCode = purpose === 'email' ? randomCode() : null;
  await env.DB.prepare(
    'INSERT INTO account_challenges (id,account_id,purpose,email,code_hash,old_code_hash,payload,security_version,expires_at) VALUES (?,?,?,?,?,?,?,?,?)',
  )
    .bind(
      id,
      account?.id ?? null,
      purpose,
      email,
      await hash(`${id}:${code}`),
      oldCode ? await hash(`${id}:${oldCode}`) : null,
      JSON.stringify(payload),
      account?.security_version ?? 0,
      now() + 600,
    )
    .run();
  try {
    if (oldCode && account)
      await sendCode(
        env,
        account.email,
        oldCode,
        'Approve your Growth email change',
        `Confirm that you want to change your Growth email to ${email}. Enter this code in the Current email code field.`,
      );
    await sendCode(
      env,
      email,
      code,
      purpose === 'reset' ? 'Reset your Growth password' : 'Verify your Growth email',
      purpose === 'email'
        ? 'Enter this code in the New email code field to verify your new email address.'
        : purpose === 'reset'
          ? 'Enter this code in Growth to choose a new password.'
          : 'Enter this code in Growth to finish creating your account.',
    );
  } catch (error) {
    await env.DB.prepare('DELETE FROM account_challenges WHERE id=?').bind(id).run();
    throw error;
  }
  return json({ challengeId: id, expiresIn: 600 });
}
async function targetLimit(request: Request, env: Env, target: string) {
  await rateLimit(request, env, 'account', 12);
  // A second bucket protects a target even if requests arrive from different IPs.
  await rateLimit(new Request('https://local/'), env, `account-target:${await hash(target)}`, 6);
}
async function verify(request: Request, env: Env, input: Record<string, unknown>) {
  if (
    typeof input.challengeId !== 'string' ||
    input.challengeId.length !== 64 ||
    typeof input.code !== 'string' ||
    !/^\d{6}$/.test(input.code)
  )
    throw new ServiceError('Enter the six-digit verification code.');
  await targetLimit(request, env, input.challengeId);
  const row = await env.DB.prepare(
    'UPDATE account_challenges SET attempts=attempts+1 WHERE id=? AND used=0 AND attempts<5 AND expires_at>? RETURNING *',
  )
    .bind(input.challengeId, now())
    .first<Challenge>();
  if (!row)
    throw new ServiceError(
      'This code has expired or reached its attempt limit. Request a new code.',
    );
  if (
    row.code_hash !== (await hash(`${row.id}:${input.code}`)) ||
    (row.purpose === 'email' && row.old_code_hash !== (await hash(`${row.id}:${input.oldCode}`)))
  )
    throw new ServiceError('The verification code is incorrect. Check your email and try again.');
  let account = row.account_id
    ? await env.DB.prepare('SELECT * FROM accounts WHERE id=?')
        .bind(row.account_id)
        .first<AccountRow>()
    : null;
  if (row.purpose !== 'register' && (!account || account.security_version !== row.security_version))
    throw new ServiceError('Your account changed. Request a new verification code.');
  if (row.purpose === 'email' && (await requireAccount(request, env)).id !== row.account_id)
    throw new ServiceError('Sign in to the account that requested this change.', 403);
  const nextPassword =
    row.purpose === 'reset'
      ? await passwordHash(validate(() => validatePassword(input.password)))
      : null;
  // Claim once atomically; parallel submissions cannot reuse the same verified code.
  const claimed = await env.DB.prepare(
    'UPDATE account_challenges SET used=1 WHERE id=? AND used=0 AND expires_at>? RETURNING id',
  )
    .bind(row.id, now())
    .first();
  if (!claimed) throw new ServiceError('This verification code has already been used.');
  if (row.purpose === 'register') {
    const payload = JSON.parse(row.payload) as { name: string; password: string };
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        'INSERT INTO accounts (id,email,password_hash,name,created_at) VALUES (?,?,?,?,?)',
      )
        .bind(id, row.email, payload.password, payload.name, now())
        .run();
    } catch {
      throw new ServiceError(
        'An account already uses this email. Sign in or reset its password.',
        409,
      );
    }
    account = (await env.DB.prepare('SELECT * FROM accounts WHERE id=?')
      .bind(id)
      .first<AccountRow>())!;
  } else {
    const changed = await env.DB.prepare(
      row.purpose === 'email'
        ? 'UPDATE accounts SET email=?,security_version=security_version+1 WHERE id=? AND security_version=? RETURNING *'
        : 'UPDATE accounts SET password_hash=?,security_version=security_version+1 WHERE id=? AND security_version=? RETURNING *',
    )
      .bind(row.purpose === 'email' ? row.email : nextPassword, account!.id, row.security_version)
      .first<AccountRow>()
      .catch(() => {
        throw new ServiceError(
          'This email is already in use. Request a change to a different address.',
          409,
        );
      });
    if (!changed) throw new ServiceError('Your account changed. Please start again.');
    account = changed;
    await env.DB.batch([
      env.DB.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(account.id),
      env.DB.prepare('DELETE FROM account_challenges WHERE account_id=?').bind(account.id),
    ]);
  }
  return session(request, env, account!);
}
export async function accountRoute(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (request.method === 'GET' && path === '/api/account') {
    const account = await signedIn(request, env);
    return json(
      { account: account ? publicAccount(account) : null, configured: accountsConfigured(env) },
      200,
      { 'Cache-Control': 'no-store' },
    );
  }
  if (path === '/api/account/journal') {
    const account = await requireAccount(request, env);
    return syncedJournal(request, env, account);
  }
  if (request.method !== 'POST') throw new ServiceError('Endpoint not found.', 404);
  const input = await body(request);
  if (path === '/api/account/verify') return verify(request, env, input);
  if (['/api/account/register', '/api/account/login', '/api/account/reset'].includes(path)) {
    const email = validate(() => normalizeEmail(input.email));
    await targetLimit(request, env, email);
    const account = await env.DB.prepare('SELECT * FROM accounts WHERE email=?')
      .bind(email)
      .first<AccountRow>();
    if (path.endsWith('/login')) {
      const password =
        typeof input.password === 'string' && input.password.length <= 128 ? input.password : '';
      const valid = account
        ? await passwordMatches(password, account.password_hash)
        : (await passwordHash(password), false);
      if (!valid || !account) throw new ServiceError('The email or password is incorrect.', 401);
      return session(request, env, account);
    }
    if (!accountsConfigured(env))
      throw new ServiceError('Account email delivery has not been configured yet.', 503);
    if (path.endsWith('/reset'))
      return account
        ? issueChallenge(env, 'reset', email, account)
        : json({ challengeId: randomToken(), expiresIn: 600 });
    const profile = validate(() =>
      validateProfile({ name: input.name, gender: '', age: null, heightCm: null, weightKg: null }),
    );
    const password = await passwordHash(validate(() => validatePassword(input.password)));
    if (account) return json({ challengeId: randomToken(), expiresIn: 600 });
    return issueChallenge(env, 'register', email, null, { name: profile.name, password });
  }
  const account = await requireAccount(request, env);
  await targetLimit(request, env, account.id);
  if (path === '/api/account/cancel') {
    if (typeof input.challengeId !== 'string') throw new ServiceError('Choose a pending change.');
    await env.DB.prepare('UPDATE account_challenges SET used=1 WHERE id=? AND account_id=?')
      .bind(input.challengeId, account.id)
      .run();
    return json({ cancelled: true });
  }
  if (path === '/api/account/profile') {
    const p = validate(() => validateProfile(input));
    const updated = await env.DB.prepare(
      'UPDATE accounts SET name=?,gender=?,age=?,height_cm=?,weight_kg=? WHERE id=? RETURNING *',
    )
      .bind(p.name, p.gender, p.age, p.heightCm, p.weightKg, account.id)
      .first<AccountRow>();
    return json({ account: publicAccount(updated!) });
  }
  if (path === '/api/account/logout') {
    await env.DB.prepare('DELETE FROM account_sessions WHERE token_hash=?')
      .bind(await hash(accountToken(request)!))
      .run();
    return json({ signedOut: true }, 200, {
      'Set-Cookie': setCookie(env, 'growth_account', '', 0),
    });
  }
  if (path === '/api/account/email') {
    await checkPassword(account, input.password);
    const email = validate(() => normalizeEmail(input.email));
    if (email === account.email) throw new ServiceError('Enter a different email address.');
    if (await env.DB.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first())
      throw new ServiceError('This email cannot be used. Choose another address.', 409);
    return issueChallenge(env, 'email', email, account);
  }
  if (path === '/api/account/password') {
    await checkPassword(account, input.currentPassword);
    const encoded = await passwordHash(validate(() => validatePassword(input.password)));
    const updated = await env.DB.prepare(
      'UPDATE accounts SET password_hash=?,security_version=security_version+1 WHERE id=? AND security_version=? RETURNING *',
    )
      .bind(encoded, account.id, account.security_version)
      .first<AccountRow>();
    if (!updated) throw new ServiceError('Your account changed. Please sign in again.', 409);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(account.id),
      env.DB.prepare('DELETE FROM account_challenges WHERE account_id=?').bind(account.id),
    ]);
    return session(request, env, updated);
  }
  throw new ServiceError('Endpoint not found.', 404);
}
