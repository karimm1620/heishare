import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import type { DeviceType, PeerDevice } from '@/types/device';
import { cn } from '@/utils/cn';

const DEVICE_ICONS: Record<DeviceType, keyof typeof Ionicons.glyphMap> = {
  mobile: 'phone-portrait-outline',
  desktop: 'desktop-outline',
  web: 'globe-outline',
  unknown: 'help-circle-outline',
};

interface DeviceCardProps {
  peer: PeerDevice;
  trusted?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

function DeviceCardBase({ peer, trusted, onPress, onLongPress }: DeviceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${peer.alias}, ${peer.deviceType}${trusted ? ', trusted' : ''}`}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 active:opacity-80"
    >
      <View className={cn('h-11 w-11 items-center justify-center rounded-full', trusted ? 'bg-accent' : 'bg-muted')}>
        <Ionicons name={DEVICE_ICONS[peer.deviceType]} size={20} color={trusted ? '#3730a3' : '#71717a'} />
      </View>

      <View className="flex-1">
        <Text className="text-base font-medium text-foreground" numberOfLines={1}>
          {peer.alias}
        </Text>
        <Text className="text-sm text-muted-foreground capitalize">{peer.deviceType}</Text>
      </View>

      {trusted ? <Badge tone="primary">Trusted</Badge> : null}
      <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
    </Pressable>
  );
}

export const DeviceCard = React.memo(DeviceCardBase);
