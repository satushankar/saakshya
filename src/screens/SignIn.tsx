import { useState, type FormEvent } from 'react';
import { ActionBar, Card, Icon, PrimaryButton, PrototypeNotice, SecondaryButton } from '../components/ui';
import { loadOrCreateDeviceKeys } from '../seal/keys';
import { useApp } from '../state';

const OFFICER_ID = /^[A-Za-z0-9][A-Za-z0-9/-]{2,31}$/;

export default function SignIn() {
  const { register } = useApp();
  const [officerId, setOfficerId] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = OFFICER_ID.test(officerId.trim());

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setErr(null);
    try {
      const keys = await loadOrCreateDeviceKeys();
      setDeviceId(keys.deviceId);
      if ('vibrate' in navigator) navigator.vibrate(40);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not create the signing key on this device.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onRegister} className="max-w-xl mx-auto w-full min-h-dvh px-4 pt-8 flex flex-col gap-4 pt-safe">
      <div className="flex flex-col items-center text-center gap-2">
        <img src="/emblem.jpg" alt="Saakshya emblem" className="h-16 w-auto rounded" />
        <h1 className="font-headline text-headline-lg uppercase tracking-wider">Saakshya</h1>
        <span className="text-body-sm text-ink-muted tracking-widest uppercase">साक्ष्य · Field test companion</span>
        <div className="flex gap-2 px-3 py-1.5 bg-surface rounded-full shadow-sm" aria-hidden>
          {['bg-blank-amber', 'bg-amphet-orange', 'bg-scott-blue', 'bg-marquis-purple', 'bg-reaction-black'].map((c) => (
            <span key={c} className={`w-3.5 h-3.5 rounded-full ${c}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-headline text-headline-md">Register this device</h2>
        <p className="text-body-md text-ink-muted">One-time setup. Everything after this is fast.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-evidentiary-sm uppercase tracking-widest text-ink-secondary font-semibold">Officer ID</span>
        <div className="flex items-center bg-surface-sunk rounded-xl h-14 px-4 focus-within:ring-2 focus-within:ring-primary/30">
          <Icon name="badge" className="text-ink-muted mr-3 text-[22px]" />
          <input
            autoFocus
            disabled={!!deviceId}
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value.toUpperCase())}
            placeholder="e.g. NCB-4417"
            autoComplete="off"
            spellCheck={false}
            className="bg-transparent font-mono text-evidentiary-lg tracking-wider w-full outline-none"
          />
        </div>
        {officerId && !valid && (
          <span className="text-body-sm text-ink-secondary">3–32 characters: letters, digits, “-” or “/”.</span>
        )}
      </label>

      <Card className="bg-primary/5 shadow-none flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="key" fill className="text-[22px]" />
          <span className="font-headline text-body-md font-semibold">Device signing key</span>
        </div>
        <p className="text-body-md text-ink-secondary">
          A signing key (Ed25519) will be created on this device. It never leaves the phone. Every test you seal is signed with it.
        </p>
        {deviceId && (
          <p className="font-mono text-evidentiary-md">
            DEVICE ID <span className="font-semibold">{deviceId}</span>
          </p>
        )}
        {err && <p className="text-body-sm text-ink">{err}</p>}
      </Card>

      {deviceId && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="print" className="text-secondary text-[22px]" />
            <h3 className="font-headline text-body-lg font-semibold">Print the reference card</h3>
          </div>
          <p className="text-body-sm text-ink-muted">You need this printed card before your first capture. Print at 100% scale on plain white paper.</p>
          <img src="/reference-card.svg" alt="Reference card preview" className="w-full rounded border border-line bg-white" />
          <SecondaryButton icon="print" onClick={() => window.open('/reference-card.svg', '_blank', 'noopener')}>
            Print reference card
          </SecondaryButton>
        </Card>
      )}

      <PrototypeNotice />

      <ActionBar>
        {deviceId ? (
          <PrimaryButton icon="arrow_forward" onClick={() => void register(officerId.trim())}>
            Continue
          </PrimaryButton>
        ) : (
          <PrimaryButton type="submit" icon="fingerprint" disabled={!valid || busy}>
            {busy ? 'Creating key…' : 'Register device'}
          </PrimaryButton>
        )}
      </ActionBar>
    </form>
  );
}
