import { describe, expect, it } from 'vitest';
import { PATCH_UV, samplePatch, uvToRect } from './sample';

const makeImage = (w: number, h: number, fill: [number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([...fill, 255], i * 4);
  return { data, width: w, height: h };
};

describe('uvToRect', () => {
  it('scales fractions to pixels', () => {
    expect(uvToRect({ u: 0.14, v: 0.3, w: 0.22, h: 0.22 }, 1000, 600)).toEqual({ x: 140, y: 180, w: 220, h: 132 });
  });
});

describe('PATCH_UV', () => {
  it('keeps TRD §4 values and continues the reference row with a constant step', () => {
    expect(PATCH_UV.white).toEqual({ u: 0.14, v: 0.3, w: 0.22, h: 0.22 });
    expect(PATCH_UV.grey).toEqual({ u: 0.38, v: 0.3, w: 0.22, h: 0.22 });
    expect(PATCH_UV.reaction).toEqual({ u: 0.64, v: 0.28, w: 0.3, h: 0.4 });
    const row = [PATCH_UV.refA, PATCH_UV.refO, PATCH_UV.refB, PATCH_UV.refP, PATCH_UV.refK];
    expect(row[0]).toEqual({ u: 0.14, v: 0.62, w: 0.08, h: 0.18 });
    row.slice(1).forEach((p, i) => {
      expect(p.u - row[i].u).toBeCloseTo(0.1, 9);
      expect(p).toMatchObject({ v: 0.62, w: 0.08, h: 0.18 });
    });
  });
  it('every patch lies inside the frame', () => {
    for (const p of Object.values(PATCH_UV)) {
      expect(p.u + p.w).toBeLessThanOrEqual(1);
      expect(p.v + p.h).toBeLessThanOrEqual(1);
    }
  });
});

describe('samplePatch', () => {
  it('median ignores bright and dark specks', () => {
    const img = makeImage(50, 50, [120, 80, 40]);
    const specks = [[20, 20], [22, 25], [27, 21], [25, 25], [29, 29]];
    specks.forEach(([x, y], k) => img.data.set(k % 2 ? [255, 255, 255] : [0, 0, 0], (y * 50 + x) * 4));
    expect(samplePatch(img, { x: 10, y: 10, w: 30, h: 30 })).toEqual([120, 80, 40]);
  });
  it('samples only the inner 60% of the rect (edges ignored)', () => {
    const img = makeImage(20, 20, [255, 0, 0]);
    for (let y = 4; y < 16; y++) for (let x = 4; x < 16; x++) img.data.set([10, 20, 30, 255], (y * 20 + x) * 4);
    expect(samplePatch(img, { x: 0, y: 0, w: 20, h: 20 })).toEqual([10, 20, 30]);
  });
  it('accepts plain number arrays', () => {
    const img = makeImage(4, 4, [7, 8, 9]);
    expect(samplePatch({ ...img, data: Array.from(img.data) }, { x: 0, y: 0, w: 4, h: 4 })).toEqual([7, 8, 9]);
  });
  it('throws when the rect falls outside the image', () => {
    expect(() => samplePatch(makeImage(4, 4, [0, 0, 0]), { x: 10, y: 10, w: 4, h: 4 })).toThrow();
  });
});

describe('PATCH_UV geometry', () => {
  it('no two patches overlap', () => {
    const rects = Object.values(PATCH_UV);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const overlap = a.u < b.u + b.w && b.u < a.u + a.w && a.v < b.v + b.h && b.v < a.v + a.h;
        expect(overlap).toBe(false);
      }
  });
});
