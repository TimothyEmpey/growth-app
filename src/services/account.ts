import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@/domain/account';
import { api } from './api';
import { clearAccountToken, setAccountToken } from './account-session';

type AccountStatus = { account: Account | null; configured: boolean };
type AccountResponse = { account: Account; token?: string };
export type Verification = { challengeId: string; expiresIn: number };
export const accountRequest = <T>(path: string, data: unknown) =>
  api<T>(`/api/account/${path}`, { method: 'POST', body: JSON.stringify(data) }, 'account');
export function useAccount() {
  return useQuery({
    queryKey: ['account'],
    queryFn: ({ signal }) => api<AccountStatus>('/api/account', { signal }, 'account'),
    retry: false,
  });
}
export function useAccountActions() {
  const client = useQueryClient();
  return {
    complete: async (path: string, data: unknown) => {
      const result = await accountRequest<AccountResponse>(path, data);
      if (result.token) await setAccountToken(result.token);
      await client.cancelQueries({ queryKey: ['account'] });
      client.setQueryData<AccountStatus>(['account'], (previous) => ({
        configured: previous?.configured ?? true,
        account: result.account,
      }));
      return result.account;
    },
    signOut: async () => {
      await accountRequest('logout', {});
      await clearAccountToken();
      await client.cancelQueries({ queryKey: ['account'] });
      client.setQueryData<AccountStatus>(['account'], (previous) => ({
        configured: previous?.configured ?? true,
        account: null,
      }));
    },
  };
}
