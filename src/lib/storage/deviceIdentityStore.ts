import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { PROTOCOL_VERSION } from '@/lib/protocol/constants';
import type { DeviceIdentity, DeviceType } from '@/types/device';

import { readJson, STORAGE_KEYS, writeJson } from './jsonStore';

function inferDeviceType(): DeviceType {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return 'mobile';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

function defaultAlias(): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return Platform.OS === 'android' ? `Android device ${suffix}` : `Device ${suffix}`;
}

/**
 * `fingerprint` starts as a placeholder and is overwritten once the native
 * module generates the real local TLS certificate on first `start()` — see
 * features/device/useDeviceIdentity.ts. It is never itself a secret.
 */
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const existing = await readJson<DeviceIdentity | null>(STORAGE_KEYS.deviceIdentity, null);
  if (existing) return existing;

  const identity: DeviceIdentity = {
    deviceId: Crypto.randomUUID(),
    alias: defaultAlias(),
    deviceType: inferDeviceType(),
    fingerprint: '',
    protocolVersion: PROTOCOL_VERSION,
  };
  await writeJson(STORAGE_KEYS.deviceIdentity, identity);
  return identity;
}

export async function saveDeviceIdentity(identity: DeviceIdentity): Promise<void> {
  await writeJson(STORAGE_KEYS.deviceIdentity, identity);
}
