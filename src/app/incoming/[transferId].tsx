import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTransfers } from '@/features/transfers/TransfersProvider';
import type { TransferFileMeta } from '@/types/transfer';
import { formatBytes } from '@/utils/format';

export default function IncomingTransferSheet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { transferId } = useLocalSearchParams<{ transferId: string }>();
  const { getTransfer, respondToIncoming } = useTransfers();
  const [isResponding, setIsResponding] = useState(false);

  const transfer = getTransfer(transferId);

  if (!transfer) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingBottom: insets.bottom }}>
        <Text className="text-base text-muted-foreground">This request is no longer available.</Text>
        <Button variant="secondary" className="mt-4" onPress={() => router.back()}>
          Close
        </Button>
      </View>
    );
  }

  const respond = async (accept: boolean) => {
    setIsResponding(true);
    try {
      await respondToIncoming(transfer.transferId, accept);
      router.back();
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <View className="flex-1 justify-between bg-background px-5 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <View>
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
        <Text className="text-lg font-semibold text-foreground">Incoming transfer</Text>
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-medium text-foreground">{transfer.peerAlias}</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              Fingerprint: {transfer.peerFingerprint.slice(0, 24)}…
            </Text>
          </View>
          <Badge tone="neutral">{transfer.files.length > 0 ? `${transfer.files.length} file(s)` : 'Text'}</Badge>
        </View>

        {transfer.files.length > 0 ? (
          <FlatList
            data={transfer.files}
            keyExtractor={(f) => f.fileId}
            renderItem={({ item }: { item: TransferFileMeta }) => (
              <View className="flex-row items-center justify-between border-b border-border py-2.5">
                <Text className="flex-1 pr-3 text-sm text-foreground" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-sm text-muted-foreground">{formatBytes(item.size)}</Text>
              </View>
            )}
            className="mt-3 max-h-64"
          />
        ) : (
          <Text className="mt-3 text-sm text-foreground" numberOfLines={6}>
            {transfer.textPreview}
          </Text>
        )}

        <View className="mt-4 flex-row items-center justify-between rounded-lg bg-muted px-3 py-2.5">
          <Text className="text-sm text-muted-foreground">Total size</Text>
          <Text className="text-sm font-medium text-foreground">{formatBytes(transfer.totalBytes)}</Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={() => respond(false)} disabled={isResponding}>
          Reject
        </Button>
        <Button className="flex-1" onPress={() => respond(true)} loading={isResponding}>
          Accept
        </Button>
      </View>
    </View>
  );
}
