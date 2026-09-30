export type Reagent = 'marquis' | 'mecke' | 'scott';
export type VerdictKind = 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE';
export type OfficerDecision = 'CONFIRMED' | 'OVERRIDDEN' | null;

export interface Measurement {
  white_rgb: [number, number, number];
  grey_rgb: [number, number, number];
  gains: [number, number, number];
  reaction_lab: [number, number, number];
  candidates: { key: string; substance: string; delta_e: number }[];
  thresholds: { t_reject: number; m_margin: number };
}

export interface TestRecord {
  id: string;
  case_number: string;
  reagent: Reagent;
  operator_id: string;
  device_id: string;
  captured_at: string;
  gps: { lat: number; lon: number; accuracy_m: number } | null;
  image_sha256: string;
  image_path: string;
  measurement: Measurement;
  verdict: VerdictKind;
  verdict_reason: string;
  officer_decision: OfficerDecision;
  officer_note: string | null;
  prev_hash: string;
  record_hash: string;
  signature: string;
  public_key: string;
}

/** Everything that is hashed: the record minus the four seal fields. */
export type RecordPayload = Omit<TestRecord, 'prev_hash' | 'record_hash' | 'signature' | 'public_key'>;

export const GENESIS_HASH = '0'.repeat(64);
