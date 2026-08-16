import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTrustedDevices } from '@/features/device/useTrustedDevices';
import { useDiscovery } from '@/features/discovery/DiscoveryProvider';

export default function DeviceDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { peers } = useDiscovery();
  const { isTrusted, trust, untrust } = useTrustedDevices();

  const peer = useMemo(() => peers.find((p) => p.deviceId === deviceId), [peers, deviceId]);
  const trusted = deviceId ? isTrusted(deviceId) : false;

  if (!peer) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-base text-muted-foreground">This device is no longer visible on the network.</Text>
      </View>
    );
  }

  const toggleTrust = async () => {
    if (trusted) {
      await untrust(peer.deviceId);
    } else {
      await trust({ deviceId: peer.deviceId, alias: peer.alias, fingerprint: peer.fingerprint, addedAt: Date.now() });
    }
  };

  return (
    <View className="flex-1 gap-4 bg-background px-4 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
      <Card className="items-center gap-2 py-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Ionicons name="hardware-chip-outline" size={28} color="#71717a" />
        </View>
        <Text className="text-lg font-semibold text-foreground">{peer.alias}</Text>
        <Text className="text-sm capitalize text-muted-foreground">{peer.deviceType}</Text>
      </Card>

      <Card className="gap-3">
        <Text className="text-sm font-medium text-foreground">Verify this device</Text>
        <Text className="text-sm text-muted-foreground">
          Compare this fingerprint with what&apos;s shown in heishare Settings on the other device before trusting it.
        </Text>
        <View className="rounded-lg bg-muted px-3 py-2.5">
          <Text className="font-mono text-xs text-foreground">{peer.fingerprint}</Text>
        </View>
      </Card>

      <View className="flex-row items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5">
        <View>
          <Text className="text-sm font-medium text-foreground">Trusted device</Text>
          <Text className="text-xs text-muted-foreground">Shows a badge — never skips accept/reject.</Text>
        </View>
        {trusted ? <Badge tone="primary">Trusted</Badge> : null}
      </View>

      <Button variant={trusted ? 'secondary' : 'primary'} onPress={toggleTrust}>
        {trusted ? 'Remove from trusted' : 'Mark as trusted'}
      </Button>

      <Button variant="secondary" onPress={() => router.push({ pathname: '/send', params: { deviceId: peer.deviceId } })}>
        Send to this device
      </Button>
    </View>
  );
}
