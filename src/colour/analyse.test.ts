import { describe, expect, it } from 'vitest';
import { analyseCard } from './analyse';
import { REFERENCE_SWATCHES, referenceTable } from './reference';
import { PATCH_UV, uvToRect } from './sample';
import { hexToRgb } from './srgb';
import type { RGB } from './types';

const W = 500;
const H = 300;

/** Synthetic photo of the card: paper white everywhere, patches painted, optional per-channel cast. */
function card(reaction: RGB, cast: RGB = [1, 1, 1], white: RGB = [240, 240, 240]) {
  const data = new Uint8ClampedArray(W * H * 4);
  const paint = (x0: number, y0: number, w: number, h: number, c: RGB) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * W + x) * 4;
        data[i] = c[0] * cast[0];
        data[i + 1] = c[1] * cast[1];
        data[i + 2] = c[2] * cast[2];
        data[i + 3] = 255;
      }
  };
  paint(0, 0, W, H, white);
  const scale = (c: RGB): RGB => c.map((v, i) => (v * white[i]) / 255) as RGB;
  const r = (uv: (typeof PATCH_UV)[keyof typeof PATCH_UV]) => uvToRect(uv, W, H);
  const g = r(PATCH_UV.grey);
  paint(g.x, g.y, g.w, g.h, scale([154, 154, 154]));
  const re = r(PATCH_UV.reaction);
  paint(re.x, re.y, re.w, re.h, scale(reaction));
  return { data, width: W, height: H };
}

describe('analyseCard', () => {
  it('purple reaction under neutral light is POSITIVE for opiates', () => {
    const res = analyseCard(card(hexToRgb('#7B34A6')), referenceTable());
    expect(res.lighting.ok).toBe(true);
    expect(res.result?.verdict.verdict).toBe('POSITIVE');
    expect(res.result?.verdict.nearest.key).toBe('marquis-purple');
  });

  it('the same purple under a warm cast still classifies as opiates after white balance', () => {
    const res = analyseCard(card(hexToRgb('#7B34A6'), [1, 0.93, 0.85]), referenceTable());
    expect(res.lighting.ok).toBe(true);
    expect(res.result?.verdict.nearest.key).toBe('marquis-purple');
    expect(res.result?.verdict.verdict).toBe('POSITIVE');
  });

  it('refuses a clipped capture instead of guessing', () => {
    const res = analyseCard(card(hexToRgb('#7B34A6'), [1, 1, 1], [253, 253, 253]), referenceTable());
    expect(res.lighting.code).toBe('TOO_BRIGHT');
    expect(res.result).toBeNull();
  });

  it('refuses a near-dark capture', () => {
    const res = analyseCard(card(hexToRgb('#7B34A6'), [1, 1, 1], [90, 90, 90]), referenceTable());
    expect(res.lighting.code).toBe('TOO_DARK');
    expect(res.result).toBeNull();
  });

  it('every reference swatch classifies as itself', () => {
    for (const s of REFERENCE_SWATCHES) {
      const res = analyseCard(card(hexToRgb(s.hex)), referenceTable());
      expect(res.result?.verdict.nearest.key).toBe(s.key);
    }
  });

  it('reports measurement fields needed for the sealed record', () => {
    const res = analyseCard(card(hexToRgb('#2D6CB8')), referenceTable());
    expect(res.result?.white_rgb).toHaveLength(3);
    expect(res.result?.grey_rgb).toHaveLength(3);
    expect(res.result?.gains).toHaveLength(3);
    expect(res.result?.reaction_lab).toHaveLength(3);
    expect(res.result?.reaction_rgb).toHaveLength(3);
    expect(typeof res.result?.greyOk).toBe('boolean');
  });
});
