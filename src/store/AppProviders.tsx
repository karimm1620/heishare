import React from 'react';

import { DeviceIdentityProvider } from '@/features/device/DeviceIdentityProvider';
import { DiscoveryProvider } from '@/features/discovery/DiscoveryProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { TransfersProvider } from '@/features/transfers/TransfersProvider';

/**
 * Composition order matters: DeviceIdentityProvider reads settings (alias,
 * port) to start the native server, DiscoveryProvider and TransfersProvider
 * both depend on that server being up.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <DeviceIdentityProvider>
        <DiscoveryProvider>
          <TransfersProvider>{children}</TransfersProvider>
        </DiscoveryProvider>
      </DeviceIdentityProvider>
    </SettingsProvider>
  );
}
