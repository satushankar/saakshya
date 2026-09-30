import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Analysis } from './colour/analyse';
import { getProfile, setProfile as saveProfile, type Profile } from './data/queue';
import type { Reagent } from './seal/types';

export interface Draft {
  case_number: string;
  reagent: Reagent;
  /** Sealed-to-be PNG bytes of the alignment-rect crop. */
  image?: Uint8Array;
  previewUrl?: string;
  captured_at?: string;
  gps?: { lat: number; lon: number; accuracy_m: number } | null;
  analysis?: Analysis;
  /** Set once sealed, so the same capture can never be sealed twice. */
  sealedId?: string;
}

interface AppState {
  profile: Profile | null;
  loading: boolean;
  register: (officerId: string) => Promise<void>;
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraftState] = useState<Draft | null>(null);

  useEffect(() => {
    void getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const register = async (officer_id: string) => {
    const p = { officer_id, registered_at: new Date().toISOString() };
    await saveProfile(p);
    setProfile(p);
  };

  const setDraft = (d: Draft | null) =>
    setDraftState((prev) => {
      if (prev?.previewUrl && prev.previewUrl !== d?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return d;
    });

  return <Ctx.Provider value={{ profile, loading, register, draft, setDraft }}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
