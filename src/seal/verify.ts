import * as ed from '@noble/ed25519';
import { computeRecordHash, toPayload } from './chain';
import { fromBase64, hexToBytes, sha256Hex } from './hash';
import { GENESIS_HASH, type TestRecord } from './types';

export type CheckId = 'image' | 'payload' | 'signature' | 'chain';

export interface CheckResult {
  id: CheckId;
  name: string;
  ok: boolean;
  detail: string;
}

function checkImage(record: TestRecord, imageBytes: Uint8Array | null): CheckResult {
  const name = 'Image integrity';
  if (!imageBytes) return { id: 'image', name, ok: false, detail: 'IMAGE UNAVAILABLE — the stored photograph could not be loaded.' };
  const actual = sha256Hex(imageBytes);
  return actual === record.image_sha256
    ? { id: 'image', name, ok: true, detail: 'Stored photograph matches the sealed image hash.' }
    : { id: 'image', name, ok: false, detail: 'IMAGE ALTERED — the stored photograph does not match the sealed hash.' };
}

function checkPayload(record: TestRecord): CheckResult {
  const name = 'Record payload';
  const recomputed = computeRecordHash(record.prev_hash, record.image_sha256, toPayload(record));
  return recomputed === record.record_hash
    ? { id: 'payload', name, ok: true, detail: 'Recomputed record hash matches the sealed hash.' }
    : { id: 'payload', name, ok: false, detail: 'PAYLOAD ALTERED — one or more record fields differ from what was sealed.' };
}

async function checkSignature(record: TestRecord): Promise<CheckResult> {
  const name = 'Signature';
  let ok = false;
  try {
    ok = await ed.verifyAsync(fromBase64(record.signature), hexToBytes(record.record_hash), fromBase64(record.public_key));
  } catch {
    ok = false;
  }
  return ok
    ? { id: 'signature', name, ok, detail: 'Ed25519 signature is valid for the record hash and device key.' }
    : { id: 'signature', name, ok, detail: 'SIGNATURE INVALID — the signature does not match this record hash and device key.' };
}

/**
 * Walks this device's chain in capture order up to the record being verified and
 * confirms every prev_hash links to the record before it.
 */
function checkChain(record: TestRecord, deviceChain: TestRecord[]): CheckResult {
  const name = 'Chain position';
  const chain = deviceChain
    .filter((r) => r.device_id === record.device_id)
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  const target = chain.findIndex((r) => r.id === record.id);
  if (target < 0) {
    return { id: 'chain', name, ok: false, detail: 'CHAIN BROKEN — this record is not present in its device chain.' };
  }
  for (let i = 0; i <= target; i++) {
    const expected = i === 0 ? GENESIS_HASH : chain[i - 1].record_hash;
    if (chain[i].prev_hash !== expected) {
      return {
        id: 'chain',
        name,
        ok: false,
        detail: `CHAIN BROKEN AT RECORD ${i + 1} (${chain[i].case_number}) — its previous-hash link does not match the record before it.`,
      };
    }
  }
  return { id: 'chain', name, ok: true, detail: `Linked correctly at position ${target + 1} of this device's chain.` };
}

/** Four independent checks. Each reports its own result; none short-circuits another. */
export async function verifyRecord(
  record: TestRecord,
  imageBytes: Uint8Array | null,
  deviceChain: TestRecord[],
): Promise<CheckResult[]> {
  return [checkImage(record, imageBytes), checkPayload(record), await checkSignature(record), checkChain(record, deviceChain)];
}
