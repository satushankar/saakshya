import type { ImageLike } from '../colour/sample';

/** Card aspect 100:60. Guide occupies this fraction of the frame on its limiting side. */
export const CARD_ASPECT = 100 / 60;
const GUIDE_FILL = 0.82;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Alignment rectangle in video pixel coordinates, centred, 100:60. */
export function guideRect(videoW: number, videoH: number): Rect {
  let w = videoW * GUIDE_FILL;
  let h = w / CARD_ASPECT;
  if (h > videoH * GUIDE_FILL) {
    h = videoH * GUIDE_FILL;
    w = h * CARD_ASPECT;
  }
  return { x: Math.round((videoW - w) / 2), y: Math.round((videoH - h) / 2), w: Math.round(w), h: Math.round(h) };
}

/** Pixels of the alignment rect from the current video frame. */
export function grabGuideFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxW = 0): ImageData {
  const r = guideRect(video.videoWidth, video.videoHeight);
  const scale = maxW > 0 && r.w > maxW ? maxW / r.w : 1;
  canvas.width = Math.round(r.w * scale);
  canvas.height = Math.round(r.h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Encode a canvas as PNG bytes. PNG decodes identically everywhere, so the sealed file is re-analysable. */
export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Could not encode capture');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Decode sealed image bytes back to pixels, so analysis runs on exactly the evidence file. */
export async function decodeImage(bytes: Uint8Array): Promise<ImageLike> {
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/png' }), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, c.width, c.height);
}

export async function openRearCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  const track = stream.getVideoTracks()[0];
  // Ask for fixed white balance where supported; the card correction handles the rest.
  const caps = (track.getCapabilities?.() ?? {}) as { whiteBalanceMode?: string[] };
  if (caps.whiteBalanceMode?.includes('manual')) {
    await track.applyConstraints({ advanced: [{ whiteBalanceMode: 'manual' } as MediaTrackConstraintSet] }).catch(() => undefined);
  }
  return stream;
}

export function torchSupported(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  return Boolean((track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch);
}

export async function setTorch(stream: MediaStream, on: boolean): Promise<void> {
  await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
}

export function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

/** Current GPS fix, or null. Never a fabricated coordinate (rule R7). */
export function currentGps(timeoutMs = 8000): Promise<{ lat: number; lon: number; accuracy_m: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy_m: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
