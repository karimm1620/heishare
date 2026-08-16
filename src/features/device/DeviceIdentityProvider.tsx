import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { localNetworkService } from '@/lib/networking/localNetworkService';
import { loadOrCreateDeviceIdentity, saveDeviceIdentity } from '@/lib/storage/deviceIdentityStore';
import { DEFAULT_CAPABILITIES } from '@/types/device';
import type { DeviceIdentity } from '@/types/device';

import { useSettings } from '@/features/settings/SettingsProvider';

export type NetworkRunState = 'starting' | 'running' | 'stopped' | 'error';

interface DeviceIdentityContextValue {
  identity: DeviceIdentity | null;
  networkState: NetworkRunState;
  networkError: string | null;
}

const DeviceIdentityContext = createContext<DeviceIdentityContextValue | null>(null);

/**
 * Owns the device's identity record and the native server lifecycle: loads
 * (or creates) the identity once, then starts the native module using the
 * user's current alias/port from settings. Restarts the server when alias or
 * port changes so a rename takes effect without a full app restart.
 */
export function DeviceIdentityProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [identity, setIdentity] = useState<DeviceIdentity | null>(null);
  const [networkState, setNetworkState] = useState<NetworkRunState>('stopped');
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadOrCreateDeviceIdentity();
      if (!cancelled) setIdentity(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!identity || !settings) return;
    let cancelled = false;

    (async () => {
      setNetworkState('starting');
      setNetworkError(null);
      try {
        await localNetworkService.start({
          deviceId: identity.deviceId,
          alias: settings.alias,
          deviceType: identity.deviceType,
          port: settings.port,
          capabilities: DEFAULT_CAPABILITIES,
        });
        const info = await localNetworkService.getInfo();
        if (cancelled) return;

        if (info.fingerprint && info.fingerprint !== identity.fingerprint) {
          const updated: DeviceIdentity = { ...identity, fingerprint: info.fingerprint, alias: settings.alias };
          setIdentity(updated);
          await saveDeviceIdentity(updated);
        }
        setNetworkState('running');
      } catch (e) {
        if (cancelled) return;
        setNetworkState('error');
        setNetworkError(e instanceof Error ? e.message : 'Could not start local networking.');
      }
    })();

    return () => {
      cancelled = true;
      localNetworkService.stop().catch(() => {});
      setNetworkState('stopped');
    };
    // Restart deliberately scoped to alias/port — other settings changes
    // (appearance, confirmation policy) must not bounce the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.deviceId, settings?.alias, settings?.port]);

  const value = useMemo(() => ({ identity, networkState, networkError }), [identity, networkState, networkError]);

  return <DeviceIdentityContext.Provider value={value}>{children}</DeviceIdentityContext.Provider>;
}

export function useDeviceIdentity(): DeviceIdentityContextValue {
  const ctx = useContext(DeviceIdentityContext);
  if (!ctx) throw new Error('useDeviceIdentity must be used within DeviceIdentityProvider');
  return ctx;
}
