import { useRef, useState } from 'react';
import type { CheckResult } from '../seal/verify';
import type { TestRecord } from '../seal/types';
import { fmtDE, shortHash } from '../lib/format';
import { Icon } from './ui';

/** Monospace, middle-truncated. Tap to reveal in full, long-press to copy. */
export function HashText({ value, label }: { value: string; label?: string }) {
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    timer.current = window.setTimeout(() => {
      void navigator.clipboard?.writeText(value).then(() => setCopied(true));
    }, 550);
  };
  const stop = () => window.clearTimeout(timer.current);
  return (
    <button
      type="button"
      onClick={() => setFull((f) => !f)}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      className="w-full text-left bg-surface-sunk rounded-lg px-3 py-2.5 min-h-12 flex flex-col gap-0.5"
    >
      {label && <span className="text-label-micro uppercase text-ink-muted">{label}</span>}
      <span className="font-mono text-evidentiary-md text-ink break-all">{full ? value : shortHash(value, 8)}</span>
      {copied && <span className="text-label-micro uppercase text-verdict-negative">Copied</span>}
    </button>
  );
}

/** Vertical stack of linked blocks, oldest at the top, current highlighted. */
export function ChainView({ chain, currentId }: { chain: TestRecord[]; currentId: string }) {
  const idx = chain.findIndex((r) => r.id === currentId);
  const slice = chain.slice(Math.max(0, idx - 2), idx + 1);
  const first = slice[0];
  return (
    <ol className="flex flex-col">
      {first && first.prev_hash === '0'.repeat(64) && (
        <li className="font-mono text-evidentiary-sm text-ink-muted pl-4 pb-2">GENESIS 0000…0000</li>
      )}
      {slice.map((r, i) => {
        const current = r.id === currentId;
        return (
          <li key={r.id} className="flex flex-col">
            {(i > 0 || first?.prev_hash === '0'.repeat(64)) && <span className="ml-6 w-px h-4 bg-line-strong" aria-hidden />}
            <div className={`rounded-lg px-3 py-2.5 border ${current ? 'border-primary bg-primary/5' : 'border-line bg-surface'}`}>
              <div className="flex justify-between gap-2">
                <span className="font-mono text-evidentiary-sm text-ink-secondary truncate">{r.case_number}</span>
                {current && <span className="text-label-micro uppercase text-primary">This record</span>}
              </div>
              <div className="font-mono text-evidentiary-md text-ink">{shortHash(r.record_hash, 6)}</div>
              <div className="font-mono text-evidentiary-sm text-ink-muted">prev {shortHash(r.prev_hash, 4)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One verification check. Red appears only when an integrity check fails (R8). */
export function CheckRow({ check, index }: { check: CheckResult; index: number }) {
  return (
    <article className="check-in bg-surface rounded-xl p-4 shadow-sm flex items-start gap-3" style={{ animationDelay: `${index * 350}ms` }}>
      <div
        className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${check.ok ? 'bg-verdict-negative/10 text-verdict-negative' : 'bg-tamper-critical/10 text-tamper-critical'}`}
      >
        <Icon name={check.ok ? 'check_circle' : 'cancel'} fill className="text-[22px]" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-md font-medium">
            {index + 1}. {check.name}
          </span>
          <span className={`px-2 py-0.5 rounded text-white text-label-micro uppercase ${check.ok ? 'bg-verdict-negative' : 'bg-tamper-critical'}`}>
            {check.ok ? 'Pass' : 'Fail'}
          </span>
        </div>
        <p className={`text-body-sm mt-0.5 ${check.ok ? 'text-ink-muted' : 'text-ink'}`}>{check.detail}</p>
      </div>
    </article>
  );
}

const rgbCss = (rgb: [number, number, number]) => `rgb(${rgb.join(',')})`;

/** Measured reaction beside matched reference, ΔE between them, with the threshold. */
export function SwatchCompare(props: {
  measured: [number, number, number];
  reference: { hex: string; name: string };
  deltaE: number;
  tReject: number;
}) {
  const { measured, reference, deltaE, tReject } = props;
  return (
    <div className="bg-surface-sunk rounded-xl p-4 flex items-center justify-between gap-2">
      <figure className="flex flex-col items-center flex-1 gap-2">
        <div className="w-22 h-22 rounded-xl shadow-md border border-line" style={{ background: rgbCss(measured) }} />
        <figcaption className="flex flex-col items-center">
          <span className="text-label-micro uppercase">Measured</span>
          <span className="font-mono text-evidentiary-sm text-ink-muted">RGB {measured.join(', ')}</span>
        </figcaption>
      </figure>
      <div className="bg-surface px-3 py-2 rounded-xl shadow-sm flex flex-col items-center shrink-0">
        <span className="font-mono text-evidentiary-lg font-bold">ΔE {fmtDE(deltaE)}</span>
        <span className="font-mono text-evidentiary-sm text-ink-muted">limit {fmtDE(tReject)}</span>
      </div>
      <figure className="flex flex-col items-center flex-1 gap-2">
        <div className="w-22 h-22 rounded-xl shadow-md border border-line" style={{ background: reference.hex }} />
        <figcaption className="flex flex-col items-center text-center">
          <span className="text-label-micro uppercase">Reference</span>
          <span className="font-mono text-evidentiary-sm text-ink-muted">{reference.name}</span>
        </figcaption>
      </figure>
    </div>
  );
}

export function CandidateRow({ hex, name, substance, deltaE }: { hex: string; name: string; substance: string; deltaE: number }) {
  return (
    <div className="bg-surface-sunk rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-lg shrink-0 border border-line" style={{ background: hex }} />
        <div className="flex flex-col min-w-0">
          <span className="text-body-md font-medium truncate">{substance}</span>
          <span className="font-mono text-evidentiary-sm text-ink-muted truncate">{name}</span>
        </div>
      </div>
      <span className="font-mono text-evidentiary-lg shrink-0">ΔE {fmtDE(deltaE)}</span>
    </div>
  );
}
