import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { REFERENCE_SWATCHES } from '../colour/reference';
import { CandidateRow, SwatchCompare } from '../components/evidence';
import { ActionBar, AppHeader, Card, Icon, Label, MetaGrid, PrimaryButton, SecondaryButton } from '../components/ui';
import { sealAndQueue } from '../data/seal-flow';
import { vibrate } from '../lib/capture';
import { fmtDE, fmtGps, fmtTime, REAGENTS, VERDICT_BG } from '../lib/format';
import type { VerdictKind } from '../seal/types';
import { useApp } from '../state';

const swatch = (key: string) => REFERENCE_SWATCHES.find((s) => s.key === key)!;
const OUTCOMES: VerdictKind[] = ['POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'];

export default function Result() {
  const { draft, profile, setDraft } = useApp();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(false);
  const [override, setOverride] = useState<VerdictKind | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const a = draft?.analysis;
  if (draft?.sealedId) return <Navigate to={`/record/${draft.sealedId}`} replace />;
  if (!draft || !a || !draft.image || !draft.captured_at || !profile) return <Navigate to="/" replace />;
  const v = a.verdict;
  const near = swatch(v.nearest.key);
  const runner = swatch(v.runnerUp.key);
  const inconclusive = v.verdict === 'INCONCLUSIVE';
  const headline =
    v.verdict === 'POSITIVE' ? `Positive — ${v.nearest.substance}` : v.verdict === 'NEGATIVE' ? 'Negative — no reaction' : 'Inconclusive';
  const gap = v.runnerUp.delta_e - v.nearest.delta_e;
  const reason = v.reason.startsWith('ambiguous')
    ? `${v.reason.charAt(0).toUpperCase()}${v.reason.slice(1)} — ΔE difference ${fmtDE(gap)}, below the ${fmtDE(v.thresholds.m_margin)} separation margin.`
    : v.reason === 'no reference match'
      ? `No reference match — nearest ΔE ${fmtDE(v.nearest.delta_e)} exceeds the ${fmtDE(v.thresholds.t_reject)} reject limit.`
      : `Nearest reference ΔE ${fmtDE(v.nearest.delta_e)}, within the ${fmtDE(v.thresholds.t_reject)} limit; next closest ${fmtDE(gap)} further.`;

  const seal = async (decision: 'CONFIRMED' | 'OVERRIDDEN') => {
    setBusy(true);
    setErr(null);
    try {
      const rec = await sealAndQueue({
        case_number: draft.case_number,
        reagent: draft.reagent,
        operator_id: profile.officer_id,
        captured_at: draft.captured_at!,
        gps: draft.gps ?? null,
        image: draft.image!,
        analysis: a,
        officer_decision: decision,
        officer_verdict: decision === 'OVERRIDDEN' ? (override ?? undefined) : undefined,
        officer_note: note.trim() || null,
      });
      vibrate([30, 50, 40]);
      setDraft({ ...draft, sealedId: rec.id });
      nav(`/record/${rec.id}?sealed=1`, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sealing failed.');
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader title="Result" subtitle={draft.case_number} back="/review" />
      <div className={`${VERDICT_BG[v.verdict]} text-white px-4 pt-20 pb-4`}>
        <div className="max-w-xl mx-auto flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon name={v.verdict === 'POSITIVE' ? 'science' : v.verdict === 'NEGATIVE' ? 'check_circle' : 'help'} fill className="text-[28px]" />
            <h1 className="font-headline text-headline-md uppercase">{headline}</h1>
          </div>
          <p className="text-body-md opacity-95">{reason}</p>
        </div>
      </div>
      <main className="max-w-xl mx-auto w-full px-4 pt-4 pb-6 flex flex-col gap-4 min-h-[60dvh]">
        {!a.greyOk && (
          <Card className="border-l-4 border-verdict-inconclusive">
            <p className="font-medium">Low-confidence capture</p>
            <p className="text-body-sm text-ink-secondary">
              After white balance the grey patch is not neutral (spread <span className="font-mono">{a.greySpread.toFixed(4)}</span>). This is
              recorded with the result. Consider retaking.
            </p>
          </Card>
        )}
        <Card className="flex flex-col gap-3">
          <Label>Colour match · CIEDE2000</Label>
          <SwatchCompare
            measured={a.reaction_rgb}
            reference={{ hex: near.hex, name: near.name }}
            deltaE={v.nearest.delta_e}
            tReject={v.thresholds.t_reject}
          />
        </Card>
        <Card className="flex flex-col gap-3">
          <Label>Next closest match</Label>
          <CandidateRow hex={runner.hex} name={runner.name} substance={v.runnerUp.substance} deltaE={v.runnerUp.delta_e} />
        </Card>
        <Card>
          <MetaGrid
            rows={[
              ['Reagent', REAGENTS[draft.reagent].name],
              ['Case', draft.case_number],
              ['Time', fmtTime(draft.captured_at)],
              ['GPS', fmtGps(draft.gps ?? null)],
              ['Reject limit', `ΔE ${fmtDE(v.thresholds.t_reject)}`],
              ['Margin', `ΔE ${fmtDE(v.thresholds.m_margin)}`],
              ['Lab', a.reaction_lab.map((x) => x.toFixed(2)).join(', ')],
            ]}
          />
          <p className="text-body-sm text-ink-muted mt-3">Thresholds are computed at runtime from the card's own reference patches.</p>
        </Card>
        {err && <p className="text-body-sm text-ink">{err}</p>}
        <ActionBar>
          <PrimaryButton icon="lock" onClick={() => void seal('CONFIRMED')} disabled={busy}>
            {busy ? 'Sealing…' : inconclusive ? 'Seal as inconclusive' : 'Confirm and seal'}
          </PrimaryButton>
          <SecondaryButton icon="edit_note" onClick={() => setSheet(true)} disabled={busy}>
            Override verdict
          </SecondaryButton>
        </ActionBar>
      </main>

      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setSheet(false)}>
          <div className="w-full max-w-xl mx-auto bg-surface rounded-t-2xl p-4 pb-safe flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-headline text-headline-sm">Override verdict</h2>
            <p className="text-body-sm text-ink-muted">
              The machine verdict ({v.verdict}) stays in the record. Your decision is stored alongside it.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  onClick={() => setOverride(o)}
                  className={`h-14 rounded-xl text-label-micro uppercase border-2 ${override === o ? `${VERDICT_BG[o]} text-white border-transparent` : 'border-line-strong'}`}
                >
                  {o}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Reason for override (required)"
              rows={3}
              className="rounded-xl bg-surface-sunk p-3 text-body-md outline-none focus:ring-2 focus:ring-primary/30"
            />
            <PrimaryButton icon="lock" disabled={!override || !note.trim() || busy} onClick={() => void seal('OVERRIDDEN')}>
              Seal with override
            </PrimaryButton>
            <SecondaryButton onClick={() => setSheet(false)}>Cancel</SecondaryButton>
          </div>
        </div>
      )}
    </>
  );
}
