import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeviceList } from '@/components/devices/DeviceList';
import { SelectedFileRow } from '@/components/files/SelectedFileRow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTrustedDevices } from '@/features/device/useTrustedDevices';
import { useDiscovery } from '@/features/discovery/DiscoveryProvider';
import type { PickedFile } from '@/features/transfers/TransfersProvider';
import { useTransfers } from '@/features/transfers/TransfersProvider';
import type { PeerDevice } from '@/types/device';
import { formatBytes } from '@/utils/format';

type Step = 'device' | 'content' | 'review';
type ContentMode = 'files' | 'text';

export default function SendScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId?: string }>();
  const { peers, discoveryState } = useDiscovery();
  const { trusted } = useTrustedDevices();
  const { sendFiles, sendText } = useTransfers();

  const preselected = useMemo(() => peers.find((p) => p.deviceId === deviceId) ?? null, [peers, deviceId]);
  const [selectedPeer, setSelectedPeer] = useState<PeerDevice | null>(preselected);
  const [step, setStep] = useState<Step>(preselected ? 'content' : 'device');
  const [mode, setMode] = useState<ContentMode>('files');
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [textDraft, setTextDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const trustedIds = useMemo(() => new Set(trusted.map((d) => d.deviceId)), [trusted]);
  const totalBytes = pickedFiles.reduce((sum, f) => sum + f.size, 0);
  const canContinueFromContent = mode === 'files' ? pickedFiles.length > 0 : textDraft.trim().length > 0;

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const next: PickedFile[] = result.assets.map((a) => ({
      uri: a.uri,
      name: a.name,
      size: a.size ?? 0,
      mimeType: a.mimeType ?? null,
    }));
    setPickedFiles((prev) => [...prev, ...next]);
  };

  const handleSend = async () => {
    if (!selectedPeer) return;
    setIsSending(true);
    try {
      const transferId =
        mode === 'files' ? await sendFiles(selectedPeer, pickedFiles) : await sendText(selectedPeer, textDraft.trim());
      router.replace({ pathname: '/transfer/[transferId]', params: { transferId } });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      {step === 'device' ? (
        <DeviceList
          peers={peers}
          discoveryState={discoveryState}
          trustedIds={trustedIds}
          onSelectPeer={(peer) => {
            setSelectedPeer(peer);
            setStep('content');
          }}
          ListHeaderComponent={
            <Text className="mb-2 mt-2 text-sm font-medium text-muted-foreground">Choose a device to send to</Text>
          }
        />
      ) : null}

      {step === 'content' && selectedPeer ? (
        <View className="flex-1 px-4 pt-2">
          <Text className="mb-3 text-sm text-muted-foreground">
            Sending to <Text className="font-medium text-foreground">{selectedPeer.alias}</Text>
          </Text>

          <View className="mb-3 flex-row gap-2">
            <Button size="sm" variant={mode === 'files' ? 'primary' : 'secondary'} className="flex-1" onPress={() => setMode('files')}>
              Files
            </Button>
            <Button size="sm" variant={mode === 'text' ? 'primary' : 'secondary'} className="flex-1" onPress={() => setMode('text')}>
              Text
            </Button>
          </View>

          {mode === 'files' ? (
            <ScrollView className="flex-1" contentContainerClassName="gap-2">
              <Button variant="secondary" onPress={pickFiles}>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="add-circle-outline" size={18} color="#18181b" />
                  <Text className="text-base font-medium text-foreground">Choose files</Text>
                </View>
              </Button>
              {pickedFiles.map((f, i) => (
                <SelectedFileRow
                  key={`${f.uri}-${i}`}
                  file={f}
                  onRemove={() => setPickedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                />
              ))}
            </ScrollView>
          ) : (
            <TextInput
              value={textDraft}
              onChangeText={setTextDraft}
              multiline
              placeholder="Type or paste text to send…"
              maxLength={100_000}
              textAlignVertical="top"
              className="flex-1 rounded-lg border border-border bg-card p-3 text-base text-foreground"
            />
          )}

          <View className="mt-3 flex-row gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => (preselected ? router.back() : setStep('device'))}
            >
              Back
            </Button>
            <Button className="flex-1" disabled={!canContinueFromContent} onPress={() => setStep('review')}>
              Review
            </Button>
          </View>
        </View>
      ) : null}

      {step === 'review' && selectedPeer ? (
        <View className="flex-1 justify-between px-4 pt-2 pb-2">
          <View>
            <Text className="mb-3 text-lg font-semibold text-foreground">Review</Text>
            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">To</Text>
                <Text className="text-sm font-medium text-foreground">{selectedPeer.alias}</Text>
              </View>
              {mode === 'files' ? (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Files</Text>
                    <Text className="text-sm font-medium text-foreground">{pickedFiles.length}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Total size</Text>
                    <Text className="text-sm font-medium text-foreground">{formatBytes(totalBytes)}</Text>
                  </View>
                </>
              ) : (
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">Text preview</Text>
                  <Text className="text-sm text-foreground" numberOfLines={4}>
                    {textDraft}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Security</Text>
                <Badge tone="success">HTTPS/TLS · local network only</Badge>
              </View>
            </Card>
          </View>

          <View className="flex-row gap-2">
            <Button variant="secondary" className="flex-1" onPress={() => setStep('content')} disabled={isSending}>
              Back
            </Button>
            <Button className="flex-1" onPress={handleSend} loading={isSending}>
              Send
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
