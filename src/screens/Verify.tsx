import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckRow } from '../components/evidence';
import { ActionBar, AppHeader, Card, Icon, Page, PrimaryButton, SecondaryButton } from '../components/ui';
import { verifyFrom, type Source, type VerifyOutcome } from '../data/evidence';
import { supabase } from '../data/supabase';
import { SkeletonRows } from './Home';

const STAGGER_MS = 350;

export default function Verify() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [source, setSource] = useState<Source>('device');
  const [out, setOut] = useState<VerifyOutcome | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setOut(null);
    setErr(null);
    setRevealed(false);
    let cancelled = false;
    verifyFrom(id, source)
      .then((o) => {
        if (cancelled) return;
        setOut(o);
        window.setTimeout(() => !cancelled && setRevealed(true), STAGGER_MS * 4);
      })
      .catch((e: unknown) => !cancelled && setErr(e instanceof Error ? e.message : 'Verification could not run.'));
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  const failed = out?.checks.filter((c) => !c.ok) ?? [];

  return (
    <>
      <AppHeader title="Verification" subtitle={out?.record.case_number ?? id.slice(0, 8)} back={`/record/${id}`} />
      <Page>
        {supabase && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-sunk rounded-xl" role="tablist">
            {(['device', 'cloud'] as Source[]).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={source === s}
                onClick={() => setSource(s)}
                className={`h-12 rounded-lg text-body-sm font-medium ${source === s ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted'}`}
              >
                {s === 'device' ? 'Copy on this device' : 'Copy in cloud'}
              </button>
            ))}
          </div>
        )}

        {revealed && out && (
          failed.length === 0 ? (
            <section className="check-in bg-verdict-negative text-white rounded-xl p-4 shadow-md flex items-center gap-3" role="status">
              <Icon name="verified_user" fill className="text-[28px]" />
              <div>
                <h1 className="font-headline text-headline-sm">Record intact</h1>
                <p className="text-body-sm opacity-95">All four independent checks passed.</p>
              </div>
            </section>
          ) : (
            <section className="check-in bg-tamper-critical text-white rounded-xl p-4 shadow-md flex items-start gap-3" role="alert">
              <Icon name="gpp_maybe" fill className="text-[28px]" />
              <div className="flex flex-col gap-1">
                <h1 className="font-headline text-headline-sm">Integrity check failed</h1>
                {failed.map((c) => (
                  <p key={c.id} className="text-body-sm">{c.detail}</p>
                ))}
              </div>
            </section>
          )
        )}

        {err && <Card>{err}</Card>}
        {!out && !err && <SkeletonRows n={4} />}
        {out && (
          <div className="flex flex-col gap-2">
            {out.checks.map((c, i) => (
              <CheckRow key={`${source}-${c.id}`} check={c} index={i} />
            ))}
          </div>
        )}

        <ActionBar>
          <PrimaryButton icon="description" onClick={() => nav(`/record/${id}`)}>
            Back to record
          </PrimaryButton>
          <SecondaryButton icon="home" onClick={() => nav('/')}>
            Home
          </SecondaryButton>
        </ActionBar>
      </Page>
    </>
  );
}
