import { api } from './api';
export async function linkStrava(): Promise<void> {
  const { url } = await api<{ url: string }>('/api/strava/authorize', {
    method: 'POST',
    body: JSON.stringify({ platform: 'web' }),
  });
  window.location.assign(url);
}
export async function finishStrava(_code: string): Promise<void> {}
