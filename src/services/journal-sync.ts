import { AppState } from 'react-native';
import { emptyJournal } from '@/domain/journal';
import { mergeJournals } from '@/domain/journal-sync';
import type { Journal } from '@/domain/types';
import {
  installSyncedJournal,
  journalSnapshot,
  replaceJournal,
  subscribeJournalEdits,
} from '@/data/journal-store';
import { loadSyncState, saveSyncState, type StoredSyncState } from '@/data/storage';
import { api, ApiError } from './api';

type CloudJournal = {
  journal: Journal | null;
  revision: number;
  updatedAt: string | null;
};
export type JournalSyncStatus = {
  state: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  updatedAt: string | null;
  message: string | null;
};

let accountId: string | null = null;
let status: JournalSyncStatus = { state: 'idle', updatedAt: null, message: null };
const listeners = new Set<() => void>();
let work: Promise<void> = Promise.resolve();
let rerun = false;
const publish = (next: JournalSyncStatus) => {
  status = next;
  listeners.forEach((listener) => listener());
};
const cloudJournal = () =>
  api<CloudJournal>('/api/account/journal', { cache: 'no-store' }, 'account');
const upload = (journal: Journal, baseRevision: number) =>
  api<CloudJournal>(
    '/api/account/journal',
    { method: 'POST', body: JSON.stringify({ journal, baseRevision }) },
    'account',
  );

async function reconcile(id: string) {
  const { journal: local, editVersion } = await journalSnapshot();
  let saved = await loadSyncState();
  const remote = await cloudJournal();
  if (accountId !== id) return null;

  if (saved?.accountId !== id) {
    if (remote.journal) {
      const dirty = await installSyncedJournal(remote.journal, editVersion, (current) =>
        mergeJournals(local, current, remote.journal!),
      );
      saved = { accountId: id, revision: remote.revision, base: remote.journal, dirty };
      await saveSyncState(saved);
      if (dirty) rerun = true;
      return remote.updatedAt;
    }
    // A journal with no owner is imported on the first sign-in. If this device
    // previously belonged to another account, start the new account empty.
    const initial = saved ? emptyJournal() : local;
    const uploaded = await upload(initial, 0);
    const dirty = await installSyncedJournal(initial, editVersion, (current) =>
      mergeJournals(local, current, initial),
    );
    await saveSyncState({ accountId: id, revision: uploaded.revision, base: initial, dirty });
    if (dirty) rerun = true;
    return uploaded.updatedAt;
  }

  if (!saved.dirty) {
    let dirty = false;
    if (remote.journal && remote.revision !== saved.revision)
      dirty = await installSyncedJournal(remote.journal, editVersion, (current) =>
        mergeJournals(local, current, remote.journal!),
      );
    await saveSyncState({
      accountId: id,
      revision: remote.revision,
      base: remote.journal,
      dirty,
    });
    if (dirty) rerun = true;
    return remote.updatedAt;
  }

  const remoteJournal = remote.journal ?? emptyJournal();
  const merged =
    remote.revision === saved.revision
      ? local
      : mergeJournals(saved.base ?? emptyJournal(), local, remoteJournal);
  try {
    const uploaded = await upload(merged, remote.revision);
    const dirty = await installSyncedJournal(merged, editVersion, (current) =>
      mergeJournals(local, current, merged),
    );
    await saveSyncState({
      accountId: id,
      revision: uploaded.revision,
      base: merged,
      dirty,
    });
    if (dirty) rerun = true;
    return uploaded.updatedAt;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      rerun = true;
    }
    throw error;
  }
}

export function requestJournalSync() {
  if (!accountId) return;
  if (status.state === 'syncing') {
    rerun = true;
    return;
  }
  const id = accountId;
  publish({ ...status, state: 'syncing', message: null });
  work = work
    .catch(() => {})
    .then(async () => {
      try {
        const updatedAt = await reconcile(id);
        if (accountId === id) publish({ state: 'synced', updatedAt, message: null });
      } catch (error) {
        if (accountId !== id) return;
        const offline = error instanceof ApiError && error.status === 503;
        publish({
          state: offline ? 'offline' : 'error',
          updatedAt: status.updatedAt,
          message: error instanceof Error ? error.message : 'Journal sync failed.',
        });
      } finally {
        if (rerun && accountId === id) {
          rerun = false;
          requestJournalSync();
        }
      }
    });
}

export function setJournalSyncAccount(id: string | null) {
  if (accountId === id) return;
  accountId = id;
  publish({ state: id ? 'idle' : 'idle', updatedAt: null, message: null });
  if (id) requestJournalSync();
}

export async function clearSyncedJournal() {
  accountId = null;
  work = work
    .catch(() => {})
    .then(async () => {
      await replaceJournal(emptyJournal());
      await saveSyncState(null);
    });
  await work;
  publish({ state: 'idle', updatedAt: null, message: null });
}

export async function clearJournalIfOwned() {
  if (await loadSyncState()) await clearSyncedJournal();
}

export const getJournalSyncStatus = () => status;
export function subscribeJournalSync(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

subscribeJournalEdits(() => {
  if (!accountId) return;
  const id = accountId;
  work = work
    .catch(() => {})
    .then(async () => {
      if (accountId !== id) return;
      const saved = await loadSyncState();
      const next: StoredSyncState =
        saved?.accountId === id
          ? { ...saved, dirty: true }
          : { accountId: id, revision: 0, base: null, dirty: true };
      if (accountId === id) await saveSyncState(next);
    })
    .finally(requestJournalSync);
});

AppState.addEventListener('change', (next) => {
  if (next === 'active') requestJournalSync();
});
