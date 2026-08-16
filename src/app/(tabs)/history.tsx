import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransferRow } from '@/components/transfers/TransferRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { useHistory } from '@/features/history/useHistory';
import type { Transfer } from '@/types/transfer';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history, refresh, clear } = useHistory();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmClear = () => {
    Alert.alert('Clear history?', 'This only removes the local log — it does not affect any received files.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  };

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
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-foreground">History</Text>
        {history.length > 0 ? <IconButton icon="trash-outline" label="Clear history" onPress={confirmClear} /> : null}
      </View>
      <FlatList
        data={history}
        keyExtractor={(t) => t.transferId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerClassName="flex-grow pb-4"
        ListEmptyComponent={
          <EmptyState icon="time-outline" title="No history yet" description="Completed transfers stay here across app restarts." />
        }
      />
    </View>
  );
}
