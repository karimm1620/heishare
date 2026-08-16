import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { localNetworkService } from '@/lib/networking/localNetworkService';
import type { PeerDevice } from '@/types/device';

import { useDeviceIdentity } from '@/features/device/DeviceIdentityProvider';

/** A peer not re-announced within this window is dropped from the list —
 *  see 02-networking-architecture.md §4 / 06-performance-and-size.md §5. */
const STALE_AFTER_MS = 15_000;
const STALE_SWEEP_INTERVAL_MS = 5_000;

export type DiscoveryState = 'idle' | 'searching' | 'ready' | 'unavailable';

interface DiscoveryContextValue {
  peers: PeerDevice[];
  discoveryState: DiscoveryState;
}

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const { networkState } = useDeviceIdentity();
  const [peersById, setPeersById] = useState<Map<string, PeerDevice>>(new Map());
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (networkState !== 'running') return;

    const unsubscribeDiscovered = localNetworkService.onDeviceDiscovered((device) => {
      setPeersById((prev) => {
        const next = new Map(prev);
        next.set(device.deviceId, { ...device, lastSeenAt: Date.now(), stale: false });
        return next;
      });
    });
    const unsubscribeLost = localNetworkService.onDeviceLost((deviceId) => {
      setPeersById((prev) => {
        const next = new Map(prev);
        next.delete(deviceId);
        return next;
      });
    });

    localNetworkService.startDiscovery().catch(() => {
      // Surfaced to the user as "no peers found" rather than a distinct
      // error state — networkState already carries the hard-failure case
      // (see DeviceIdentityProvider's 'error' state) and duplicating that
      // here would need a synchronous setState in this effect body for no
      // real UX benefit.
    });

    sweepRef.current = setInterval(() => {
      setPeersById((prev) => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        for (const [id, peer] of prev) {
          if (now - peer.lastSeenAt > STALE_AFTER_MS) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, STALE_SWEEP_INTERVAL_MS);

    // Runs whenever networkState moves away from 'running' (or on unmount)
    // — the natural place to drop peers found under the previous session,
    // since it's the same moment discovery itself is torn down.
    return () => {
      unsubscribeDiscovered();
      unsubscribeLost();
      if (sweepRef.current) clearInterval(sweepRef.current);
      localNetworkService.stopDiscovery().catch(() => {});
      setPeersById(new Map());
    };
  }, [networkState]);

  const value = useMemo<DiscoveryContextValue>(() => {
    const peers = Array.from(peersById.values()).sort((a, b) => a.alias.localeCompare(b.alias));
    const discoveryState: DiscoveryState =
      networkState === 'error'
        ? 'unavailable'
        : networkState !== 'running'
          ? 'idle'
          : peers.length > 0
            ? 'ready'
            : 'searching';
    return { peers, discoveryState };
  }, [peersById, networkState]);

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery(): DiscoveryContextValue {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error('useDiscovery must be used within DiscoveryProvider');
  return ctx;
}
