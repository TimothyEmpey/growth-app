import { Buffer } from 'node:buffer';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { randomToken } from './security';

// Memory-hard password hashing. Parameters are stored in a versioned format so
// a future policy can rehash on sign-in without changing existing passwords.
function derive(password: string, salt: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function passwordHash(password: string): Promise<string> {
  const salt = randomToken();
  const key = Array.from(await derive(password, salt), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `scrypt-v1:${salt}:${key}`;
}
export async function passwordMatches(password: string, encoded: string): Promise<boolean> {
  const [version, salt, expected] = encoded.split(':');
  if (version !== 'scrypt-v1' || !salt || !expected || expected.length !== 128) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(expected, 'hex'));
}
