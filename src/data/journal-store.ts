import { useEffect, useSyncExternalStore } from 'react';
import { emptyJournal } from '@/domain/journal';
import type { Journal } from '@/domain/types';
import { loadJournal, saveJournal } from './storage';

// Shared local state for journal screens; storage.web.ts supplies the browser adapter.
type Snapshot = { journal: Journal; ready: boolean; error: string | null };
let snapshot: Snapshot = { journal: emptyJournal(), ready: false, error: null };
const initial = snapshot;
const listeners = new Set<() => void>();
const editListeners = new Set<() => void>();
let loading: Promise<void> | undefined;
let writes: Promise<unknown> = Promise.resolve();
let editVersion = 0;
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
  // Serialize edits within this app instance and publish only after storage confirms the save.
  const operation = writes
    .catch(() => {})
    .then(async () => {
      await initializeJournal();
      if (!snapshot.ready) throw new Error(snapshot.error ?? 'Your journal is still opening.');
      const journal = JSON.parse(JSON.stringify(snapshot.journal)) as Journal;
      change(journal);
      await saveJournal(journal);
      publish({ journal, ready: true, error: null });
      editVersion++;
      editListeners.forEach((listener) => listener());
    });
  writes = operation;
  return operation;
}
export function replaceJournal(journal: Journal): Promise<void> {
  const operation = writes
    .catch(() => {})
    .then(async () => {
      const migrated = JSON.parse(JSON.stringify(journal)) as Journal;
      await saveJournal(migrated);
      publish({ journal: migrated, ready: true, error: null });
    });
  writes = operation;
  return operation;
}
export async function journalSnapshot(): Promise<{ journal: Journal; editVersion: number }> {
  await initializeJournal();
  if (!snapshot.ready) throw new Error(snapshot.error ?? 'Your journal is still opening.');
  return { journal: JSON.parse(JSON.stringify(snapshot.journal)) as Journal, editVersion };
}
export function installSyncedJournal(
  journal: Journal,
  expectedEditVersion: number,
  mergeConcurrentEdit: (current: Journal) => Journal,
): Promise<boolean> {
  let changedWhileSyncing = false;
  const operation = writes
    .catch(() => {})
    .then(async () => {
      changedWhileSyncing = editVersion !== expectedEditVersion;
      const next = changedWhileSyncing ? mergeConcurrentEdit(snapshot.journal) : journal;
      const saved = JSON.parse(JSON.stringify(next)) as Journal;
      await saveJournal(saved);
      publish({ journal: saved, ready: true, error: null });
    });
  writes = operation;
  return operation.then(() => changedWhileSyncing);
}
export function subscribeJournalEdits(listener: () => void) {
  editListeners.add(listener);
  return () => editListeners.delete(listener);
}
