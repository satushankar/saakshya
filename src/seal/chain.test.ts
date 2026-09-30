import { describe, expect, it } from 'vitest';
import { sealRecord } from './chain';
import { sha256Hex } from './hash';
import { generateKeyPair } from './keys';
import { GENESIS_HASH, type RecordPayload, type TestRecord } from './types';
import { verifyRecord } from './verify';

const utf8 = (s: string) => new TextEncoder().encode(s);

function payload(n: number, imageBytes: Uint8Array, deviceId: string): RecordPayload {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    case_number: `NCB/DEL/2026/00${n}`,
    reagent: 'marquis',
    operator_id: 'OFF-1234',
    device_id: deviceId,
    captured_at: `2026-09-30T10:0${n}:00.000Z`,
    gps: n === 2 ? null : { lat: 28.6139, lon: 77.209, accuracy_m: 12.5 },
    image_sha256: sha256Hex(imageBytes),
    image_path: `${deviceId}/${n}.jpg`,
    measurement: {
      white_rgb: [240, 238, 236],
      grey_rgb: [128, 127, 126],
      gains: [1.0625, 1.071, 1.08],
      reaction_lab: [35.12, 45.5, -48.25],
      candidates: [{ key: 'marquis-purple', substance: 'opiates', delta_e: 1.234 }],
      thresholds: { t_reject: 10.5, m_margin: 5.25 },
    },
    verdict: 'POSITIVE',
    verdict_reason: 'opiates',
    officer_decision: 'CONFIRMED',
    officer_note: null,
  };
}

async function sealThree() {
  const keys = await generateKeyPair();
  const images = [1, 2, 3].map((n) => utf8(`fake-jpeg-bytes-${n}`));
  const chain: TestRecord[] = [];
  let prev = GENESIS_HASH;
  for (let i = 0; i < 3; i++) {
    const rec = await sealRecord(payload(i + 1, images[i], keys.deviceId), prev, keys);
    chain.push(rec);
    prev = rec.record_hash;
  }
  return { keys, images, chain };
}

const okFlags = (r: { ok: boolean }[]) => r.map((c) => c.ok);

describe('seal + verify', () => {
  it('seals three linked records and all four checks pass for each', async () => {
    const { images, chain } = await sealThree();
    expect(chain[0].prev_hash).toBe(GENESIS_HASH);
    expect(chain[1].prev_hash).toBe(chain[0].record_hash);
    for (let i = 0; i < 3; i++) {
      const res = await verifyRecord(chain[i], images[i], chain);
      expect(okFlags(res)).toEqual([true, true, true, true]);
    }
  });

  it('corrupting one image byte fails check 1 only', async () => {
    const { images, chain } = await sealThree();
    const bad = images[1].slice();
    bad[0] ^= 0xff;
    const res = await verifyRecord(chain[1], bad, chain);
    expect(okFlags(res)).toEqual([false, true, true, true]);
    expect(res[0].detail).toMatch(/IMAGE ALTERED/);
  });

  it('corrupting a payload field fails check 2 only', async () => {
    const { images, chain } = await sealThree();
    const tampered = { ...chain[1], case_number: 'NCB/DEL/2026/999' };
    const res = await verifyRecord(tampered, images[1], [chain[0], tampered, chain[2]]);
    expect(okFlags(res)).toEqual([true, false, true, true]);
    expect(res[1].detail).toMatch(/PAYLOAD ALTERED/);
  });

  it('corrupting a nested measurement value fails check 2 only', async () => {
    const { images, chain } = await sealThree();
    const m = chain[0].measurement;
    const tampered = { ...chain[0], measurement: { ...m, reaction_lab: [35.12, 45.5, -40] as [number, number, number] } };
    const res = await verifyRecord(tampered, images[0], [tampered, chain[1], chain[2]]);
    expect(okFlags(res)).toEqual([true, false, true, true]);
  });

  it('a forged signature fails check 3 only', async () => {
    const { images, chain } = await sealThree();
    const other = await generateKeyPair();
    const forged = await sealRecord(payload(1, images[0], chain[0].device_id), GENESIS_HASH, other);
    const swapped = { ...chain[0], signature: forged.signature };
    const res = await verifyRecord(swapped, images[0], [swapped, chain[1], chain[2]]);
    expect(okFlags(res)).toEqual([true, true, false, true]);
    expect(res[2].detail).toMatch(/SIGNATURE INVALID/);
  });

  it('removing a record from the chain fails check 4 only, naming the record', async () => {
    const { images, chain } = await sealThree();
    const broken = [chain[0], chain[2]];
    const res = await verifyRecord(chain[2], images[2], broken);
    expect(okFlags(res)).toEqual([true, true, true, false]);
    expect(res[3].detail).toMatch(/CHAIN BROKEN AT RECORD 2/);
    expect(res[3].detail).toContain(chain[2].case_number);
  });

  it('the genesis record verifies against a chain of one', async () => {
    const { images, chain } = await sealThree();
    const res = await verifyRecord(chain[0], images[0], chain.slice(0, 1));
    expect(okFlags(res)).toEqual([true, true, true, true]);
  });
});
