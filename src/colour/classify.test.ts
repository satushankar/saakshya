import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { classify, minimumPairwiseDeltaE, type RefPatch } from './classify';
import { deltaE2000 } from './ciede2000';
import { referenceTable } from './reference';
import { hexToRgb, rgbToLab } from './srgb';
import type { Lab } from './types';

const table = referenceTable();

const closestPair = (t: RefPatch[]): [RefPatch, RefPatch] => {
  let best: [RefPatch, RefPatch] = [t[0], t[1]];
  for (let i = 0; i < t.length; i++)
    for (let j = i + 1; j < t.length; j++)
      if (deltaE2000(t[i].lab, t[j].lab) < deltaE2000(best[0].lab, best[1].lab)) best = [t[i], t[j]];
  return best;
};

describe('classify', () => {
  it('minimumPairwiseDeltaE equals the closest pair distance', () => {
    const [a, b] = closestPair(table);
    expect(minimumPairwiseDeltaE(table)).toBeCloseTo(deltaE2000(a.lab, b.lab), 12);
  });
  it('rejects tables with fewer than two entries', () => {
    expect(() => minimumPairwiseDeltaE(table.slice(0, 1))).toThrow();
    expect(() => classify([50, 0, 0], table.slice(0, 1))).toThrow();
  });
  it('an exact reference colour matches itself with ΔE≈0', () => {
    for (const ref of table) {
      const v = classify(ref.lab, table);
      expect(v.nearest.key).toBe(ref.key);
      expect(v.nearest.delta_e).toBeCloseTo(0, 9);
      expect(v.verdict).toBe(ref.key === 'blank-amber' ? 'NEGATIVE' : 'POSITIVE');
      expect(v.reason).toBe(ref.substance);
    }
  });
  it('returns the full candidate list sorted ascending', () => {
    const v = classify(table[3].lab, table);
    expect(v.candidates).toHaveLength(table.length);
    const ds = v.candidates.map((c) => c.delta_e);
    expect([...ds].sort((x, y) => x - y)).toEqual(ds);
    expect(v.runnerUp).toEqual(v.candidates[1]);
  });
  it('derives thresholds from the table at runtime', () => {
    const m = minimumPairwiseDeltaE(table);
    const v = classify(table[0].lab, table);
    expect(v.thresholds.t_reject).toBeCloseTo(m / 2, 12);
    expect(v.thresholds.m_margin).toBeCloseTo(m / 4, 12);
  });
  it('Lab midpoint of the two closest references is INCONCLUSIVE (ambiguous)', () => {
    const [a, b] = closestPair(table);
    const mid = a.lab.map((x, i) => (x + b.lab[i]) / 2) as Lab;
    const v = classify(mid, table);
    expect(v.verdict).toBe('INCONCLUSIVE');
    expect(v.reason.startsWith('ambiguous')).toBe(true);
    expect(v.reason).toContain(a.substance);
    expect(v.reason).toContain(b.substance);
  });
  it('a far colour (pure green) is INCONCLUSIVE — no reference match', () => {
    const v = classify(rgbToLab(hexToRgb('#00FF00')), table);
    expect(v).toMatchObject({ verdict: 'INCONCLUSIVE', reason: 'no reference match' });
  });
  it('R5: classify.ts contains no digit characters at all', () => {
    const src = readFileSync(fileURLToPath(new URL('./classify.ts', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/\d/);
  });
});
