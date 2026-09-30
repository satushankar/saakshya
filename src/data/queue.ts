import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { GENESIS_HASH, type TestRecord } from '../seal/types';

export type SyncState = 'pending' | 'synced' | 'failed';

export interface LocalRecord {
  record: TestRecord;
  sync_state: SyncState;
  sync_error: string | null;
}

export interface Profile {
  officer_id: string;
  registered_at: string;
}

interface SaakshyaDB extends DBSchema {
  records: { key: string; value: LocalRecord };
  images: { key: string; value: Uint8Array };
  meta: { key: string; value: string | Profile };
}

let dbPromise: Promise<IDBPDatabase<SaakshyaDB>> | null = null;

function db() {
  dbPromise ??= openDB<SaakshyaDB>('saakshya', 1, {
    upgrade(d) {
      d.createObjectStore('records', { keyPath: 'record.id' });
      d.createObjectStore('images');
      d.createObjectStore('meta');
    },
  });
  return dbPromise;
}

const listeners = new Set<() => void>();
/** Subscribe to any local-store change (new record, sync state). Returns unsubscribe. */
export function onQueueChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn());

export async function getProfile(): Promise<Profile | null> {
  return ((await (await db()).get('meta', 'profile')) as Profile | undefined) ?? null;
}

export async function setProfile(profile: Profile): Promise<void> {
  await (await db()).put('meta', profile, 'profile');
}

/** record_hash of the last record sealed on this device, or the genesis hash. */
export async function getChainHead(): Promise<string> {
  return ((await (await db()).get('meta', 'chainHead')) as string | undefined) ?? GENESIS_HASH;
}

/**
 * Stores a sealed record and its exact image bytes, and advances the chain head,
 * in one transaction. Refuses if the head moved since the record was sealed.
 */
export async function saveSealed(record: TestRecord, image: Uint8Array): Promise<void> {
  const tx = (await db()).transaction(['records', 'images', 'meta'], 'readwrite');
  const head = ((await tx.objectStore('meta').get('chainHead')) as string | undefined) ?? GENESIS_HASH;
  if (head !== record.prev_hash) {
    tx.abort();
    throw new Error('Chain head changed while sealing. Seal again.');
  }
  await Promise.all([
    tx.objectStore('records').add({ record, sync_state: 'pending', sync_error: null }),
    tx.objectStore('images').put(image, record.id),
    tx.objectStore('meta').put(record.record_hash, 'chainHead'),
    tx.done,
  ]);
  notify();
}

/** All local records, newest first. */
export async function listRecords(): Promise<LocalRecord[]> {
  const all = await (await db()).getAll('records');
  return all.sort((a, b) => b.record.captured_at.localeCompare(a.record.captured_at));
}

export async function getLocalRecord(id: string): Promise<LocalRecord | null> {
  return (await (await db()).get('records', id)) ?? null;
}

export async function getLocalImage(id: string): Promise<Uint8Array | null> {
  return (await (await db()).get('images', id)) ?? null;
}

export async function setSyncState(id: string, sync_state: SyncState, sync_error: string | null = null): Promise<void> {
  const d = await db();
  const cur = await d.get('records', id);
  if (!cur) return;
  // Only sync metadata changes. The sealed record itself is never rewritten.
  await d.put('records', { record: cur.record, sync_state, sync_error });
  notify();
}

/** DEV ONLY: flip one byte of the locally stored image, for the tamper demo. */
export async function tamperLocalImage(id: string): Promise<Uint8Array | null> {
  const d = await db();
  const img = await d.get('images', id);
  if (!img) return null;
  const bad = img.slice();
  const mid = Math.floor(bad.length / 2);
  bad[mid] ^= 0x01;
  await d.put('images', bad, id);
  notify();
  return bad;
}
