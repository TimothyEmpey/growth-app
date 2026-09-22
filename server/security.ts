import { type Env, now, ServiceError } from './types';

// Encrypt recoverable provider tokens for API calls; store only hashes of Growth session tokens.
const encoder = new TextEncoder();
export const randomToken = () =>
  [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
export async function hash(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
async function encryptionKey(env: Env) {
  if (!env.TOKEN_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY))
    throw new ServiceError('The connection service encryption key is not configured.', 503);
  const bytes = Uint8Array.from(env.TOKEN_ENCRYPTION_KEY.match(/.{2}/g)!, (b) => parseInt(b, 16));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encrypt(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(env),
    encoder.encode(value),
  );
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(data)))}`;
}
export async function decrypt(value: string, env: Env): Promise<string> {
  const [iv, data] = value.split('.');
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)) },
      await encryptionKey(env),
      Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
    ),
  );
}
export function cookie(request: Request, name: string) {
  return request.headers
    .get('Cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='))
    ?.slice(name.length + 1);
}
export function setCookie(env: Env, name: string, value: string, seconds: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${env.APP_ORIGIN.startsWith('https:') ? '; Secure' : ''}`;
}
export async function rateLimit(request: Request, env: Env, category: string, limit: number) {
  const bucket = `${category}:${await hash(request.headers.get('CF-Connecting-IP') ?? 'local')}:${Math.floor(now() / 60)}`;
  const row = await env.DB.prepare(
    'INSERT INTO rate_buckets (bucket, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(bucket, now() + 120)
    .first<{ count: number }>();
  if (row && row.count > limit)
    throw new ServiceError('Too many requests. Please try again in a minute.', 429, 60);
}
