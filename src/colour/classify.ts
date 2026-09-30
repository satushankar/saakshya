import { deltaE } from './distance';
import { MARGIN_RATIO, REJECT_RATIO } from './policy';
import type { Lab } from './types';

/*
 * Rule R: this file must contain no digit characters, in code or comments.
 * Every threshold is derived from the reference table at runtime; the policy
 * ratios live in policy.ts. A unit test scans this source to enforce it.
 */

export interface RefPatch {
  key: string;
  substance: string;
  lab: Lab;
}

export interface Candidate {
  key: string;
  substance: string;
  delta_e: number;
}

export interface Verdict {
  verdict: 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE';
  reason: string;
  nearest: Candidate;
  runnerUp: Candidate;
  candidates: Candidate[];
  thresholds: { t_reject: number; m_margin: number };
}

const NO_REACTION_KEY = 'blank-amber';

/** Smallest CIEDE-two-thousand distance between any two entries of the table. */
export const minimumPairwiseDeltaE = (table: RefPatch[]): number => {
  const distances = table.flatMap((a, i) =>
    table.filter((_, j) => j > i).map((b) => deltaE(a.lab, b.lab)),
  );
  if (!distances.length) throw new Error('Reference table needs at least two entries');
  return Math.min(...distances);
};

/** Classify a reaction colour against the reference table. TRD section five point six. */
export const classify = (reactionLab: Lab, table: RefPatch[]): Verdict => {
  const minPairwise = minimumPairwiseDeltaE(table);
  const thresholds = { t_reject: REJECT_RATIO * minPairwise, m_margin: MARGIN_RATIO * minPairwise };

  const candidates: Candidate[] = table
    .map(({ key, substance, lab }) => ({ key, substance, delta_e: deltaE(reactionLab, lab) }))
    .sort((a, b) => a.delta_e - b.delta_e);
  const [nearest, runnerUp] = candidates;
  const base = { nearest, runnerUp, candidates, thresholds };

  if (nearest.delta_e > thresholds.t_reject)
    return { ...base, verdict: 'INCONCLUSIVE', reason: 'no reference match' };
  if (runnerUp.delta_e - nearest.delta_e < thresholds.m_margin)
    return {
      ...base,
      verdict: 'INCONCLUSIVE',
      reason: `ambiguous between ${nearest.substance} and ${runnerUp.substance}`,
    };
  if (nearest.key === NO_REACTION_KEY) return { ...base, verdict: 'NEGATIVE', reason: nearest.substance };
  return { ...base, verdict: 'POSITIVE', reason: nearest.substance };
};
