import { describe, expect, it } from 'vitest';
import { linearToSrgb } from './srgb';
import { applyGains, computeGains, greyCheck, TARGET_WHITE, validateLighting } from './whitebalance';
import type { RGB } from './types';

/** Warm illuminant, as per-channel linear multipliers. */
const CAST = [0.95, 0.75, 0.5];
const measure = (reflectance: number): RGB => {
  const [r, g, b] = CAST.map((f) => 255 * linearToSrgb(reflectance * f));
  return [r, g, b];
};

describe('white balance', () => {
  it('balances a warm-cast grey patch to neutral', () => {
    const gains = computeGains(measure(1));
    const grey = applyGains(measure(0.2), gains);
    grey.forEach((c) => expect(c).toBeCloseTo(0.2, 9));
    const check = greyCheck(grey, 0.02);
    expect(check.ok).toBe(true);
    expect(check.spread).toBeLessThan(1e-9);
  });
  it('white maps to target white after balancing', () => {
    applyGains(measure(1), computeGains(measure(1), TARGET_WHITE)).forEach((c) => expect(c).toBeCloseTo(1, 9));
  });
  it('clamps balanced values to 0..1', () => {
    expect(applyGains([255, 255, 255], [2, 2, 2])).toEqual([1, 1, 1]);
  });
  it('greyCheck flags a divergent grey', () => {
    const r = greyCheck([0.2, 0.25, 0.2], 0.02);
    expect(r.ok).toBe(false);
    expect(r.spread).toBeCloseTo(0.05, 9);
  });
  it('rejects a zero white channel', () => {
    expect(() => computeGains([0, 200, 200])).toThrow();
  });
});

describe('validateLighting', () => {
  it('accepts a good white', () => expect(validateLighting([220, 215, 210])).toEqual({ ok: true, code: 'OK' }));
  it('too bright', () => {
    const r = validateLighting([250, 230, 230]);
    expect(r).toMatchObject({ ok: false, code: 'TOO_BRIGHT' });
    expect(r.reason).toBe('Too bright — the white patch is clipped. Move into shade and retake.');
  });
  it('too dark', () => {
    const r = validateLighting([119, 130, 130]);
    expect(r).toMatchObject({ ok: false, code: 'TOO_DARK' });
    expect(r.reason).toBe('Too dark — move into better light and retake.');
  });
  it('colour cast', () => {
    const r = validateLighting([230, 200, 180]);
    expect(r).toMatchObject({ ok: false, code: 'COLOUR_CAST' });
    expect(r.reason).toBe('Strong colour cast. Retake under different light.');
  });
  it('checks bright before dark before cast', () => {
    expect(validateLighting([255, 100, 150]).code).toBe('TOO_BRIGHT');
    expect(validateLighting([100, 200, 200]).code).toBe('TOO_DARK');
  });
  it('boundaries: 249 and 120 are ok, spread of exactly 40 is ok', () => {
    expect(validateLighting([249, 240, 240]).ok).toBe(true);
    expect(validateLighting([120, 125, 130]).ok).toBe(true);
    expect(validateLighting([200, 180, 160]).ok).toBe(true);
  });
});
