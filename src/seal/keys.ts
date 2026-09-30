import * as ed from '@noble/ed25519';
import { openDB } from 'idb';
import { sha256Hex } from './hash';

export interface DeviceKeys {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  deviceId: string;
}

const DEVICE_ID_HEX_LEN = 16;

/** device_id = first 16 hex chars of sha256(public key). */
export function deviceIdFromPublicKey(publicKey: Uint8Array): string {
  return sha256Hex(publicKey).slice(0, DEVICE_ID_HEX_LEN);
}

export async function generateKeyPair(): Promise<DeviceKeys> {
  const secretKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(secretKey);
  return { secretKey, publicKey, deviceId: deviceIdFromPublicKey(publicKey) };
}

const DB_NAME = 'saakshya-keys';
const STORE = 'keys';
const KEY = 'device';

/**
 * Loads the device keypair from IndexedDB, generating it on first run.
 * The secret key never leaves this database — nothing in the app transmits it.
 */
export async function loadOrCreateDeviceKeys(): Promise<DeviceKeys> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore(STORE);
    },
  });
  try {
    const existing = (await db.get(STORE, KEY)) as { secretKey: Uint8Array; publicKey: Uint8Array } | undefined;
    if (existing) {
      return { ...existing, deviceId: deviceIdFromPublicKey(existing.publicKey) };
    }
    const fresh = await generateKeyPair();
    await db.put(STORE, { secretKey: fresh.secretKey, publicKey: fresh.publicKey }, KEY);
    return fresh;
  } finally {
    db.close();
  }
}
