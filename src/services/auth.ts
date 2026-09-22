import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';
import { clearVerifier, getVerifier, setVerifier } from './session';

// The browser result and deep-link route can receive the same single-use exchange code.
const exchanges = new Map<string, Promise<void>>();
export function finishStrava(code: string): Promise<void> {
  const existing = exchanges.get(code);
  if (existing) return existing;
  const exchange = (async () => {
    const verifier = await getVerifier();
    if (!verifier) throw new Error('This connection request expired. Please link Strava again.');
    await api<{ connected: true }>('/api/strava/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, verifier }),
    });
    await clearVerifier();
  })();
  exchanges.set(code, exchange);
  return exchange;
}
export async function linkStrava(): Promise<void> {
  // Keep the verifier on this device; the server receives only its hash until session exchange.
  const verifier = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  await setVerifier(verifier);
  const { url } = await api<{ url: string }>('/api/strava/authorize', {
    method: 'POST',
    body: JSON.stringify({ platform: 'native', challenge }),
  });
  const result = await WebBrowser.openAuthSessionAsync(url, 'growth://auth/strava');
  if (result.type !== 'success') {
    await clearVerifier();
    throw new Error('Connection cancelled. You can link Strava whenever you’re ready.');
  }
  const callback = new URL(result.url);
  if (callback.searchParams.get('error')) throw new Error(callback.searchParams.get('error')!);
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('Strava did not complete the connection. Please try again.');
  await finishStrava(code);
}
