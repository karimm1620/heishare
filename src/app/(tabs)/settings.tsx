import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { PlatformSwitch } from '@/components/ui/PlatformSwitch';
import { useDeviceIdentity } from '@/features/device/DeviceIdentityProvider';
import { useTrustedDevices } from '@/features/device/useTrustedDevices';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useSyncedState } from '@/hooks/useSyncedState';
import { localNetworkService } from '@/lib/networking/localNetworkService';
import { removeKey, STORAGE_KEYS } from '@/lib/storage/jsonStore';
import type { AppearanceMode } from '@/lib/storage/settingsStore';

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-2 mt-6 text-sm font-medium text-muted-foreground">{children}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { identity } = useDeviceIdentity();
  const { trusted, untrust } = useTrustedDevices();

  const [aliasDraft, setAliasDraft] = useSyncedState(settings?.alias ?? '');
  const [portDraft, setPortDraft] = useSyncedState(String(settings?.port ?? ''));
  const [addresses, setAddresses] = useState<string[]>([]);

  useEffect(() => {
    localNetworkService
      .getLocalAddresses()
      .then(setAddresses)
      .catch(() => setAddresses([]));
  }, []);

  const commitAlias = () => {
    const trimmed = aliasDraft.trim();
    if (trimmed.length > 0 && trimmed !== settings?.alias) {
      updateSettings({ alias: trimmed.slice(0, 64) });
    }
  };

  const commitPort = () => {
    const parsed = Number(portDraft);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 && parsed !== settings?.port) {
      updateSettings({ port: parsed });
    } else {
      setPortDraft(String(settings?.port ?? ''));
    }
  };

  const copyFingerprint = async () => {
    if (!identity?.fingerprint) return;
    await Clipboard.setStringAsync(identity.fingerprint);
  };

  const confirmResetIdentity = () => {
    Alert.alert(
      'Reset local identity?',
      'This generates a new device ID and TLS certificate. Trusted devices will no longer recognize this device. Restart the app afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await removeKey(STORAGE_KEYS.deviceIdentity);
            Alert.alert('Identity reset', 'Restart heishare for the new identity to take effect.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-background px-4"
      contentContainerClassName="pb-10"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Text className="text-2xl font-semibold text-foreground">Settings</Text>

      <SectionLabel>Device</SectionLabel>
      <Card className="gap-3">
        <View>
          <Text className="mb-1 text-sm text-muted-foreground">Alias</Text>
          <TextInput
            value={aliasDraft}
            onChangeText={setAliasDraft}
            onBlur={commitAlias}
            onSubmitEditing={commitAlias}
            maxLength={64}
            placeholder="This device's name"
            className="rounded-md border border-border bg-background px-3 py-2.5 text-base text-foreground"
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">Certificate fingerprint</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {identity?.fingerprint ? `${identity.fingerprint.slice(0, 16)}…` : 'Not started yet'}
            </Text>
            {identity?.fingerprint ? <IconButton icon="copy-outline" size={16} label="Copy fingerprint" onPress={copyFingerprint} /> : null}
          </View>
        </View>
      </Card>

      <SectionLabel>Network</SectionLabel>
      <Card className="gap-3">
        <View>
          <Text className="mb-1 text-sm text-muted-foreground">Listening port (default 53317)</Text>
          <TextInput
            value={portDraft}
            onChangeText={setPortDraft}
            onBlur={commitPort}
            onSubmitEditing={commitPort}
            keyboardType="number-pad"
            className="rounded-md border border-border bg-background px-3 py-2.5 text-base text-foreground"
          />
        </View>
        <View>
          <Text className="mb-1 text-sm text-muted-foreground">Local address (for troubleshooting)</Text>
          {addresses.length === 0 ? (
            <Text className="text-sm text-foreground">Unavailable</Text>
          ) : (
            addresses.map((addr) => (
              <Text key={addr} className="text-sm text-foreground">
                {addr}
              </Text>
            ))
          )}
        </View>
      </Card>

      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <View className="flex-row gap-2">
          {APPEARANCE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={settings?.appearance === opt.value ? 'primary' : 'secondary'}
              className="flex-1"
              onPress={() => updateSettings({ appearance: opt.value })}
            >
              {opt.label}
            </Button>
          ))}
        </View>
      </Card>

      <SectionLabel>Incoming transfers</SectionLabel>
      <Card className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-sm text-foreground">Always ask, even from trusted devices</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            Trusted only skips ambiguity in the device list — it never skips your consent.
          </Text>
        </View>
        <PlatformSwitch
          label="Always ask before accepting from trusted devices"
          value={settings?.requireConfirmationFromTrusted ?? true}
          onValueChange={(v) => updateSettings({ requireConfirmationFromTrusted: v })}
        />
      </Card>

      <SectionLabel>Trusted devices</SectionLabel>
      {trusted.length === 0 ? (
        <Card>
          <Text className="text-sm text-muted-foreground">No trusted devices yet.</Text>
        </Card>
      ) : (
        <View className="gap-2">
          {trusted.map((d) => (
            <Card key={d.deviceId} className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{d.alias}</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {d.fingerprint.slice(0, 20)}…
                </Text>
              </View>
              <IconButton icon="trash-outline" label={`Remove ${d.alias} from trusted devices`} onPress={() => untrust(d.deviceId)} />
            </Card>
          ))}
        </View>
      )}

      <SectionLabel>Advanced</SectionLabel>
      <Card className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-sm text-foreground">Reset local identity</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">Generates a new device ID and certificate.</Text>
        </View>
        <IconButton icon="refresh-outline" label="Reset local identity" onPress={confirmResetIdentity} />
      </Card>

      <View className="mt-6 items-center gap-1.5">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="shield-checkmark-outline" size={14} color="#a1a1aa" />
          <Text className="text-xs text-muted-foreground">heishare · local-network only, no account, no cloud</Text>
        </View>
        <Badge tone="neutral">v0.1.0</Badge>
      </View>
    </ScrollView>
  );
}
