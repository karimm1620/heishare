import type { TrustedDevice } from '@/types/device';

import { readJson, STORAGE_KEYS, writeJson } from './jsonStore';

export async function loadTrustedDevices(): Promise<TrustedDevice[]> {
  return readJson<TrustedDevice[]>(STORAGE_KEYS.trustedDevices, []);
}

export async function addTrustedDevice(device: TrustedDevice): Promise<TrustedDevice[]> {
  const current = await loadTrustedDevices();
  const next = [...current.filter((d) => d.deviceId !== device.deviceId), device];
  await writeJson(STORAGE_KEYS.trustedDevices, next);
  return next;
}

export async function removeTrustedDevice(deviceId: string): Promise<TrustedDevice[]> {
  const current = await loadTrustedDevices();
  const next = current.filter((d) => d.deviceId !== deviceId);
  await writeJson(STORAGE_KEYS.trustedDevices, next);
  return next;
}
