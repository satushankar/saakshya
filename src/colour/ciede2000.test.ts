import { describe, expect, it } from 'vitest';
import pairs from '../test/fixtures/sharma-ciede2000.json';
import { deltaE2000 } from './ciede2000';
import type { Lab } from './types';

const rows = pairs as number[][];

describe('CIEDE2000 — Sharma, Wu & Dalal (2005) Table 1', () => {
  it('fixture has all 34 pairs', () => expect(rows).toHaveLength(34));
  rows.forEach(([L1, a1, b1, L2, a2, b2, dE], i) => {
    const p: Lab = [L1, a1, b1];
    const q: Lab = [L2, a2, b2];
    it(`pair ${i + 1}: ΔE00 = ${dE}`, () => {
      expect(deltaE2000(p, q)).toBeCloseTo(dE, 4);
      expect(deltaE2000(q, p)).toBeCloseTo(dE, 4);
    });
  });
  it('identical colours give zero', () => {
    expect(deltaE2000([50, 10, -10], [50, 10, -10])).toBe(0);
  });
});
