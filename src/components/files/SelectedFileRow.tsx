import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import type { PickedFile } from '@/features/transfers/TransfersProvider';
import { formatBytes } from '@/utils/format';

interface SelectedFileRowProps {
  file: PickedFile;
  onRemove: () => void;
}

export function SelectedFileRow({ file, onRemove }: SelectedFileRowProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-md bg-muted">
        <Ionicons name="document-outline" size={16} color="#71717a" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {file.name}
        </Text>
        <Text className="text-xs text-muted-foreground">{formatBytes(file.size)}</Text>
      </View>
      <IconButton icon="close" size={16} label={`Remove ${file.name}`} onPress={onRemove} />
    </View>
  );
}
