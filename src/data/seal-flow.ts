import type { Analysis } from '../colour/analyse';
import { sealRecord } from '../seal/chain';
import { sha256Hex } from '../seal/hash';
import { loadOrCreateDeviceKeys } from '../seal/keys';
import type { OfficerDecision, Reagent, RecordPayload, TestRecord, VerdictKind } from '../seal/types';
import { getChainHead, saveSealed } from './queue';
import { drainQueue } from './sync';

export interface SealInput {
  case_number: string;
  reagent: Reagent;
  operator_id: string;
  captured_at: string;
  gps: RecordPayload['gps'];
  image: Uint8Array;
  analysis: Analysis;
  officer_decision: OfficerDecision;
  /** Only when overridden: the officer's own call, stored alongside, never replacing the machine verdict. */
  officer_verdict?: VerdictKind;
  officer_note: string | null;
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const r4 = <T extends number[]>(xs: T) => xs.map(round4) as T;

/** Seal on this device, at the scene, then queue for upload. */
export async function sealAndQueue(input: SealInput): Promise<TestRecord> {
  const keys = await loadOrCreateDeviceKeys();
  const { analysis: a } = input;
  const id = crypto.randomUUID();
  const note =
    input.officer_decision === 'OVERRIDDEN'
      ? [`Officer verdict: ${input.officer_verdict ?? 'unspecified'}`, input.officer_note].filter(Boolean).join('. ')
      : input.officer_note;
  const verdictReason = a.greyOk
    ? a.verdict.reason
    : `${a.verdict.reason} (grey-patch check: low confidence, spread ${a.greySpread.toFixed(4)})`;

  const payload: RecordPayload = {
    id,
    case_number: input.case_number.trim(),
    reagent: input.reagent,
    operator_id: input.operator_id,
    device_id: keys.deviceId,
    captured_at: input.captured_at,
    // Canonical JSON hashes floats at 4 dp, so store exactly that precision: no unsealed digits.
    gps: input.gps && { lat: round4(input.gps.lat), lon: round4(input.gps.lon), accuracy_m: round4(input.gps.accuracy_m) },
    image_sha256: sha256Hex(input.image),
    image_path: `${keys.deviceId}/${id}.png`,
    measurement: {
      white_rgb: a.white_rgb,
      grey_rgb: a.grey_rgb,
      gains: r4(a.gains),
      reaction_lab: r4(a.reaction_lab),
      candidates: a.verdict.candidates.map((c) => ({ ...c, delta_e: round4(c.delta_e) })),
      thresholds: { t_reject: round4(a.verdict.thresholds.t_reject), m_margin: round4(a.verdict.thresholds.m_margin) },
    },
    verdict: a.verdict.verdict,
    verdict_reason: verdictReason,
    officer_decision: input.officer_decision,
    officer_note: note || null,
  };

  const record = await sealRecord(payload, await getChainHead(), keys);
  await saveSealed(record, input.image);
  void drainQueue();
  return record;
}
