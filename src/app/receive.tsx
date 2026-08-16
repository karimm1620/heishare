import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeviceIdentity } from '@/features/device/DeviceIdentityProvider';
import { useTransfers } from '@/features/transfers/TransfersProvider';
import type { Transfer } from '@/types/transfer';
import { formatBytes } from '@/utils/format';

const NETWORK_STATE_LABEL: Record<string, string> = {
  starting: 'Starting…',
  running: 'Visible to nearby devices',
  stopped: 'Not visible',
  error: 'Unavailable',
};
const NETWORK_STATE_TONE: Record<string, BadgeTone> = {
  starting: 'neutral',
  running: 'success',
  stopped: 'neutral',
  error: 'destructive',
};

export default function ReceiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { identity, networkState } = useDeviceIdentity();
  const { transfers } = useTransfers();

  const pending = useMemo(
    () => transfers.filter((t) => t.direction === 'incoming' && t.status === 'awaiting_acceptance'),
    [transfers],
  );

  const renderItem = ({ item }: { item: Transfer }) => (
    <Card
      onTouchEnd={() => router.push({ pathname: '/incoming/[transferId]', params: { transferId: item.transferId } })}
      className="gap-1"
    >
      <Text className="text-base font-medium text-foreground">{item.peerAlias}</Text>
      <Text className="text-sm text-muted-foreground">
        {item.files.length > 0 ? `${item.files.length} file(s) · ${formatBytes(item.totalBytes)}` : 'Text message'}
      </Text>
    </Card>
  );

  return (
    <View className="flex-1 bg-background px-4 pt-2" style={{ paddingBottom: insets.bottom }}>
      <Card className="mb-4 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-medium text-foreground">{identity?.alias ?? 'This device'}</Text>
          <Badge tone={NETWORK_STATE_TONE[networkState]}>{NETWORK_STATE_LABEL[networkState]}</Badge>
        </View>
        <Text className="text-sm text-muted-foreground">
          Other heishare devices on this network can see and send to this device automatically. You&apos;ll always be
          asked to accept or reject before anything is saved.
        </Text>
      </Card>

      <Text className="mb-2 text-sm font-medium text-muted-foreground">Waiting for your response</Text>
      <FlatList
        data={pending}
        keyExtractor={(t) => t.transferId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerClassName="flex-grow pb-4"
        ListEmptyComponent={
          <EmptyState icon="download-outline" title="No incoming requests" description="Nothing is waiting for your response right now." />
        }
      />
    </View>
  );
}
