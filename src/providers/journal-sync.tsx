import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useJournal } from '@/data/journal-store';
import { useAccount } from '@/services/account';
import {
  clearJournalIfOwned,
  getJournalSyncStatus,
  requestJournalSync,
  setJournalSyncAccount,
  subscribeJournalSync,
} from '@/services/journal-sync';

export function JournalSyncProvider({ children }: { children: ReactNode }) {
  const { ready } = useJournal();
  const account = useAccount();
  const id = account.data?.account?.id ?? null;
  useEffect(() => {
    if (!ready || account.isPending || !account.data) return;
    setJournalSyncAccount(id);
    if (!id) {
      void clearJournalIfOwned();
      return;
    }
    const timer = setInterval(requestJournalSync, 60_000);
    return () => clearInterval(timer);
  }, [ready, account.isPending, account.data, id]);
  return children;
}

export function useJournalSync() {
  return useSyncExternalStore(subscribeJournalSync, getJournalSyncStatus, getJournalSyncStatus);
}
