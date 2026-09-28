import { useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useJournal } from '@/data/journal-store';
import { syncActivityWidget, syncJournalWidgets } from '@/services/widget-sync';

const ACTIVITY_REFRESH_MS = 15 * 60 * 1000;

export function WidgetSyncProvider({ children }: { children: ReactNode }) {
  const { journal, ready } = useJournal();
  const latestJournal = useRef(journal);

  useEffect(() => {
    latestJournal.current = journal;
  }, [journal]);

  useEffect(() => {
    if (!ready) return;
    syncJournalWidgets(journal);
  }, [journal, ready]);

  useEffect(() => {
    if (!ready) return;
    const refresh = () => void syncActivityWidget(latestJournal.current);
    refresh();
    const interval = setInterval(refresh, ACTIVITY_REFRESH_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [ready]);

  return children;
}
