import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { REFERENCE_SWATCHES } from '../colour/reference';
import { ActionBar, AppHeader, Icon, Page, PrimaryButton } from '../components/ui';
import { REAGENTS } from '../lib/format';
import type { Reagent } from '../seal/types';
import { useApp } from '../state';

const CASE_NO = /^[A-Za-z0-9][A-Za-z0-9/ ._-]{1,47}$/;

export default function NewTest() {
  const { draft, setDraft } = useApp();
  const nav = useNavigate();
  const [caseNo, setCaseNo] = useState(draft?.case_number ?? '');
  const [reagent, setReagent] = useState<Reagent | null>(draft?.reagent ?? null);
  const valid = CASE_NO.test(caseNo.trim()) && reagent !== null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || !reagent) return;
    setDraft({ case_number: caseNo.trim(), reagent });
    nav('/capture');
  };

  return (
    <form onSubmit={submit}>
      <AppHeader title="New test" subtitle="Case and reagent" back="/" />
      <Page>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase text-ink-secondary">Case number</span>
          <input
            autoFocus
            value={caseNo}
            onChange={(e) => setCaseNo(e.target.value.toUpperCase())}
            placeholder="NDPS/2026/0417"
            autoComplete="off"
            spellCheck={false}
            className="h-14 px-4 rounded-xl bg-surface-sunk font-mono text-evidentiary-lg outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-label-caps uppercase text-ink-secondary mb-2">Reagent</legend>
          {(Object.keys(REAGENTS) as Reagent[]).map((k) => {
            const on = reagent === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setReagent(k)}
                className={`w-full text-left rounded-xl p-4 min-h-20 flex items-center justify-between gap-3 border-2 transition ${
                  on ? 'border-primary bg-primary/5' : 'border-transparent bg-surface shadow-sm'
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-headline text-headline-sm">{REAGENTS[k].name}</span>
                  <span className="text-body-sm text-ink-muted">{REAGENTS[k].targets}</span>
                  <span className="flex gap-1 mt-2" aria-hidden>
                    {REFERENCE_SWATCHES.map((s) => (
                      <span key={s.key} className="w-5 h-5 rounded" style={{ background: s.hex }} />
                    ))}
                  </span>
                </span>
                <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'} className={`text-[26px] ${on ? 'text-primary' : 'text-line-strong'}`} />
              </button>
            );
          })}
        </fieldset>

        <ActionBar>
          <PrimaryButton type="submit" icon="photo_camera" disabled={!valid}>
            Open camera
          </PrimaryButton>
        </ActionBar>
      </Page>
    </form>
  );
}
