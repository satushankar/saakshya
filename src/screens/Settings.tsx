import { useEffect, useState } from 'react';
import { minimumPairwiseDeltaE } from '../colour/classify';
import { REJECT_RATIO, MARGIN_RATIO } from '../colour/policy';
import { REFERENCE_SWATCHES, referenceTable } from '../colour/reference';
import { HashText } from '../components/evidence';
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
  const table = referenceTable();
  const minPair = minimumPairwiseDeltaE(table);

  useEffect(() => {
    void loadOrCreateDeviceKeys().then((k) => setPub({ key: toBase64(k.publicKey), id: k.deviceId }));
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
            Not production security: the prototype cloud database uses permissive access rules. A real deployment needs authenticated
            officers, per-device write scoping and managed key custody.
          </p>
        </Card>
      </Page>
      <BottomNav />
    </>
  );
}
