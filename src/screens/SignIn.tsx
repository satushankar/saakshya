import { useState, type FormEvent } from 'react';
import { OfficerSignIn } from '../components/OfficerSignIn';
import { ActionBar, Card, Icon, PrimaryButton, PrototypeNotice, SecondaryButton } from '../components/ui';
import { registerDevice, type Officer } from '../data/auth';
import { supabase } from '../data/supabase';
import { toBase64 } from '../seal/hash';
import { loadOrCreateDeviceKeys } from '../seal/keys';
import { useApp } from '../state';

const OFFICER_ID = /^[A-Za-z0-9][A-Za-z0-9/-]{2,31}$/;

/** Local-only builds (no cloud configured): officer ID typed on the device. */
function LocalOfficerForm({ onDone }: { onDone: (id: string) => void }) {
  const [officerId, setOfficerId] = useState('');
  const valid = OFFICER_ID.test(officerId.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onDone(officerId.trim());
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-evidentiary-sm uppercase tracking-widest text-ink-secondary font-semibold">Officer ID</span>
        <input
          autoFocus
          value={officerId}
          onChange={(e) => setOfficerId(e.target.value.toUpperCase())}
          placeholder="e.g. NCB-4417"
          autoComplete="off"
          spellCheck={false}
          className="h-14 px-4 rounded-xl bg-surface-sunk font-mono text-evidentiary-lg outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <PrimaryButton type="submit" icon="fingerprint" disabled={!valid}>
        Register device
      </PrimaryButton>
    </form>
  );
}

export default function SignIn() {
  const { register } = useApp();
  const [officerId, setOfficerId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const provision = async (id: string, cloud: boolean) => {
    setErr(null);
    try {
      const keys = await loadOrCreateDeviceKeys();
      if (cloud) await registerDevice(keys.deviceId, toBase64(keys.publicKey), id);
      setOfficerId(id);
      setDeviceId(keys.deviceId);
      if ('vibrate' in navigator) navigator.vibrate(40);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not register this device.');
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full min-h-dvh px-4 pt-8 flex flex-col gap-4 pt-safe">
      <div className="flex flex-col items-center text-center gap-2">
        <img src="/emblem.jpg" alt="Saakshya emblem" className="h-16 w-auto rounded" />
        <h1 className="font-headline text-headline-lg uppercase tracking-wider">Saakshya</h1>
        <span className="text-body-sm text-ink-muted tracking-widest uppercase">साक्ष्य · Field test companion</span>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-headline text-headline-md">Register this device</h2>
        <p className="text-body-md text-ink-muted">
          One-time setup{supabase ? ', needs network' : ''}. After this, tests can be sealed offline.
        </p>
      </div>

      {!deviceId &&
        (supabase ? (
          <OfficerSignIn submitLabel="Sign in and register device" onSignedIn={(o: Officer) => void provision(o.id, true)} />
        ) : (
          <LocalOfficerForm onDone={(id) => void provision(id, false)} />
        ))}

      <Card className="bg-primary/5 shadow-none flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="key" fill className="text-[22px]" />
          <span className="font-headline text-body-md font-semibold">Device signing key</span>
        </div>
        <p className="text-body-md text-ink-secondary">
          A signing key (Ed25519) is created on this device. It never leaves the phone. Every test you seal is signed with it.
        </p>
        {deviceId && (
          <p className="font-mono text-evidentiary-md">
            {officerId} · DEVICE <span className="font-semibold">{deviceId}</span>
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
          <SecondaryButton icon="print" onClick={() => window.open('/print.html', '_blank', 'noopener')}>
            Print reference card
          </SecondaryButton>
        </Card>
      )}

      <PrototypeNotice />

      {deviceId && officerId && (
        <ActionBar>
          <PrimaryButton icon="arrow_forward" onClick={() => void register(officerId)}>
            Continue
          </PrimaryButton>
        </ActionBar>
      )}
    </div>
  );
}
