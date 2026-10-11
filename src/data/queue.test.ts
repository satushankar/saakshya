import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getLocalRecord, saveSealed, setProfile } from './queue';
import { sealRecord } from '../seal/chain';
import { sha256Hex } from '../seal/hash';
import { generateKeyPair } from '../seal/keys';
import { GENESIS_HASH, type RecordPayload, type TestRecord } from '../seal/types';

const image = new TextEncoder().encode('fake-png-bytes');

async function seal(prevHash: string, deviceId: string, n: number): Promise<TestRecord> {
  const keys = await generateKeyPair();
  const payload: RecordPayload = {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    case_number: `NDPS/2026/00${n}`,
    reagent: 'marquis',
    operator_id: 'DEMO-LOCAL',
    device_id: deviceId,
    captured_at: `2026-10-11T10:0${n}:00.000Z`,
    gps: null,
    image_sha256: sha256Hex(image),
    image_path: `${deviceId}/${n}.png`,
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
  return sealRecord(payload, prevHash, keys);
}

// One shared store, sealed in order, because the chain head is deliberately stateful.
describe('saveSealed sync state', () => {
  const device = 'aaaaaaaaaaaaaaaa';
  let head = GENESIS_HASH;

  it('marks a record pending when an account is registered', async () => {
    await setProfile({ officer_id: 'NCB-4417', registered_at: new Date().toISOString(), local_only: false });
    const rec = await seal(head, device, 1);
    await saveSealed(rec, image);
    head = rec.record_hash;
    expect((await getLocalRecord(rec.id))?.sync_state).toBe('pending');
  });

  it('marks a record local in this-device-only demo mode, so nothing claims to be queued', async () => {
    await setProfile({ officer_id: 'DEMO-LOCAL', registered_at: new Date().toISOString(), local_only: true });
    const rec = await seal(head, device, 2);
    await saveSealed(rec, image);
    head = rec.record_hash;
    expect((await getLocalRecord(rec.id))?.sync_state).toBe('local');
  });

  it('still refuses to seal onto a stale chain head', async () => {
    const stale = await seal(GENESIS_HASH, device, 3);
    await expect(saveSealed(stale, image)).rejects.toThrow(/chain head/i);
  });
});
