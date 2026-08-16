import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTransfers } from '@/features/transfers/TransfersProvider';
import type { TransferStatus } from '@/types/transfer';
import { formatBytes, formatRemainingTime, formatThroughput } from '@/utils/format';

const STATUS_TONE: Record<TransferStatus, BadgeTone> = {
  preparing: 'neutral',
  awaiting_acceptance: 'neutral',
  accepted: 'primary',
  transferring: 'primary',
  verifying: 'primary',
  completed: 'success',
  rejected: 'destructive',
  canceled: 'neutral',
  failed: 'destructive',
  expired: 'neutral',
};

const STATUS_MESSAGE: Record<TransferStatus, string> = {
  preparing: 'Preparing the transfer…',
  awaiting_acceptance: 'Waiting for the other device to respond…',
  accepted: 'Accepted — starting soon…',
  transferring: 'Sending…',
  verifying: 'Verifying the transfer…',
  completed: 'Completed',
  rejected: 'The other device rejected the transfer.',
  canceled: 'Transfer canceled.',
  failed: 'The transfer failed.',
  expired: 'The request expired before it was accepted.',
};

const CANCELABLE = new Set<TransferStatus>(['preparing', 'awaiting_acceptance', 'accepted', 'transferring', 'verifying']);

export default function TransferDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { transferId } = useLocalSearchParams<{ transferId: string }>();
  const { getTransfer, cancelTransfer } = useTransfers();
  const transfer = getTransfer(transferId);

  const [throughput, setThroughput] = useState(0);
  const lastSample = useRef<{ bytes: number; at: number } | null>(null);

  useEffect(() => {
    if (!transfer) return;
    const now = Date.now();
    if (lastSample.current) {
      const deltaBytes = transfer.bytesTransferred - lastSample.current.bytes;
      const deltaMs = now - lastSample.current.at;
      if (deltaMs > 0 && deltaBytes >= 0) {
        setThroughput((prev) => prev * 0.5 + (deltaBytes / (deltaMs / 1000)) * 0.5);
      }
    }
    lastSample.current = { bytes: transfer.bytesTransferred, at: now };
    // Deliberately depends on bytesTransferred only, not the whole
    // `transfer` object — re-running this on every field change (status,
    // updatedAt, ...) would corrupt the throughput sample window, which
    // must only advance when byte progress actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer?.bytesTransferred]);

  if (!transfer) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-base text-muted-foreground">This transfer is no longer available.</Text>
      </View>
    );
  }

  const progress = transfer.totalBytes > 0 ? transfer.bytesTransferred / transfer.totalBytes : 0;
  const isActive = transfer.status === 'transferring';

  const handleCancel = () => {
    Alert.alert('Cancel transfer?', undefined, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel transfer', style: 'destructive', onPress: () => cancelTransfer(transfer.transferId) },
    ]);
  };

  return (
    <View className="flex-1 bg-background px-4 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
      <Card className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-medium text-foreground">
            {transfer.direction === 'outgoing' ? `To ${transfer.peerAlias}` : `From ${transfer.peerAlias}`}
          </Text>
          <Badge tone={STATUS_TONE[transfer.status]}>{transfer.status.replace('_', ' ')}</Badge>
        </View>

        <Text className="text-sm text-muted-foreground">{STATUS_MESSAGE[transfer.status]}</Text>

        {transfer.status === 'failed' && transfer.error ? (
          <View className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <Text className="text-sm text-destructive">{transfer.error.message}</Text>
          </View>
        ) : null}

        <View className="gap-2">
          <ProgressBar
            progress={progress}
            tone={transfer.status === 'failed' ? 'destructive' : transfer.status === 'completed' ? 'success' : 'primary'}
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.totalBytes)}
            </Text>
            {isActive && throughput > 0 ? (
              <Text className="text-xs text-muted-foreground">
                {formatThroughput(throughput)}
                {'  ·  '}
                {formatRemainingTime(transfer.totalBytes - transfer.bytesTransferred, throughput)}
              </Text>
            ) : null}
          </View>
        </View>

        {transfer.files.length > 0 ? (
          <View className="gap-1">
            {transfer.files.map((f) => (
              <View key={f.fileId} className="flex-row items-center gap-2">
                <Ionicons name="document-outline" size={14} color="#a1a1aa" />
                <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                  {f.name}
                </Text>
                <Text className="text-xs text-muted-foreground">{formatBytes(f.size)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <View className="mt-4 flex-row gap-2">
        {CANCELABLE.has(transfer.status) ? (
          <Button variant="destructive" className="flex-1" onPress={handleCancel}>
            Cancel transfer
          </Button>
        ) : (
          <Button variant="secondary" className="flex-1" onPress={() => router.back()}>
            Done
          </Button>
        )}
      </View>
    </View>
  );
}
