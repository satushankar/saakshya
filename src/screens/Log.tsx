import { useMemo, useState } from 'react';
import { AppHeader, BottomNav, Card, Icon, Page } from '../components/ui';
import { REAGENTS } from '../lib/format';
import type { Reagent, VerdictKind } from '../seal/types';
import { RecordRow, SkeletonRows, useRecords } from './Home';

type DateRange = 'all' | 'today' | '7d';
type SyncFilter = 'all' | 'queued' | 'synced';

function Chip<T extends string>({ value, current, set, label }: { value: T; current: T; set: (v: T) => void; label: string }) {
  const on = value === current;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(on ? ('all' as T) : value)}
      className={`h-10 px-3 rounded-full text-body-sm whitespace-nowrap border ${on ? 'bg-ink text-white border-ink' : 'bg-surface border-line-strong text-ink-secondary'}`}
    >
      {label}
    </button>
  );
}

export default function Log() {
  const rows = useRecords();
  const [q, setQ] = useState('');
  const [reagent, setReagent] = useState<Reagent | 'all'>('all');
  const [verdict, setVerdict] = useState<VerdictKind | 'all'>('all');
  const [range, setRange] = useState<DateRange>('all');
  const [sync, setSync] = useState<SyncFilter>('all');

  const filtered = useMemo(() => {
    if (!rows) return null;
    const needle = q.trim().toUpperCase();
    const now = Date.now();
    const minTs = range === 'today' ? new Date().setHours(0, 0, 0, 0) : range === '7d' ? now - 7 * 86400_000 : 0;
    return rows.filter(({ record: r, sync_state }) => {
      if (needle && !r.case_number.toUpperCase().includes(needle) && !r.operator_id.toUpperCase().includes(needle)) return false;
      if (reagent !== 'all' && r.reagent !== reagent) return false;
      if (verdict !== 'all' && r.verdict !== verdict) return false;
      if (new Date(r.captured_at).getTime() < minTs) return false;
      if (sync === 'queued' && sync_state === 'synced') return false;
      if (sync === 'synced' && sync_state !== 'synced') return false;
      return true;
    });
  }, [rows, q, reagent, verdict, range, sync]);

  return (
    <>
      <AppHeader title="Test log" subtitle={rows ? `${rows.length} record${rows.length === 1 ? "" : "s"} on this device` : 'Loading'} />
      <Page nav>
        <div className="sticky top-16 z-20 -mx-4 px-4 pt-2 pb-2 bg-ground flex flex-col gap-2">
          <label className="flex items-center h-14 px-4 rounded-xl bg-surface-sunk focus-within:ring-2 focus-within:ring-primary/30">
            <Icon name="search" className="text-ink-muted mr-2 text-[22px]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Case number or officer"
              className="bg-transparent outline-none w-full font-mono text-evidentiary-md"
              type="search"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REAGENTS) as Reagent[]).map((k) => (
              <Chip key={k} value={k} current={reagent} set={setReagent} label={REAGENTS[k].name} />
            ))}
            {(['POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'] as VerdictKind[]).map((v) => (
              <Chip key={v} value={v} current={verdict} set={setVerdict} label={v.charAt(0) + v.slice(1).toLowerCase()} />
            ))}
            <Chip value="today" current={range} set={setRange} label="Today" />
            <Chip value="7d" current={range} set={setRange} label="7 days" />
            <Chip value="queued" current={sync} set={setSync} label="Queued" />
            <Chip value="synced" current={sync} set={setSync} label="Synced" />
          </div>
        </div>

        {filtered === null ? (
          <SkeletonRows n={5} />
        ) : rows && rows.length === 0 ? (
          <Card className="text-center text-body-md text-ink-secondary">No tests recorded on this device yet.</Card>
        ) : filtered.length === 0 ? (
          <Card className="text-center text-body-md text-ink-secondary">No records match. Try the case number without its prefix.</Card>
        ) : (
          <div className="bg-surface rounded-xl shadow-sm divide-y divide-surface-container overflow-hidden">
            {filtered.map((r) => (
              <RecordRow key={r.record.id} r={r} />
            ))}
          </div>
        )}
      </Page>
      <BottomNav />
    </>
  );
}
