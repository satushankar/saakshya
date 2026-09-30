import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TestRecord } from '../seal/types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when env is not configured; the app then runs fully local. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const IMAGE_BUCKET = 'test-images';

/** Row shape: the sealed record plus the exact captured_at string that was signed. */
export type RecordRow = TestRecord & { captured_at_sealed: string; synced_at?: string };

export function toRow(record: TestRecord): RecordRow {
  return { ...record, captured_at_sealed: record.captured_at };
}

/** Rebuild the sealed record from a row, using the verbatim sealed timestamp. */
export function fromRow(row: RecordRow): TestRecord {
  const { captured_at_sealed, synced_at: _s, ...rest } = row;
  return { ...rest, captured_at: captured_at_sealed };
}

export async function fetchRemoteRecord(id: string): Promise<TestRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('records').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load record: ${error.message}`);
  return data ? fromRow(data as RecordRow) : null;
}

export async function fetchRemoteDeviceChain(deviceId: string): Promise<TestRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('records').select('*').eq('device_id', deviceId);
  if (error) throw new Error(`Could not load device chain: ${error.message}`);
  return (data as RecordRow[]).map(fromRow);
}

export async function downloadRemoteImage(path: string): Promise<Uint8Array | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
