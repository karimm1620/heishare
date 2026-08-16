import { useCallback, useEffect, useState } from 'react';

import {
  addTrustedDevice,
  loadTrustedDevices,
  removeTrustedDevice,
} from '@/lib/storage/trustedDevicesStore';
import type { TrustedDevice } from '@/types/device';

export function useTrustedDevices() {
  const [trusted, setTrusted] = useState<TrustedDevice[]>([]);

  useEffect(() => {
    loadTrustedDevices().then(setTrusted);
  }, []);

  const trust = useCallback(async (device: TrustedDevice) => {
    setTrusted(await addTrustedDevice(device));
  }, []);

  const untrust = useCallback(async (deviceId: string) => {
    setTrusted(await removeTrustedDevice(deviceId));
  }, []);

  const isTrusted = useCallback((deviceId: string) => trusted.some((d) => d.deviceId === deviceId), [trusted]);

  return { trusted, trust, untrust, isTrusted };
}
