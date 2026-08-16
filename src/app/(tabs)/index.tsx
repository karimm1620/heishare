import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeviceList } from '@/components/devices/DeviceList';
import { TransferRow } from '@/components/transfers/TransferRow';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDeviceIdentity } from '@/features/device/DeviceIdentityProvider';
import { useTrustedDevices } from '@/features/device/useTrustedDevices';
import { useDiscovery } from '@/features/discovery/DiscoveryProvider';
import { useTransfers } from '@/features/transfers/TransfersProvider';
import type { PeerDevice } from '@/types/device';

const NETWORK_STATE_LABEL: Record<string, string> = {
  starting: 'Starting…',
  running: 'Discoverable on this network',
  stopped: 'Not discoverable',
  error: 'Network unavailable',
};

const NETWORK_STATE_TONE: Record<string, BadgeTone> = {
  starting: 'neutral',
  running: 'success',
  stopped: 'neutral',
  error: 'destructive',
};

const ACTIVE_STATUSES = new Set(['preparing', 'awaiting_acceptance', 'accepted', 'transferring', 'verifying']);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { identity, networkState, networkError } = useDeviceIdentity();
  const { peers, discoveryState } = useDiscovery();
  const { trusted } = useTrustedDevices();
  const { transfers } = useTransfers();

  const trustedIds = useMemo(() => new Set(trusted.map((d) => d.deviceId)), [trusted]);
  const activeTransfers = useMemo(
    () => transfers.filter((t) => ACTIVE_STATUSES.has(t.status)).slice(0, 3),
    [transfers],
  );

  const handleSelectPeer = (peer: PeerDevice) => {
    router.push({ pathname: '/send', params: { deviceId: peer.deviceId } });
  };

  const header = (
    <View className="gap-4 pb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-semibold text-foreground">{identity?.alias ?? 'heishare'}</Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <Badge tone={NETWORK_STATE_TONE[networkState]}>{NETWORK_STATE_LABEL[networkState]}</Badge>
          </View>
        </View>
        <Button size="icon" variant="secondary" onPress={() => router.push('/send')} accessibilityLabel="New transfer">
          <Ionicons name="add" size={22} color="#18181b" />
        </Button>
      </View>

      {networkState === 'error' && networkError ? (
        <View className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <Text className="text-sm text-destructive">{networkError}</Text>
        </View>
      ) : null}

      <Button onPress={() => router.push('/send')}>Send files or text</Button>

      {activeTransfers.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-muted-foreground">Active</Text>
          {activeTransfers.map((t) => (
            <TransferRow
              key={t.transferId}
              transfer={t}
              onPress={() => router.push({ pathname: '/transfer/[transferId]', params: { transferId: t.transferId } })}
            />
          ))}
        </View>
      ) : null}

      {peers.length > 0 ? (
        <Text className="text-sm font-medium text-muted-foreground">Nearby devices · {peers.length}</Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background px-4" style={{ paddingTop: insets.top + 8 }}>
      <DeviceList
        peers={peers}
        discoveryState={discoveryState}
        trustedIds={trustedIds}
        onSelectPeer={handleSelectPeer}
        ListHeaderComponent={header}
      />
    </View>
  );
}
