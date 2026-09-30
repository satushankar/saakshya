import type { TestRecord } from '../seal/types';
import { verifyRecord, type CheckResult } from '../seal/verify';
import { getLocalImage, getLocalRecord, listRecords, tamperLocalImage, tamperLocalPayload } from './queue';
import { downloadRemoteImage, fetchRemoteDeviceChain, fetchRemoteRecord } from './supabase';

export type Source = 'device' | 'cloud';

export interface VerifyOutcome {
  source: Source;
  record: TestRecord;
  checks: CheckResult[];
}

/** This device's chain, oldest first. */
export async function localChain(deviceId: string): Promise<TestRecord[]> {
  return (await listRecords())
    .map((r) => r.record)
    .filter((r) => r.device_id === deviceId)
    .reverse();
}

/**
 * Runs the four checks against either the copy stored on this device or the copy
 * in the cloud (re-downloading the image). Same verify code path either way.
 */
export async function verifyFrom(id: string, source: Source): Promise<VerifyOutcome> {
  if (source === 'device') {
    const local = await getLocalRecord(id);
    if (!local) throw new Error('Record not found on this device.');
    const record = local.record;
    return { source, record, checks: await verifyRecord(record, await getLocalImage(id), await localChain(record.device_id)) };
  }
  const record = await fetchRemoteRecord(id);
  if (!record) throw new Error('Record not found in the cloud. It may not have synced yet.');
  const [image, chain] = await Promise.all([downloadRemoteImage(record.image_path), fetchRemoteDeviceChain(record.device_id)]);
  return { source, record, checks: await verifyRecord(record, image, chain) };
}

/** DEV ONLY tamper tools for the demo. They act on this device's stored copy. */
export const devTamper = {
  image: (id: string) => tamperLocalImage(id),
  payload: (id: string) => tamperLocalPayload(id),
};
