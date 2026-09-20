import * as SQLite from 'expo-sqlite';
import { migrateJournal } from '@/domain/journal';
import type { Journal } from '@/domain/types';
import { migrateSQLite } from './sqlite-schema';

export type StoredSyncState = {
  accountId: string;
  revision: number;
  base: Journal | null;
  dirty: boolean;
};

// Native persistence: one versioned journal snapshot stored as JSON in SQLite.
let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  if (!database)
    database = (async () => {
      const connection = await SQLite.openDatabaseAsync('growth.db');
      await migrateSQLite(connection);
      return connection;
    })();
  return database;
}
export async function loadJournal(): Promise<Journal> {
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>('SELECT payload FROM journal WHERE id = 1');
  return migrateJournal(row ? JSON.parse(row.payload) : null);
}
export async function saveJournal(journal: Journal): Promise<void> {
  await (
    await db()
  ).runAsync(
    'INSERT INTO journal (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
    JSON.stringify(journal),
  );
}
export async function loadSyncState(): Promise<StoredSyncState | null> {
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>('SELECT payload FROM sync_state WHERE id = 1');
  if (!row) return null;
  const value = JSON.parse(row.payload) as StoredSyncState;
  return { ...value, base: value.base ? migrateJournal(value.base) : null };
}
export async function saveSyncState(state: StoredSyncState | null): Promise<void> {
  const database = await db();
  if (!state) {
    await database.runAsync('DELETE FROM sync_state WHERE id = 1');
    return;
  }
  await database.runAsync(
    'INSERT INTO sync_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
    JSON.stringify(state),
  );
}
