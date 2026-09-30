import type { RGB } from './types';

export interface UV {
  u: number;
  v: number;
  w: number;
  h: number;
}

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageLike {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

/**
 * Patch positions as fractions of the alignment rectangle, i.e. of the
 * 100 × 60 mm card (TRD §3, §4). u/w are fractions of 100 mm, v/h of 60 mm.
 * Rects are inset from the printed patch edges. The reference row continues
 * from refA at a 10 mm pitch, 8 mm sample width, so refK ends before the reaction area.
 */
const REF_ROW = { v: 0.62, w: 0.08, h: 0.18 } as const;
const REF_PITCH = 0.1;
const refAt = (i: number): UV => ({ u: Math.round((0.14 + i * REF_PITCH) * 100) / 100, ...REF_ROW });

export const PATCH_UV = {
  white: { u: 0.14, v: 0.3, w: 0.22, h: 0.22 },
  grey: { u: 0.38, v: 0.3, w: 0.22, h: 0.22 },
  reaction: { u: 0.64, v: 0.28, w: 0.3, h: 0.4 },
  refA: refAt(0),
  refO: refAt(1),
  refB: refAt(2),
  refP: refAt(3),
  refK: refAt(4),
} as const satisfies Record<string, UV>;

export type PatchName = keyof typeof PATCH_UV;

/** Fraction of each side that is sampled; the outer 20% on every edge is ignored. */
const INNER_FRACTION = 0.6;

/** Convert a UV rect to integer pixel coordinates within a frame. */
export const uvToRect = (uv: UV, frameW: number, frameH: number): PixelRect => ({
  x: Math.round(uv.u * frameW),
  y: Math.round(uv.v * frameH),
  w: Math.round(uv.w * frameW),
  h: Math.round(uv.h * frameH),
});

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Per-channel median of the central 60% of `rect`. Median, not mean: it
 * resists specular highlights, dust specks and paper texture (TRD §5.1).
 */
export const samplePatch = (img: ImageLike, rect: PixelRect): RGB => {
  const inset = (1 - INNER_FRACTION) / 2;
  const x0 = Math.max(0, Math.round(rect.x + rect.w * inset));
  const y0 = Math.max(0, Math.round(rect.y + rect.h * inset));
  const x1 = Math.min(img.width, Math.round(rect.x + rect.w * (1 - inset)));
  const y1 = Math.min(img.height, Math.round(rect.y + rect.h * (1 - inset)));
  if (x1 <= x0 || y1 <= y0) throw new Error('Sample rect lies outside the image');

  const ch: [number[], number[], number[]] = [[], [], []];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      ch[0].push(img.data[i]);
      ch[1].push(img.data[i + 1]);
      ch[2].push(img.data[i + 2]);
    }
  }
  return [median(ch[0]), median(ch[1]), median(ch[2])];
};
