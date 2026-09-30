import { useState, type FormEvent } from 'react';
import { signInOfficer, type Officer } from '../data/auth';
import { Icon, PrimaryButton } from './ui';

const field = 'flex items-center bg-surface-sunk rounded-xl h-14 px-4 focus-within:ring-2 focus-within:ring-primary/30';

/** Email + password sign-in for administrator-provisioned officer accounts. Needs network. */
export function OfficerSignIn({ onSignedIn, submitLabel = 'Sign in' }: { onSignedIn: (o: Officer) => void; submitLabel?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    if (!navigator.onLine) {
      setErr('Signing in needs a network connection. Tests can still be sealed offline afterwards.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      onSignedIn(await signInOfficer(email, password));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-evidentiary-sm uppercase tracking-widest text-ink-secondary font-semibold">Official email</span>
        <div className={field}>
          <Icon name="mail" className="text-ink-muted mr-3 text-[22px]" />
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent w-full outline-none text-body-md"
          />
        </div>
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-evidentiary-sm uppercase tracking-widest text-ink-secondary font-semibold">Password</span>
        <div className={field}>
          <Icon name="lock" className="text-ink-muted mr-3 text-[22px]" />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent w-full outline-none text-body-md"
          />
        </div>
      </label>
      {err && <p className="text-body-sm text-ink">{err}</p>}
      <PrimaryButton type="submit" icon="login" disabled={!valid || busy}>
        {busy ? 'Signing in…' : submitLabel}
      </PrimaryButton>
    </form>
  );
}
