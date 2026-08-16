import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransferRow } from '@/components/transfers/TransferRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTransfers } from '@/features/transfers/TransfersProvider';
import type { Transfer } from '@/types/transfer';

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { transfers } = useTransfers();

  const renderItem = useCallback(
    ({ item }: { item: Transfer }) => (
      <TransferRow
        transfer={item}
        onPress={() => router.push({ pathname: '/transfer/[transferId]', params: { transferId: item.transferId } })}
      />
    ),
    [router],
  );

  return (
    <View className="flex-1 bg-background px-4" style={{ paddingTop: insets.top + 8 }}>
      <Text className="mb-3 text-2xl font-semibold text-foreground">Transfers</Text>
      <FlatList
        data={transfers}
        keyExtractor={(t) => t.transferId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerClassName="flex-grow pb-4"
        ListEmptyComponent={
          <EmptyState
            icon="swap-vertical-outline"
            title="No transfers yet"
            description="Sent and received transfers for this session will show up here."
          />
        }
      />
    </View>
  );
}
