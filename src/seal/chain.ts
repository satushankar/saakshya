import * as ed from '@noble/ed25519';
import { canonicalJSON } from './canonical';
import { hexToBytes, sha256Hex, toBase64 } from './hash';
import type { DeviceKeys } from './keys';
import type { RecordPayload, TestRecord } from './types';

/** The hashed portion of a record: everything except the four seal fields. */
export function toPayload(record: TestRecord): RecordPayload {
  const { prev_hash: _p, record_hash: _r, signature: _s, public_key: _k, ...payload } = record;
  return payload;
}

/** record_hash = SHA256( prev_hash || image_sha256 || canonicalJSON(payload) ) */
export function computeRecordHash(prevHash: string, imageSha256: string, payload: RecordPayload): string {
  return sha256Hex(prevHash + imageSha256 + canonicalJSON(payload));
}

/**
 * Seals a payload on this device: links it to the previous record's hash and signs
 * the record hash with the device's Ed25519 key. Runs at capture time, before any upload.
 */
export async function sealRecord(payload: RecordPayload, prevHash: string, keys: DeviceKeys): Promise<TestRecord> {
  const record_hash = computeRecordHash(prevHash, payload.image_sha256, payload);
  const signature = await ed.signAsync(hexToBytes(record_hash), keys.secretKey);
  return {
    ...payload,
    prev_hash: prevHash,
    record_hash,
    signature: toBase64(signature),
    public_key: toBase64(keys.publicKey),
  };
}
