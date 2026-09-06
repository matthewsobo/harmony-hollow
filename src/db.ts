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
  /** Small device-wide key-value store (mic calibration, future settings). */
  kv: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<HHDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HHDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HHDB>('harmony-hollow', 2, {
      // upgrade() runs once per version step and must create only what's
      // missing — existing stores (and their data) are preserved.
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
      },
    });
  }
  return dbPromise;
}

// ---- Mic calibration settings (device-wide, not per profile) ---------------

export interface MicSettings {
  /** RMS gate: ignore sound quieter than this. Set by calibration. */
  gateThreshold: number;
  /** How sharp (+) or flat (−) the family piano runs, in cents. */
  tuningOffsetCents: number;
  /** Whether calibration has ever completed on this device. */
  calibrated: boolean;
}

export const DEFAULT_MIC_SETTINGS: MicSettings = {
  gateThreshold: 0.01,
  tuningOffsetCents: 0,
  calibrated: false,
};

export async function getMicSettings(): Promise<MicSettings> {
  const db = await getDB();
  const stored = (await db.get('kv', 'micSettings')) as Partial<MicSettings> | undefined;
  return { ...DEFAULT_MIC_SETTINGS, ...stored };
}

export async function saveMicSettings(settings: MicSettings): Promise<void> {
  const db = await getDB();
  await db.put('kv', settings, 'micSettings');
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
