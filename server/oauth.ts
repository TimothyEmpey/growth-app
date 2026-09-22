import { requireAccountId } from './accounts';
import { cookie, encrypt, hash, randomToken, setCookie } from './security';
import { getAccountConnection, getConnection, tokenRequest } from './strava';
import { configured, type Env, json, now, ServiceError } from './types';

// Strava token exchange runs here; callbacks return a web session cookie or a native exchange code.
export async function authorize(request: Request, env: Env) {
  if (!configured(env))
    throw new ServiceError('Strava credentials have not been configured yet.', 503);
  const accountId = await requireAccountId(request, env);
  const body = (await request.json()) as { platform?: string; challenge?: string };
  if (!['web', 'native'].includes(body.platform ?? ''))
    throw new ServiceError('Invalid connection platform.');
  if (body.platform === 'native' && !/^[a-f0-9]{64}$/.test(body.challenge ?? ''))
    throw new ServiceError('Invalid device verification challenge.');
  const state = randomToken();
  await env.DB.prepare(
    'INSERT INTO oauth_attempts (state_hash, platform, verifier_hash, expires_at, account_id) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(await hash(state), body.platform!, body.challenge ?? null, now() + 600, accountId)
    .run();
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID!,
    redirect_uri: `${env.APP_ORIGIN}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'force',
    scope: 'activity:read,activity:read_all',
    state,
  }).toString();
  return json(
    { url: url.toString() },
    200,
    body.platform === 'web' ? { 'Set-Cookie': setCookie(env, 'growth_oauth', state, 600) } : {},
  );
}
export async function oauthCallback(request: Request, env: Env) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  if (!state) throw new ServiceError('Missing authorization state. Start the connection again.');
  const stateHash = await hash(state);
  const attempt = await env.DB.prepare(
    'SELECT * FROM oauth_attempts WHERE state_hash=? AND expires_at > ?',
  )
    .bind(stateHash, now())
    .first<{ platform: string; verifier_hash: string | null; account_id: string }>();
  if (!attempt || (attempt.platform === 'web' && cookie(request, 'growth_oauth') !== state))
    throw new ServiceError(
      'This connection request expired or could not be verified. Please start again.',
    );
  // Atomically consume validated state so a callback cannot be processed twice.
  const consumed = await env.DB.prepare(
    'DELETE FROM oauth_attempts WHERE state_hash=? RETURNING state_hash',
  )
    .bind(stateHash)
    .first();
  if (!consumed) throw new ServiceError('This connection request was already used.');
  const finish = (values: Record<string, string>) => {
    const destination = new URL(
      attempt.platform === 'native' ? 'growth://auth/strava' : `${env.APP_ORIGIN}/running`,
    );
    destination.search = new URLSearchParams(values).toString();
    const headers = new Headers({
      Location: destination.toString(),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    if (attempt.platform === 'web') {
      headers.append('Set-Cookie', setCookie(env, 'growth_oauth', '', 0));
    }
    return new Response(null, { status: 302, headers });
  };
  if (url.searchParams.has('error')) return finish({ error: 'access_denied' });
  const code = url.searchParams.get('code');
  if (!code) return finish({ error: 'missing_code' });
  try {
    const tokens = await tokenRequest(env, { grant_type: 'authorization_code', code });
    const athlete = tokens.athlete;
    if (!athlete) return finish({ error: 'Strava did not return an athlete account.' });
    const scopes = tokens.scope ?? url.searchParams.get('scope') ?? '';
    if (!scopes.split(/[ ,]+/).includes('activity:read_all'))
      return finish({ error: 'Allow access to all activities to include your private runs.' });
    const athleteId = String(athlete.id),
      generation = randomToken(),
      before = now();
    const athleteConnection = await getConnection(env, athleteId);
    if (athleteConnection && athleteConnection.account_id !== attempt.account_id)
      return finish({ error: 'This Strava account is already linked to another Growth account.' });
    const accountConnection = await getAccountConnection(env, attempt.account_id);
    if (accountConnection && accountConnection.athlete_id !== athleteId)
      return finish({
        error: 'Disconnect your current Strava account before linking another one.',
      });
    await env.DB.prepare(
      `INSERT INTO connections (athlete_id,account_id,name,access_cipher,refresh_cipher,expires_at,scopes,generation,sync_before,linked_at)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(athlete_id) DO UPDATE SET account_id=excluded.account_id, name=excluded.name, access_cipher=excluded.access_cipher,
      refresh_cipher=excluded.refresh_cipher, expires_at=excluded.expires_at, scopes=excluded.scopes, generation=excluded.generation,
      sync_before=excluded.sync_before, linked_at=excluded.linked_at, sync_complete=0, sync_cursor=1, status='connected', refresh_lock_until=0, sync_error=NULL`,
    )
      .bind(
        athleteId,
        attempt.account_id,
        `${athlete.firstname ?? ''} ${athlete.lastname ?? ''}`.trim(),
        await encrypt(tokens.access_token, env),
        await encrypt(tokens.refresh_token, env),
        tokens.expires_at,
        scopes,
        generation,
        before,
        before,
      )
      .run();
    try {
      await env.SYNC_QUEUE.send({ kind: 'import', athleteId, generation, page: 1, before });
    } catch {
      await env.DB.prepare('UPDATE connections SET sync_error=? WHERE athlete_id=?')
        .bind('Your connection is ready. Tap Refresh runs to start the import.', athleteId)
        .run();
    }
    if (attempt.platform === 'native') {
      const exchange = randomToken();
      await env.DB.prepare(
        'INSERT INTO native_exchanges (code_hash,athlete_id,verifier_hash,expires_at,account_id) VALUES (?,?,?,?,?)',
      )
        .bind(
          await hash(exchange),
          athleteId,
          attempt.verifier_hash!,
          now() + 120,
          attempt.account_id,
        )
        .run();
      return finish({ code: exchange });
    }
    return finish({ strava: 'connected' });
  } catch (error) {
    return finish({
      error:
        error instanceof ServiceError
          ? error.message
          : 'Strava could not be connected. Please try again.',
    });
  }
}
export async function nativeExchange(request: Request, env: Env) {
  const accountId = await requireAccountId(request, env);
  const { code, verifier } = (await request.json()) as { code?: string; verifier?: string };
  if (!code || !verifier || verifier.length > 200)
    throw new ServiceError('Invalid connection exchange.');
  // Redemption requires the initiating device's verifier and consumes the code in the same query.
  const row = await env.DB.prepare(
    'DELETE FROM native_exchanges WHERE code_hash=? AND verifier_hash=? AND account_id=? AND expires_at > ? RETURNING athlete_id',
  )
    .bind(await hash(code), await hash(verifier), accountId, now())
    .first<{ athlete_id: string }>();
  const connection = row ? await getConnection(env, row.athlete_id) : null;
  if (!connection || connection.account_id !== accountId)
    throw new ServiceError('This connection request expired or was already used.', 401);
  return json({ connected: true });
}
