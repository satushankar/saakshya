import { describe, expect, it } from 'vitest';
import { REFERENCE_SWATCHES, referenceTable } from './reference';
import { hexToRgb, rgbToLab } from './srgb';

describe('reference table', () => {
  it('has the five TRD §3 swatches in card order', () => {
    expect(REFERENCE_SWATCHES.map((s) => s.code).join('')).toBe('AOBPK');
    expect(REFERENCE_SWATCHES.find((s) => s.key === 'blank-amber')?.substance).toBe('no reaction');
  });
  it('converts hex to Lab', () => {
    const t = referenceTable();
    expect(t).toHaveLength(5);
    expect(t[2]).toEqual({ key: 'scott-blue', substance: 'cocaine', lab: rgbToLab(hexToRgb('#2D6CB8')) });
  });
});
