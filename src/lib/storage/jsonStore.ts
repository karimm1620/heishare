/**
 * Local settings/metadata storage — see 05-project-structure-and-dependencies.md §7:
 * "Local settings and small metadata can use an Expo-compatible local storage
 * mechanism... Do not persist file bytes inside JavaScript storage."
 *
 * AsyncStorage is already bundled with Expo (no extra native binary weight)
 * and is more than sufficient for settings, trusted devices, and a bounded
 * transfer-history list — none of which need a database.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  settings: 'heishare:settings',
  deviceIdentity: 'heishare:device-identity',
  trustedDevices: 'heishare:trusted-devices',
  history: 'heishare:history',
} as const;
