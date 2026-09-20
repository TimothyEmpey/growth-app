interface Database {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
}

// Versions the SQLite schema; the JSON payload version is checked separately by migrateJournal.
export async function migrateSQLite(database: Database): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version > 2)
    throw new Error(
      'This journal needs a newer version of Growth. Your data has not been changed.',
    );
  await database.execAsync('PRAGMA journal_mode = WAL;');
  if (version < 1) {
    try {
      await database.execAsync(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
        PRAGMA user_version = 1;
        COMMIT;`);
    } catch (error) {
      await database.execAsync('ROLLBACK;').catch(() => {});
      throw error;
    }
  }
  if (version < 2) {
    try {
      await database.execAsync(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS sync_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
        PRAGMA user_version = 2;
        COMMIT;`);
    } catch (error) {
      await database.execAsync('ROLLBACK;').catch(() => {});
      throw error;
    }
  }
}
