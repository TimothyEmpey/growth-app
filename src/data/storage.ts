import * as SQLite from 'expo-sqlite';
import { migrateJournal } from '@/domain/journal';
import type { Journal } from '@/domain/types';
import { migrateSQLite } from './sqlite-schema';

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
