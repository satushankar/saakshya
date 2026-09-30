import { hasSession, registerDevice } from './auth';
import { getLocalImage, listRecords, setSyncState } from './queue';
import { IMAGE_BUCKET, supabase, toRow } from './supabase';

let running = false;

export const SIGN_IN_REQUIRED = 'Sign in required. Open Settings and sign in to upload.';

const isDuplicate = (msg: string) => /duplicate|already exists|23505/i.test(msg);

/**
 * Drains the queue: uploads each pending record's image, then inserts the row.
 * Uploads exactly what was sealed. Recomputes nothing (rule R3).
 */
export async function drainQueue(): Promise<void> {
  if (!supabase || running || !navigator.onLine) return;
  running = true;
  try {
    const pending = (await listRecords()).filter((r) => r.sync_state !== 'synced').reverse();
    if (!pending.length) return;
    if (!(await hasSession())) {
      // Sealed records stay safe on the device; they upload once the officer signs in again.
      for (const { record } of pending) await setSyncState(record.id, 'failed', SIGN_IN_REQUIRED);
      return;
    }
    const registered = new Set<string>();
    for (const { record } of pending) {
      try {
        if (!registered.has(record.device_id)) {
          await registerDevice(record.device_id, record.public_key, record.operator_id);
          registered.add(record.device_id);
        }
        const image = await getLocalImage(record.id);
        if (!image) throw new Error('Local image missing');
        const up = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(record.image_path, image, { contentType: 'image/png', upsert: false });
        if (up.error && !isDuplicate(up.error.message)) throw new Error(`Image upload failed: ${up.error.message}`);
        const ins = await supabase.from('records').insert(toRow(record));
        if (ins.error && !isDuplicate(ins.error.message)) throw new Error(`Record insert failed: ${ins.error.message}`);
        await setSyncState(record.id, 'synced');
      } catch (e) {
        await setSyncState(record.id, 'failed', e instanceof Error ? e.message : 'Unknown sync error');
      }
    }
  } finally {
    running = false;
  }
}

/** Start background sync: now, whenever the browser comes online, and every minute. */
export function startSync(): () => void {
  const run = () => void drainQueue();
  run();
  window.addEventListener('online', run);
  const timer = window.setInterval(run, 60_000);
  return () => {
    window.removeEventListener('online', run);
    window.clearInterval(timer);
  };
}
