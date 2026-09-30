import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { checkLighting } from '../colour/analyse';
import type { LightingResult } from '../colour/whitebalance';
import { Icon } from '../components/ui';
import { canvasToPng, currentGps, grabGuideFrame, guideRect, openRearCamera, setTorch, torchSupported, vibrate } from '../lib/capture';
import { devTestCardCanvas } from '../lib/devcard';
import { useApp } from '../state';

const PILL: Record<LightingResult['code'], string> = {
  OK: 'LIGHTING OK',
  TOO_BRIGHT: 'TOO BRIGHT',
  TOO_DARK: 'TOO DARK',
  COLOUR_CAST: 'COLOUR CAST',
};
const POLL_MS = 250;

export default function Capture() {
  const { draft, setDraft } = useApp();
  const nav = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const probe = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [lighting, setLighting] = useState<LightingResult | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [torch, setTorchOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const gps = useRef<Promise<Awaited<ReturnType<typeof currentGps>>>>(currentGps());

  useEffect(() => {
    let s: MediaStream | null = null;
    openRearCamera()
      .then((st) => {
        s = st;
        setStream(st);
        if (video.current) video.current.srcObject = st;
      })
      .catch((e: unknown) => {
        const name = e instanceof DOMException ? e.name : '';
        setCamErr(
          name === 'NotAllowedError'
            ? 'Camera permission was refused. Allow camera access for this site in the browser settings, then reopen.'
            : 'No camera available. The camera needs HTTPS (or localhost) and a device with a camera.',
        );
      });
    return () => s?.getTracks().forEach((t) => t.stop());
  }, []);

  // Live lighting gate on the white patch inside the brackets.
  useEffect(() => {
    if (!stream) return;
    const id = window.setInterval(() => {
      const v = video.current;
      if (!v || !v.videoWidth) return;
      setDims((d) => (d && d.w === v.videoWidth && d.h === v.videoHeight ? d : { w: v.videoWidth, h: v.videoHeight }));
      setLighting(checkLighting(grabGuideFrame(v, probe.current, 320)).lighting);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [stream]);

  const finish = useCallback(
    async (canvas: HTMLCanvasElement) => {
      const captured_at = new Date().toISOString();
      const image = await canvasToPng(canvas);
      const previewUrl = URL.createObjectURL(new Blob([image as BlobPart], { type: 'image/png' }));
      vibrate(30);
      setDraft({ ...draft!, image, previewUrl, captured_at, gps: await gps.current, analysis: undefined, sealedId: undefined });
      nav('/review');
    },
    [draft, nav, setDraft],
  );

  const shoot = async () => {
    const v = video.current;
    if (!v || !lighting?.ok || busy) return;
    setBusy(true);
    try {
      const c = document.createElement('canvas');
      grabGuideFrame(v, c);
      await finish(c);
    } finally {
      setBusy(false);
    }
  };

  if (!draft) return <Navigate to="/new" replace />;

  const ok = lighting?.ok ?? false;
  const guide = dims ? guideRect(dims.w, dims.h) : null;
  const colour = ok ? 'text-guide-valid' : 'text-guide-invalid';
  const arm = guide ? Math.round(guide.w * 0.09) : 0;

  return (
    <div className="fixed inset-0 bg-viewfinder-black text-white flex flex-col pt-safe pb-safe select-none">
      <div className="flex items-center justify-between px-4 py-2 z-10">
        <button aria-label="Back" onClick={() => nav('/new')} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="arrow_back" className="text-[24px]" />
        </button>
        <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/70 font-mono text-evidentiary-sm tracking-widest ${colour}`} role="status" aria-live="polite">
          <Icon name={ok ? 'check_circle' : 'warning'} className="text-[16px]" />
          {lighting ? PILL[lighting.code] : camErr ? 'NO CAMERA' : 'STARTING…'}
        </div>
        {torchSupported(stream) ? (
          <button
            aria-label="Toggle torch"
            onClick={() => stream && void setTorch(stream, !torch).then(() => setTorchOn(!torch))}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Icon name={torch ? 'flashlight_off' : 'flashlight_on'} className="text-[22px]" />
          </button>
        ) : (
          <span className="w-12" />
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        <video ref={video} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-contain" />
        {dims && guide && (
          <svg viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="xMidYMid meet" className={`absolute inset-0 w-full h-full ${colour}`} aria-hidden>
            {[
              [guide.x, guide.y, 1, 1],
              [guide.x + guide.w, guide.y, -1, 1],
              [guide.x, guide.y + guide.h, 1, -1],
              [guide.x + guide.w, guide.y + guide.h, -1, -1],
            ].map(([x, y, sx, sy], i) => (
              <path
                key={i}
                d={`M${x + sx * arm},${y} H${x} V${y + sy * arm}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={Math.max(4, guide.w * 0.012)}
                strokeLinecap="square"
              />
            ))}
          </svg>
        )}
        {camErr && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="text-body-md text-white/90 max-w-sm">{camErr}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-5">
        <p className="text-body-md text-white/90 text-center">
          {lighting && !ok ? lighting.reason : 'Place the strip on the card. Fit the card inside the brackets.'}
        </p>
        <button
          aria-label="Capture"
          disabled={!ok || busy}
          onClick={() => void shoot()}
          className={`w-[72px] h-[72px] rounded-full border-4 flex items-center justify-center transition ${ok ? 'border-white' : 'border-white/30'}`}
        >
          <span className={`w-14 h-14 rounded-full ${ok ? 'bg-white' : 'bg-white/20'}`} />
        </button>
        {import.meta.env.DEV && (
          <button
            onClick={() => void devTestCardCanvas('#7B34A6').then(finish)}
            className="font-mono text-evidentiary-sm text-guide-invalid underline min-h-12"
          >
            DEV: use synthetic test card (purple strip)
          </button>
        )}
      </div>
    </div>
  );
}
