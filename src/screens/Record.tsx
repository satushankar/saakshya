import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChainView, HashText } from '../components/evidence';
import { ActionBar, AppHeader, Card, Icon, Label, MetaGrid, Page, PrimaryButton, SecondaryButton, VerdictChip } from '../components/ui';
import { devTamper, localChain } from '../data/evidence';
import { drainQueue } from '../data/sync';
import { getLocalRecord, onQueueChange, type LocalRecord } from '../data/queue';
import { fmtDE, fmtGps, fmtTime, REAGENTS, verdictSubject } from '../lib/format';
import type { TestRecord } from '../seal/types';
import { SkeletonRows } from './Home';

export default function Record() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [row, setRow] = useState<LocalRecord | null | undefined>(undefined);
  const [chain, setChain] = useState<TestRecord[]>([]);
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState(false);

  useEffect(() => {
    const load = async () => {
      const r = await getLocalRecord(id);
      setRow(r);
      if (r) setChain(await localChain(r.record.device_id));
    };
    void load();
    return onQueueChange(() => void load());
  }, [id]);

  if (row === undefined)
    return (
      <>
        <AppHeader title="Record" back="/" />
        <Page>
          <SkeletonRows n={4} />
        </Page>
      </>
    );
  if (row === null)
    return (
      <>
        <AppHeader title="Record" back="/log" />
        <Page>
          <Card>This record is not stored on this device.</Card>
        </Page>
      </>
    );

  const r = row.record;
  const sealedNow = params.get('sealed') === '1';
  const top = r.measurement.candidates[0];

  return (
    <>
      <AppHeader title={sealedNow ? 'Sealed' : 'Record'} subtitle={r.case_number} back="/" />
      <Page>
        <Card className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="lock" fill className="text-[26px]" />
          </span>
          <div className="flex flex-col flex-1">
            <span className="font-headline text-headline-sm">Record sealed</span>
            <span className="text-body-sm text-ink-muted">Hashed, chained and signed on this device at capture.</span>
          </div>
          <VerdictChip verdict={r.verdict} />
        </Card>

        <button
          type="button"
          onClick={() => setSyncInfo((s) => !s)}
          className="flex items-center gap-2 text-body-sm text-ink-secondary min-h-12 text-left"
        >
          <Icon name={row.sync_state === 'synced' ? 'cloud_done' : row.sync_state === 'failed' ? 'cloud_sync' : 'cloud_queue'} className="text-[20px]" />
          {row.sync_state === 'synced' ? 'Synced to cloud, unchanged.' : row.sync_state === 'failed' ? 'Sync failed. Tap for details.' : 'Queued. Uploads when online.'}
        </button>
        {syncInfo && row.sync_state === 'failed' && (
          <Card className="flex flex-col gap-2">
            <p className="font-mono text-evidentiary-sm break-all">{row.sync_error}</p>
            <SecondaryButton icon="sync" onClick={() => void drainQueue()}>
              Retry sync
            </SecondaryButton>
          </Card>
        )}

        <Card>
          <MetaGrid
            rows={[
              ['Verdict', `${r.verdict} · ${verdictSubject(r)}`],
              ['Reason', r.verdict_reason],
              ['ΔE', top ? `${fmtDE(top.delta_e)} (limit ${fmtDE(r.measurement.thresholds.t_reject)})` : '—'],
              ['Officer', r.officer_decision === 'OVERRIDDEN' ? `OVERRIDDEN — ${r.officer_note}` : (r.officer_decision ?? '—')],
              ['Reagent', REAGENTS[r.reagent].name],
              ['Operator', r.operator_id],
              ['Device', r.device_id],
              ['Time', fmtTime(r.captured_at)],
              ['GPS', fmtGps(r.gps)],
            ]}
          />
        </Card>

        <div className="flex flex-col gap-2">
          <Label>Hashes · tap to reveal, hold to copy</Label>
          <HashText label="Image SHA-256" value={r.image_sha256} />
          <HashText label="Record hash" value={r.record_hash} />
        </div>

        <Card className="flex flex-col gap-3">
          <Label>Device chain</Label>
          <ChainView chain={chain} currentId={r.id} />
        </Card>

        {import.meta.env.DEV && (
          <Card className="border border-dashed border-tamper-critical/60 flex flex-col gap-2">
            <span className="font-mono text-evidentiary-sm uppercase text-tamper-critical">Demo tool · dev builds only</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="h-12 rounded-lg border border-tamper-critical text-tamper-critical text-body-sm font-medium"
                onClick={() => void devTamper.image(r.id).then(() => setDevMsg('One byte of the stored image flipped.'))}
              >
                Tamper image (dev)
              </button>
              <button
                className="h-12 rounded-lg border border-tamper-critical text-tamper-critical text-body-sm font-medium"
                onClick={() => void devTamper.payload(r.id).then(() => setDevMsg('Case number edited in the stored record.'))}
              >
                Tamper payload (dev)
              </button>
            </div>
            {devMsg && <p className="text-body-sm text-ink-secondary">{devMsg}</p>}
          </Card>
        )}

        <ActionBar>
          <PrimaryButton icon="verified_user" onClick={() => nav(`/verify/${r.id}`)}>
            Verify this record
          </PrimaryButton>
          <SecondaryButton icon="home" onClick={() => nav('/')}>
            Back to home
          </SecondaryButton>
        </ActionBar>
      </Page>
    </>
  );
}
