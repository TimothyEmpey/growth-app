import 'fake-indexeddb/auto';
import { expect, test } from 'bun:test';
import { loadJournal, loadSyncState, saveJournal, saveSyncState } from '../src/data/storage.web';
import { emptyJournal } from '../src/domain/journal';
import { Database } from 'bun:sqlite';
import { migrateSQLite } from '../src/data/sqlite-schema';

test('SQLite migrations preserve journals and refuse to downgrade a newer database', async () => {
  const sqlite = new Database(':memory:');
  const adapter = {
    getFirstAsync: async <T>(sql: string) => sqlite.query(sql).get() as T | null,
    execAsync: async (sql: string) => {
      sqlite.exec(sql);
    },
  };
  await migrateSQLite(adapter);
  sqlite.query('INSERT INTO journal (id,payload) VALUES (1,?)').run(JSON.stringify(emptyJournal()));
  await migrateSQLite(adapter);
  expect(sqlite.query('SELECT * FROM journal').all()).toHaveLength(1);
  expect(sqlite.query('PRAGMA user_version').get()).toEqual({ user_version: 2 });
  expect(sqlite.query('SELECT * FROM sync_state').all()).toEqual([]);
  sqlite.exec('PRAGMA user_version=3;');
  await expect(migrateSQLite(adapter)).rejects.toThrow('newer version');
  expect(sqlite.query('PRAGMA user_version').get()).toEqual({ user_version: 3 });
  expect(sqlite.query('SELECT * FROM journal').all()).toHaveLength(1);
  sqlite.close();
});

test('IndexedDB upgrade creates the journal store; saves survive independent reads', async () => {
  expect(await loadJournal()).toEqual(emptyJournal());
  const journal = emptyJournal();
  journal.weights.push({ id: 'test', date: '2024-01-02', pounds: 180.5 });
  await saveJournal(journal);
  const saved = await loadJournal();
  expect(saved.weights).toEqual(journal.weights);
  saved.weights[0].pounds = 190;
  expect((await loadJournal()).weights[0].pounds).toBe(180.5);
  await saveSyncState({ accountId: 'account-1', revision: 4, base: journal, dirty: true });
  expect(await loadSyncState()).toEqual({
    accountId: 'account-1',
    revision: 4,
    base: journal,
    dirty: true,
  });
  await saveSyncState(null);
  expect(await loadSyncState()).toBeNull();
});
