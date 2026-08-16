import React, { useCallback } from 'react';
import { FlatList, View } from 'react-native';

import { DeviceCard } from '@/components/devices/DeviceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DiscoveryState } from '@/features/discovery/DiscoveryProvider';
import type { PeerDevice } from '@/types/device';

interface DeviceListProps {
  peers: PeerDevice[];
  discoveryState: DiscoveryState;
  trustedIds: ReadonlySet<string>;
  onSelectPeer: (peer: PeerDevice) => void;
  /** Rendered above the device list inside the same scroll container, so the
   *  screen never nests a ScrollView around this FlatList. */
  ListHeaderComponent?: React.ReactElement | null;
}

export function DeviceList({ peers, discoveryState, trustedIds, onSelectPeer, ListHeaderComponent }: DeviceListProps) {
  const renderItem = useCallback(
    ({ item }: { item: PeerDevice }) => (
      <DeviceCard peer={item} trusted={trustedIds.has(item.deviceId)} onPress={() => onSelectPeer(item)} />
    ),
    [trustedIds, onSelectPeer],
  );

  const emptyState =
    discoveryState === 'unavailable' ? (
      <EmptyState
        icon="wifi-outline"
        title="Local network unavailable"
        description="Check that Wi-Fi is on and local network permission is granted, then try again."
      />
    ) : (
      <EmptyState
        icon="search-outline"
        title={discoveryState === 'searching' ? 'Searching for nearby devices…' : 'No devices found yet'}
        description="Make sure the other device is on and has heishare open on the same network."
      />
    );

  return (
    <FlatList
      data={peers}
      keyExtractor={(item) => item.deviceId}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View className="h-2" />}
      contentContainerClassName="flex-grow px-4 pb-4"
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={emptyState}
    />
  );
}
