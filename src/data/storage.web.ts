import { migrateJournal } from '@/domain/journal';
import type { Journal } from '@/domain/types';

// Browser counterpart to storage.ts; uses the same load/save interface and journal format.
let database: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('growth-journal', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('journal'))
          request.result.createObjectStore('journal');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Browser storage is unavailable. Enable storage to save your journal.'));
      request.onblocked = () =>
        reject(new Error('Close other Growth tabs and reload to update storage.'));
    });
  return database;
}
export async function loadJournal(): Promise<Journal> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction('journal', 'readonly')
      .objectStore('journal')
      .get('current');
    request.onsuccess = () => {
      try {
        resolve(migrateJournal(request.result));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function saveJournal(journal: Journal): Promise<void> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('journal', 'readwrite');
    transaction.objectStore('journal').put(journal, 'current');
    // A successful put request is not durable until its transaction completes.
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new Error('Could not save your journal. Browser storage may be full.'));
    transaction.onabort = () => reject(new Error('Save interrupted. Please try again.'));
  });
}
