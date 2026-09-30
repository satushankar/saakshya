import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listRecords, onQueueChange } from '../data/queue';
import type { VerdictKind } from '../seal/types';
import { VERDICT_BG } from '../lib/format';

export const Icon = ({ name, className = '', fill = false }: { name: string; className?: string; fill?: boolean }) => (
  <span aria-hidden className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}>
    {name}
  </span>
);

/** Count of records not yet synced. Live. */
export function useQueuedCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const load = () => void listRecords().then((rs) => setN(rs.filter((r) => r.sync_state !== 'synced').length));
    load();
    return onQueueChange(load);
  }, []);
  return n;
}

export function OfflineBadge() {
  const queued = useQueuedCount();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (!queued && online) return null;
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded bg-surface-sunk text-ink-secondary font-mono text-evidentiary-sm">
      <Icon name={online ? 'cloud_upload' : 'cloud_off'} className="text-[16px]" />
      {queued ? `${queued} QUEUED` : 'OFFLINE'}
    </span>
  );
}

export function AppHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: boolean | string }) {
  const nav = useNavigate();
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] pt-safe">
      <div className="h-16 max-w-xl mx-auto px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {back ? (
            <button
              aria-label="Back"
              className="w-12 h-12 -ml-2 flex items-center justify-center text-ink rounded active:bg-surface-sunk"
              onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            >
              <Icon name="arrow_back" className="text-[24px]" />
            </button>
          ) : (
            <img src="/emblem.jpg" alt="" className="h-8 w-auto rounded-sm" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-headline text-headline-sm uppercase tracking-tight font-bold truncate leading-none">{title}</span>
            {subtitle && <span className="font-mono text-evidentiary-sm text-ink-muted leading-none mt-1 truncate">{subtitle}</span>}
          </div>
        </div>
        <OfflineBadge />
      </div>
    </header>
  );
}

/** Screen body under the fixed header. */
export const Page = ({ children, nav = false }: { children: ReactNode; nav?: boolean }) => (
  <main className={`max-w-xl mx-auto w-full pt-20 ${nav ? 'pb-24' : 'pb-6'} px-4 flex flex-col gap-4 min-h-dvh`}>{children}</main>
);

/** Bottom-anchored full-width action area. One primary per screen. */
export const ActionBar = ({ children }: { children: ReactNode }) => (
  <div className="sticky bottom-0 -mx-4 mt-auto bg-ground/95 backdrop-blur-md px-4 pt-3 pb-4 pb-safe flex flex-col gap-2 z-30">
    {children}
  </div>
);

type BtnProps = { children: ReactNode; onClick?: () => void; disabled?: boolean; icon?: string; className?: string; type?: 'button' | 'submit' };

export const PrimaryButton = ({ children, onClick, disabled, icon, className = 'bg-primary', type = 'button' }: BtnProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`w-full h-14 rounded-xl ${className} text-white font-body text-body-md font-medium flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition disabled:opacity-40`}
  >
    {icon && <Icon name={icon} className="text-[22px]" />}
    {children}
  </button>
);

export const SecondaryButton = ({ children, onClick, disabled, icon, type = 'button' }: BtnProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="w-full h-14 rounded-xl bg-surface text-ink border border-line-strong font-body text-body-md font-medium flex items-center justify-center gap-2 active:bg-surface-sunk transition disabled:opacity-40"
  >
    {icon && <Icon name={icon} className="text-[22px]" />}
    {children}
  </button>
);

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`bg-surface rounded-xl shadow-sm p-4 ${className}`}>{children}</section>
);

export const Label = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`font-body text-label-caps uppercase text-ink-muted ${className}`}>{children}</span>
);

export const VerdictChip = ({ verdict }: { verdict: VerdictKind }) => (
  <span className={`px-2 py-0.5 rounded text-white ${VERDICT_BG[verdict]} text-label-micro uppercase`}>{verdict}</span>
);

/** Two-column label/value grid. Values always monospace. */
export const MetaGrid = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
    {rows.map(([k, v]) => (
      <div key={k} className="contents">
        <dt className="text-label-caps uppercase text-ink-muted pt-0.5">{k}</dt>
        <dd className="font-mono text-evidentiary-md text-ink [overflow-wrap:anywhere] text-right">{v}</dd>
      </div>
    ))}
  </dl>
);

export function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    ['/', 'home', 'Home'],
    ['/log', 'receipt_long', 'Log'],
    ['/settings', 'settings', 'Settings'],
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-safe">
      <div className="max-w-xl mx-auto grid grid-cols-3">
        {items.map(([to, icon, label]) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} className={`h-16 flex flex-col items-center justify-center gap-0.5 ${active ? 'text-primary' : 'text-ink-muted'}`}>
              <Icon name={icon} fill={active} className="text-[24px]" />
              <span className="text-label-micro uppercase">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Honest prototype notice (rule R10). */
export const PrototypeNotice = () => (
  <p className="text-body-sm text-ink-muted leading-snug">
    Prototype. Presumptive field result only; does not replace laboratory confirmatory testing. Reference colours are
    design-grade representations of documented reactions, not spectrophotometric measurements.
  </p>
);
