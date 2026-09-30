import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listRecords, onQueueChange, type LocalRecord } from '../data/queue';
import { AppHeader, BottomNav, Card, Icon, Label, Page, VerdictChip } from '../components/ui';
import { fmtDE, REAGENTS, relTime } from '../lib/format';
import { useApp } from '../state';

export function useRecords(): LocalRecord[] | null {
  const [rows, setRows] = useState<LocalRecord[] | null>(null);
  useEffect(() => {
    const load = () => void listRecords().then(setRows);
    load();
    return onQueueChange(load);
  }, []);
  return rows;
}

export function RecordRow({ r }: { r: LocalRecord }) {
  const rec = r.record;
  return (
    <Link to={`/record/${rec.id}`} className="p-4 min-h-16 flex items-center justify-between gap-3 active:bg-surface-sunk">
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-evidentiary-md font-medium truncate">{rec.case_number}</span>
        <span className="text-body-sm text-ink-secondary">
          {REAGENTS[rec.reagent].name}
          <span className="font-mono text-evidentiary-sm text-ink-muted"> · ΔE {fmtDE(rec.measurement.candidates[0]?.delta_e ?? 0)}</span>
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <VerdictChip verdict={rec.verdict} />
        <span className="flex items-center gap-1 font-mono text-evidentiary-sm text-ink-muted">
          {r.sync_state !== 'synced' && <Icon name={r.sync_state === 'failed' ? 'cloud_sync' : 'cloud_queue'} className="text-[16px]" />}
          {relTime(rec.captured_at)}
        </span>
      </div>
    </Link>
  );
}

export function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="bg-surface rounded-xl shadow-sm divide-y divide-surface-container">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="p-4 flex justify-between animate-pulse">
          <div className="h-4 w-40 bg-surface-sunk rounded" />
          <div className="h-4 w-20 bg-surface-sunk rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { profile } = useApp();
  const rows = useRecords();
  const nav = useNavigate();
  const recent = rows?.slice(0, 5) ?? [];

  return (
    <>
      <AppHeader title="Saakshya" subtitle="Home" />
      <Page nav>
        <div className="flex flex-col">
          <Label>Officer</Label>
          <span className="font-mono text-evidentiary-lg font-semibold">{profile?.officer_id}</span>
        </div>

        <button
          type="button"
          onClick={() => nav('/new')}
          className="w-full text-left bg-marquis-purple text-white rounded-xl p-4 shadow-md active:scale-[0.99] transition relative overflow-hidden flex flex-col justify-between h-44"
        >
          <span className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10" aria-hidden />
          <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
            <Icon name="photo_camera" className="text-[28px]" />
          </span>
          <span>
            <span className="block font-headline text-headline-md">New test</span>
            <span className="block text-body-sm opacity-90">Photograph the strip on the reference card</span>
          </span>
        </button>

        <div className="flex items-center justify-between pt-2">
          <Label className="tracking-widest">Recent tests</Label>
          {rows && rows.length > 5 && (
            <Link to="/log" className="font-mono text-evidentiary-sm text-secondary min-h-12 flex items-center">
              All {rows.length} →
            </Link>
          )}
        </div>

        {rows === null ? (
          <SkeletonRows />
        ) : recent.length === 0 ? (
          <Card className="flex flex-col items-center text-center gap-3">
            <img src="/reference-card.svg" alt="" className="w-48 rounded border border-line" />
            <p className="text-body-md text-ink-secondary">No tests yet. Print the reference card before your first capture.</p>
            <a href="/reference-card.svg" target="_blank" rel="noopener" className="text-secondary font-medium min-h-12 flex items-center">
              Open reference card
            </a>
          </Card>
        ) : (
          <div className="bg-surface rounded-xl shadow-sm divide-y divide-surface-container overflow-hidden">
            {recent.map((r) => (
              <RecordRow key={r.record.id} r={r} />
            ))}
          </div>
        )}
      </Page>
      <BottomNav />
    </>
  );
}
