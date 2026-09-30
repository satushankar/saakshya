import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { analyseCard } from '../colour/analyse';
import { referenceTable } from '../colour/reference';
import { ActionBar, AppHeader, Card, Icon, Page, PrimaryButton, SecondaryButton } from '../components/ui';
import { decodeImage } from '../lib/capture';
import { useApp } from '../state';

export default function Review() {
  const { draft, setDraft } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  if (!draft?.image || !draft.previewUrl) return <Navigate to="/capture" replace />;

  const analyse = async () => {
    setBusy(true);
    try {
      // Analyse the exact bytes that will be sealed, so anyone can recompute from the evidence file.
      const { lighting, result } = analyseCard(await decodeImage(draft.image!), referenceTable());
      if (!result) {
        setRefusal(lighting.reason ?? 'Lighting out of range. Retake.');
        return;
      }
      setDraft({ ...draft, analysis: result });
      nav('/result');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader title="Review capture" subtitle={draft.case_number} back="/capture" />
      <Page>
        <p className="text-body-md text-ink-secondary">Is this photograph good? The card should fill the frame, sharp and evenly lit.</p>
        <img src={draft.previewUrl} alt="Captured card, cropped to the alignment frame" className="w-full rounded-xl shadow-md bg-viewfinder-black" />
        {refusal && (
          <Card className="border-l-4 border-verdict-inconclusive flex gap-3">
            <Icon name="light_mode" className="text-verdict-inconclusive text-[24px]" />
            <div>
              <p className="font-medium">Capture refused</p>
              <p className="text-body-sm text-ink-secondary">{refusal}</p>
            </div>
          </Card>
        )}
        <ActionBar>
          <PrimaryButton icon="science" onClick={() => void analyse()} disabled={busy || !!refusal}>
            {busy ? 'Analysing…' : 'Analyse'}
          </PrimaryButton>
          <SecondaryButton icon="replay" onClick={() => nav('/capture')}>
            Retake
          </SecondaryButton>
        </ActionBar>
      </Page>
    </>
  );
}
