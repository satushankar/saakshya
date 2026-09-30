import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deviceIdFromPublicKey, generateKeyPair, loadOrCreateDeviceKeys } from './keys';

describe('device keys', () => {
  it('derives device_id as the first 16 hex of sha256(public key)', async () => {
    const kp = await generateKeyPair();
    expect(kp.deviceId).toMatch(/^[0-9a-f]{16}$/);
    expect(deviceIdFromPublicKey(kp.publicKey)).toBe(kp.deviceId);
    expect(kp.secretKey).toHaveLength(32);
    expect(kp.publicKey).toHaveLength(32);
  });

  it('creates the keypair once and returns the same one afterwards', async () => {
    const a = await loadOrCreateDeviceKeys();
    const b = await loadOrCreateDeviceKeys();
    expect(b.deviceId).toBe(a.deviceId);
    expect(Array.from(b.secretKey)).toEqual(Array.from(a.secretKey));
  });
});
