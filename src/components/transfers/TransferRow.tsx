import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Transfer, TransferStatus } from '@/types/transfer';
import { formatBytes, formatRelativeTime } from '@/utils/format';

const STATUS_LABEL: Record<TransferStatus, string> = {
  preparing: 'Preparing…',
  awaiting_acceptance: 'Waiting for response…',
  accepted: 'Accepted',
  transferring: 'Sending…',
  verifying: 'Verifying…',
  completed: 'Completed',
  rejected: 'Rejected',
  canceled: 'Canceled',
  failed: 'Failed',
  expired: 'Expired',
};

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

const ACTIVE_STATUSES = new Set<TransferStatus>(['preparing', 'awaiting_acceptance', 'accepted', 'transferring', 'verifying']);

function summarizeFiles(transfer: Transfer): string {
  if (transfer.files.length === 0) return transfer.textPreview ? 'Text' : 'Transfer';
  if (transfer.files.length === 1) return transfer.files[0].name;
  return `${transfer.files[0].name} +${transfer.files.length - 1} more`;
}

interface TransferRowProps {
  transfer: Transfer;
  onPress?: () => void;
}

function TransferRowBase({ transfer, onPress }: TransferRowProps) {
  const isActive = ACTIVE_STATUSES.has(transfer.status);
  const progress = transfer.totalBytes > 0 ? transfer.bytesTransferred / transfer.totalBytes : 0;

  const subtitle = useMemo(() => {
    if (isActive && transfer.status !== 'preparing' && transfer.status !== 'awaiting_acceptance') {
      return `${formatBytes(transfer.bytesTransferred)} / ${formatBytes(transfer.totalBytes)}`;
    }
    return formatRelativeTime(transfer.updatedAt);
  }, [isActive, transfer.status, transfer.bytesTransferred, transfer.totalBytes, transfer.updatedAt]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      className="gap-2 rounded-lg border border-border bg-card px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Ionicons
            name={transfer.direction === 'outgoing' ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={18}
            color="#71717a"
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-foreground" numberOfLines={1}>
            {summarizeFiles(transfer)}
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {transfer.direction === 'outgoing' ? 'To' : 'From'} {transfer.peerAlias} · {subtitle}
          </Text>
        </View>
        <Badge tone={STATUS_TONE[transfer.status]}>{STATUS_LABEL[transfer.status]}</Badge>
      </View>

      {transfer.status === 'transferring' || transfer.status === 'verifying' ? (
        <ProgressBar progress={progress} />
      ) : null}
    </Pressable>
  );
}

export const TransferRow = React.memo(TransferRowBase);
