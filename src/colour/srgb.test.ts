import { describe, expect, it } from 'vitest';
import { hexToRgb, linearToSrgb, rgbToLab, srgbToLinear } from './srgb';

describe('srgb', () => {
  it('converts #FF0000 to published Lab', () => {
    const [L, a, b] = rgbToLab(hexToRgb('#FF0000'));
    expect(Math.abs(L - 53.24)).toBeLessThan(0.02);
    expect(Math.abs(a - 80.09)).toBeLessThan(0.02);
    expect(Math.abs(b - 67.2)).toBeLessThan(0.02);
  });
  it('converts white to L=100, a=b=0', () => {
    const [L, a, b] = rgbToLab([255, 255, 255]);
    expect(L).toBeCloseTo(100, 3);
    expect(a).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
  });
  it('black is L=0', () => {
    expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 6);
  });
  it('linearisation round-trips', () => {
    for (const c of [0, 0.01, 0.04045, 0.2, 0.5, 0.9, 1]) {
      expect(linearToSrgb(srgbToLinear(c))).toBeCloseTo(c, 6); // IEC knee constants differ by ~3e-8
    }
  });
  it('parses hex with and without #, rejects junk', () => {
    expect(hexToRgb('#2D6CB8')).toEqual([45, 108, 184]);
    expect(hexToRgb('e0c877')).toEqual([224, 200, 119]);
    expect(() => hexToRgb('#12345')).toThrow();
    expect(() => hexToRgb('#GGGGGG')).toThrow();
  });
});
