interface Database {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
}

export async function migrateSQLite(database: Database): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version > 1)
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
}
