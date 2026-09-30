import { srgbToLinear } from './srgb';
import type { LinearRGB, RGB } from './types';

/**
 * The value the card's white patch should read after balancing. Defaults to
 * ideal white; replace with the printed card's measured white if known.
 */
export const TARGET_WHITE: RGB = [255, 255, 255];

const lin = (c: number): number => srgbToLinear(c / 255);
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Per-channel linear-space gain: lin(target) / lin(measured white). TRD §5.3. */
export const computeGains = (white: RGB, target: RGB = TARGET_WHITE): LinearRGB => {
  const [r, g, b] = white.map((c, i) => {
    const w = lin(c);
    if (!(w > 0)) throw new Error('White patch channel is zero; cannot compute gain');
    return lin(target[i]) / w;
  });
  return [r, g, b];
};

/** Linearise, apply gains, clamp to 0..1. Returns linear RGB. */
export const applyGains = (rgb: RGB, gains: LinearRGB): LinearRGB => {
  const [r, g, b] = rgb.map((c, i) => clamp01(lin(c) * gains[i]));
  return [r, g, b];
};

/** After balancing, the grey patch should be neutral: max − min channel ≤ tolerance. */
export const greyCheck = (greyBalancedLinear: LinearRGB, tolerance: number): { ok: boolean; spread: number } => {
  const spread = Math.max(...greyBalancedLinear) - Math.min(...greyBalancedLinear);
  return { ok: spread <= tolerance, spread };
};

export type LightingCode = 'OK' | 'TOO_BRIGHT' | 'TOO_DARK' | 'COLOUR_CAST';
export interface LightingResult {
  ok: boolean;
  code: LightingCode;
  reason?: string;
}

const CLIP_LEVEL = 250;
const DARK_LEVEL = 120;
const MAX_CAST_SPREAD = 40;

/** Lighting validity gate on the raw white patch. TRD §5.2; checked in order. */
export const validateLighting = (white: RGB): LightingResult => {
  const hi = Math.max(...white);
  const lo = Math.min(...white);
  if (hi >= CLIP_LEVEL)
    return { ok: false, code: 'TOO_BRIGHT', reason: 'Too bright — the white patch is clipped. Move into shade and retake.' };
  if (lo < DARK_LEVEL)
    return { ok: false, code: 'TOO_DARK', reason: 'Too dark — move into better light and retake.' };
  if (hi - lo > MAX_CAST_SPREAD)
    return { ok: false, code: 'COLOUR_CAST', reason: 'Strong colour cast. Retake under different light.' };
  return { ok: true, code: 'OK' };
};
