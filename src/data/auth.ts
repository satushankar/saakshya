import { supabase } from './supabase';

export interface Officer {
  id: string;
  name: string;
}

/** Signs in with an administrator-provisioned account and returns the linked officer. Needs network. */
export async function signInOfficer(email: string, password: string): Promise<Officer> {
  if (!supabase) throw new Error('Cloud is not configured for this build.');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message);
  const { data, error: e2 } = await supabase.from('officers').select('id, name').maybeSingle();
  if (e2) throw new Error(`Could not load officer profile: ${e2.message}`);
  if (!data) {
    await supabase.auth.signOut();
    throw new Error('This account is not linked to an officer. Ask an administrator to provision it.');
  }
  return data as Officer;
}

/** Registers this device's public key under the signed-in officer. Idempotent. */
export async function registerDevice(deviceId: string, publicKeyB64: string, officerId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('devices')
    .upsert({ id: deviceId, officer_id: officerId, public_key: publicKeyB64 }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new Error(`Could not register this device: ${error.message}`);
}

/** True when a stored session exists. Works offline; validity is checked by the server on sync. */
export async function hasSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function sessionEmail(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}
