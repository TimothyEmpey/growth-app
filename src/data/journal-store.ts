import { useEffect, useSyncExternalStore } from 'react';
import { emptyJournal } from '@/domain/journal';
import type { Journal } from '@/domain/types';
import { loadJournal, saveJournal } from './storage';

type Snapshot = { journal: Journal; ready: boolean; error: string | null };
let snapshot: Snapshot = { journal: emptyJournal(), ready: false, error: null };
const initial = snapshot;
const listeners = new Set<() => void>();
let loading: Promise<void> | undefined;
let writes: Promise<unknown> = Promise.resolve();
const publish = (next: Snapshot) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};
export function initializeJournal() {
  if (!loading)
    loading = loadJournal()
      .then((journal) => publish({ journal, ready: true, error: null }))
      .catch((error) => publish({ ...snapshot, error: error.message }));
  return loading;
}
export function useJournal() {
  const current = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => snapshot,
    () => initial,
  );
  useEffect(() => {
    void initializeJournal();
  }, []);
  return current;
}
export function updateJournal(change: (journal: Journal) => void): Promise<void> {
  const operation = writes
    .catch(() => {})
    .then(async () => {
      await initializeJournal();
      if (!snapshot.ready) throw new Error(snapshot.error ?? 'Your journal is still opening.');
      const journal = JSON.parse(JSON.stringify(snapshot.journal)) as Journal;
      change(journal);
      await saveJournal(journal);
      publish({ journal, ready: true, error: null });
    });
  writes = operation;
  return operation;
}
