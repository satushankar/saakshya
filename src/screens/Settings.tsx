import { useEffect, useState } from 'react';
import { minimumPairwiseDeltaE } from '../colour/classify';
import { REJECT_RATIO, MARGIN_RATIO } from '../colour/policy';
import { REFERENCE_SWATCHES, referenceTable } from '../colour/reference';
import { HashText } from '../components/evidence';
import { OfficerSignIn } from '../components/OfficerSignIn';
import { sessionEmail } from '../data/auth';
import { AppHeader, BottomNav, Card, Label, Page, PrototypeNotice, SecondaryButton, useQueuedCount } from '../components/ui';
import { supabase } from '../data/supabase';
import { drainQueue } from '../data/sync';
import { toBase64 } from '../seal/hash';
import { loadOrCreateDeviceKeys } from '../seal/keys';
import { fmtDE } from '../lib/format';
import { useApp } from '../state';

export default function Settings() {
  const { profile } = useApp();
  const queued = useQueuedCount();
  const [pub, setPub] = useState<{ key: string; id: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const table = referenceTable();
  const minPair = minimumPairwiseDeltaE(table);

  useEffect(() => {
    void loadOrCreateDeviceKeys().then((k) => setPub({ key: toBase64(k.publicKey), id: k.deviceId }));
    void sessionEmail().then(setEmail);
  }, []);

  return (
    <>
      <AppHeader title="Settings" subtitle={profile?.officer_id} />
      <Page nav>
        <Card className="flex flex-col gap-2">
          <Label>Device</Label>
          <p className="font-mono text-evidentiary-md">ID {pub?.id ?? '…'}</p>
          {pub && <HashText label="Public key (base64)" value={pub.key} />}
          <p className="text-body-sm text-ink-muted">The private key stays in this browser's storage and is never transmitted.</p>
        </Card>

        {supabase && (
          <Card className="flex flex-col gap-3">
            <Label>Account</Label>
            {email ? (
              <p className="font-mono text-evidentiary-md break-all">Signed in · {email}</p>
            ) : (
              <>
                <p className="text-body-md">Not signed in. Sealed records stay on this device until you sign in.</p>
                <OfficerSignIn
                  onSignedIn={(o) => {
                    if (o.id !== profile?.officer_id) {
                      void supabase?.auth.signOut();
                      setAuthErr(`This device is registered to ${profile?.officer_id}. Sign in with that officer's account.`);
                      return;
                    }
                    setAuthErr(null);
                    void sessionEmail().then(setEmail);
                    void drainQueue();
                  }}
                />
                {authErr && <p className="text-body-sm text-ink">{authErr}</p>}
              </>
            )}
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <Label>Sync</Label>
          <p className="text-body-md">
            {supabase ? `${queued} record${queued === 1 ? '' : 's'} waiting to upload.` : 'Cloud not configured. Records stay on this device.'}
          </p>
          {supabase && (
            <SecondaryButton
              icon="sync"
              disabled={syncing || !queued}
              onClick={() => {
                setSyncing(true);
                void drainQueue().finally(() => setSyncing(false));
              }}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </SecondaryButton>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <Label>Reference table (read-only)</Label>
          {REFERENCE_SWATCHES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg border border-line shrink-0" style={{ background: s.hex }} />
              <div className="flex flex-col min-w-0">
                <span className="text-body-md font-medium">
                  {s.code} · {s.substance}
                </span>
                <span className="font-mono text-evidentiary-sm text-ink-muted">
                  L*a*b* {table[i].lab.map((x) => x.toFixed(2)).join(', ')}
                </span>
              </div>
            </div>
          ))}
          <p className="font-mono text-evidentiary-sm text-ink-secondary">
            min pairwise ΔE {fmtDE(minPair)} → reject {fmtDE(minPair * REJECT_RATIO)}, margin {fmtDE(minPair * MARGIN_RATIO)}
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <Label>About</Label>
          <p className="font-mono text-evidentiary-sm">Saakshya prototype v0.1</p>
          <PrototypeNotice />
          <p className="text-body-sm text-ink-muted">
            Cloud access requires a signed-in officer; each officer can read and upload only their own records. Still a prototype: no
            supervisor roles, and the device key lives in browser storage rather than managed key custody.
          </p>
        </Card>
      </Page>
      <BottomNav />
    </>
  );
}
