import type { Lab, LinearRGB, RGB } from './types';

/** D65 reference white, 2° observer. */
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

/** CIE f(t) constants: δ = 6/29. */
const DELTA = 6 / 29;

/** sRGB companding: gamma-encoded channel (0–1) → linear light (0–1). */
export const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** Inverse sRGB companding: linear light (0–1) → gamma-encoded channel (0–1). */
export const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

const f = (t: number): number =>
  t > DELTA ** 3 ? Math.cbrt(t) : t / (3 * DELTA * DELTA) + 4 / 29;

/** Linear sRGB (0–1) → Lab via the standard sRGB → XYZ matrix. */
export const linearRgbToLab = ([r, g, b]: LinearRGB): Lab => {
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = f(x / XN);
  const fy = f(y / YN);
  const fz = f(z / ZN);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

/** Gamma-encoded sRGB (0–255) → Lab. */
export const rgbToLab = (rgb: RGB): Lab => {
  const [r, g, b] = rgb.map((c) => srgbToLinear(c / 255));
  return linearRgbToLab([r, g, b]);
};

/** Parse `#RRGGBB` or `RRGGBB`. */
export const hexToRgb = (hex: string): RGB => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex colour: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};
