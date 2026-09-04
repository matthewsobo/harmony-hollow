/*
 * db.ts — all persistence for Harmony Hollow.
 *
 * Why IndexedDB and not localStorage: localStorage is tiny (~5MB), synchronous
 * (blocks the UI), and the first thing iOS evicts under storage pressure.
 * IndexedDB via the small `idb` wrapper gives us async, structured storage.
 *
 * Everything the app remembers lives here, so the export/import feature can
 * simply serialize this database — that's the family's backup story, since
 * there is deliberately no cloud sync.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Profile } from './types';

interface HHDB extends DBSchema {
  profiles: { key: string; value: Profile };
}

let dbPromise: Promise<IDBPDatabase<HHDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HHDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HHDB>('harmony-hollow', 1, {
      upgrade(db) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const db = await getDB();
  const all = await db.getAll('profiles');
  // Stable order: oldest profile first, so the cards don't shuffle around.
  return all.sort((a, b) => a.createdISO.localeCompare(b.createdISO));
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', profile);
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('profiles', id);
}

/**
 * Ask the browser to protect our data from automatic eviction. iOS Safari can
 * silently clear site data for sites not visited in a while; persistent
 * storage reduces (does not eliminate) that risk. Returns whether it's granted
 * so Settings can display the status.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* unsupported — fall through */
  }
  return false;
}

// ---- Export / import (cheap insurance against storage eviction) ------------

export interface ExportedData {
  app: 'harmony-hollow';
  version: 1;
  exportedISO: string;
  profiles: Profile[];
}

export async function exportData(): Promise<ExportedData> {
  return {
    app: 'harmony-hollow',
    version: 1,
    exportedISO: new Date().toISOString(),
    profiles: await getAllProfiles(),
  };
}

/**
 * Restores profiles from an export file. Merges by id: imported profiles
 * overwrite same-id ones but never delete anything already on the device.
 */
export async function importData(raw: unknown): Promise<number> {
  const data = raw as Partial<ExportedData>;
  if (data?.app !== 'harmony-hollow' || !Array.isArray(data.profiles)) {
    throw new Error('Not a Harmony Hollow backup file');
  }
  for (const p of data.profiles) {
    await saveProfile(p);
  }
  return data.profiles.length;
}
