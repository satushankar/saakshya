import { PATCH_UV, uvToRect } from '../colour/sample';

const W = 1000;
const H = 600;
/** Simulated exposure: printed white photographs a little below full scale. */
const EXPOSURE = 'rgb(232,230,228)';

/**
 * DEV ONLY. Renders the reference card with a strip colour painted in the reaction
 * area, as a camera would roughly see it, so the pipeline can be exercised on a
 * desktop with no camera. Never shipped in production builds (guarded by import.meta.env.DEV).
 */
export async function devTestCardCanvas(stripHex: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = '/reference-card.svg';
  await img.decode();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, W, H);
  const r = uvToRect(PATCH_UV.reaction, W, H);
  ctx.fillStyle = stripHex;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = EXPOSURE;
  ctx.fillRect(0, 0, W, H);
  return c;
}
