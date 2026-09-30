import type { Reagent, TestRecord, VerdictKind } from '../seal/types';

/** ΔE always at two decimals minimum (DESIGN §8). */
export const fmtDE = (n: number) => n.toFixed(2);

export const REAGENTS: Record<Reagent, { name: string; targets: string }> = {
  marquis: { name: 'Marquis', targets: 'Opiates, amphetamines' },
  mecke: { name: 'Mecke', targets: 'Opiates' },
  scott: { name: 'Scott', targets: 'Cocaine' },
};

export const VERDICT_BG: Record<VerdictKind, string> = {
  POSITIVE: 'bg-verdict-positive',
  NEGATIVE: 'bg-verdict-negative',
  INCONCLUSIVE: 'bg-verdict-inconclusive',
};

export const VERDICT_TEXT: Record<VerdictKind, string> = {
  POSITIVE: 'text-verdict-positive',
  NEGATIVE: 'text-verdict-negative',
  INCONCLUSIVE: 'text-verdict-inconclusive',
};

export function fmtGps(gps: TestRecord['gps']): string {
  return gps ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)} ±${Math.round(gps.accuracy_m)} m` : 'GPS — unavailable';
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} UTC${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

export function relTime(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 172800) return 'Yesterday';
  return new Date(iso).toLocaleDateString();
}

/** Middle-truncated hash: a3f9…c21e */
export const shortHash = (h: string, n = 6) => (h.length > n * 2 + 1 ? `${h.slice(0, n)}…${h.slice(-n)}` : h);

/** Human verdict headline, e.g. "Opiates" for a positive. */
export function verdictSubject(r: Pick<TestRecord, 'verdict' | 'measurement'>): string {
  const top = r.measurement.candidates[0];
  if (r.verdict === 'POSITIVE' && top) return top.substance.charAt(0).toUpperCase() + top.substance.slice(1);
  if (r.verdict === 'NEGATIVE') return 'No reaction';
  return 'Refused to guess';
}
