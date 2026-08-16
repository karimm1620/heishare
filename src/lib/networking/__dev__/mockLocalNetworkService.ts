/**
 * ⚠️ DEV-ONLY. Do not import this outside localNetworkService.ts.
 *
 * This simulates discovery + transfer events entirely in memory so screens
 * can be iterated on in Expo Go / web / a simulator that doesn't have the
 * compiled native module (local-network) available yet.
 *
 * 02-networking-architecture.md and 08-master-ai-prompt.md are explicit that
 * production code must never fake the server with fetch() or simulated
 * discovery. This file exists only for local UI development and is gated
 * behind `__DEV__ && EXPO_PUBLIC_USE_MOCK_NETWORK === '1'` in
 * localNetworkService.ts — it is never reachable in a release build, and
 * never reachable in a dev build unless that env var is explicitly set.
 */

import type {
  IncomingPrepareRequest,
  LocalNetworkInfo,
  LocalNetworkService,
  NativePeerDeviceEvent,
  TransferDecisionEvent,
  TransferProgress,
} from '@/types/native-module';

type Listener<T> = (event: T) => void;

function createEventBus<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    emit: (event: T) => listeners.forEach((l) => l(event)),
    subscribe: (listener: Listener<T>) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const FAKE_PEER: NativePeerDeviceEvent = {
  deviceId: 'mock-peer-desktop-1',
  alias: "Simulated MacBook",
  deviceType: 'desktop',
  host: '192.0.2.10',
  port: 53317,
  protocol: 'https',
  fingerprint: '3f:aa:c1:04:mock:fingerprint:do:not:trust',
  protocolVersion: '1.0',
  capabilities: { receiveFiles: true, receiveText: true, maxConcurrentUploads: 1 },
};

export function createMockLocalNetworkService(): LocalNetworkService {
  console.warn(
    '[heishare] Using the DEV-ONLY mock LocalNetworkService. No real sockets are open; ' +
      'nothing here is reachable from another device. Set EXPO_PUBLIC_USE_MOCK_NETWORK=0 ' +
      '(or build a dev client with the native module) to use real networking.',
  );

  const deviceDiscovered = createEventBus<NativePeerDeviceEvent>();
  const deviceLost = createEventBus<string>();
  const incomingRequest = createEventBus<IncomingPrepareRequest>();
  const transferDecision = createEventBus<TransferDecisionEvent>();
  const progress = createEventBus<TransferProgress>();

  let discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function simulateUploadProgress(transferId: string, totalBytes: number) {
    let sent = 0;
    const tick = () => {
      sent = Math.min(totalBytes, sent + Math.max(1, Math.floor(totalBytes / 12)));
      progress.emit({
        transferId,
        fileId: null,
        bytesTransferred: sent,
        totalBytes,
        state: sent >= totalBytes ? 'verifying' : 'transferring',
        errorCategory: null,
        errorMessage: null,
      });
      if (sent >= totalBytes) {
        setTimeout(() => {
          progress.emit({
            transferId,
            fileId: null,
            bytesTransferred: totalBytes,
            totalBytes,
            state: 'completed',
            errorCategory: null,
            errorMessage: null,
          });
        }, 250);
        return;
      }
      setTimeout(tick, 180);
    };
    setTimeout(tick, 180);
  }

  return {
    async start() {
      running = true;
    },
    async stop() {
      running = false;
      if (discoveryTimer) clearTimeout(discoveryTimer);
    },
    async getLocalAddresses() {
      return ['192.0.2.42'];
    },
    async getInfo(): Promise<LocalNetworkInfo> {
      return { running, addresses: ['192.0.2.42'], port: 53317, fingerprint: 'mock-fingerprint' };
    },
    async startDiscovery() {
      discoveryTimer = setTimeout(() => deviceDiscovered.emit(FAKE_PEER), 900);
    },
    async stopDiscovery() {
      if (discoveryTimer) clearTimeout(discoveryTimer);
    },
    async sendAnnouncement() {},
    async prepareUpload(request) {
      // Simulates a peer that auto-accepts after a short delay, so the
      // sender-side UI (progress screen) is exercisable without a second
      // device. Also mirrors the request back as an "incoming" event so the
      // receiver-side sheet UI can be exercised from the same session.
      setTimeout(() => {
        incomingRequest.emit({
          transferId: request.transferId,
          senderDeviceId: 'mock-self',
          senderAlias: 'This device',
          senderFingerprint: 'mock-fingerprint',
          files: request.files.map((f) => ({ fileId: f.fileId, name: f.name, size: f.size, mimeType: f.mimeType })),
          totalBytes: request.files.reduce((sum, f) => sum + f.size, 0),
          textPreview: null,
          expiresAt: Date.now() + 120_000,
        });
      }, 400);
      setTimeout(() => transferDecision.emit({ transferId: request.transferId, accepted: true }), 1200);
    },
    async startUpload(transferId) {
      const totalBytes = 5_000_000;
      simulateUploadProgress(transferId, totalBytes);
    },
    async sendText() {},
    async respondToTransfer(transferId, accept) {
      if (accept) simulateUploadProgress(transferId, 1024);
    },
    async cancelTransfer(transferId) {
      progress.emit({
        transferId,
        fileId: null,
        bytesTransferred: 0,
        totalBytes: 0,
        state: 'canceled',
        errorCategory: null,
        errorMessage: null,
      });
    },
    onDeviceDiscovered: (listener) => deviceDiscovered.subscribe(listener),
    onDeviceLost: (listener) => deviceLost.subscribe(listener),
    onIncomingTransferRequest: (listener) => incomingRequest.subscribe(listener),
    onTransferDecision: (listener) => transferDecision.subscribe(listener),
    onTransferProgress: (listener) => progress.subscribe(listener),
    onServerError: () => () => {},
  };
}
