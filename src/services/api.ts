import { fetch } from 'expo/fetch';
import { getSessionToken } from './session';
import { getAccountToken } from './account-session';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function apiOrigin() {
  return process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
}
// Worker requests use browser cookies or the native Growth session, never Strava tokens.
export async function api<T>(
  path: string,
  options: RequestInit = {},
  scope: 'strava' | 'account' = 'strava',
): Promise<T> {
  const base = apiOrigin();
  if (process.env.EXPO_OS !== 'web' && !base)
    throw new ApiError(
      'The online service has not been configured yet. Your local journal is ready to use.',
      503,
    );
  const token = await (scope === 'account' ? getAccountToken() : getSessionToken());
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(scope === 'account'
          ? { 'X-Growth-Platform': process.env.EXPO_OS === 'web' ? 'web' : 'native' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ApiError('Could not connect. Check your connection and try again.', 503);
  }
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(
      'The online service is not connected yet. Please try again when the service is available.',
      503,
    );
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new ApiError(data.error ?? 'The request could not be completed.', response.status);
  return data;
}
