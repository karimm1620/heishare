import { NativeModule, requireNativeModule } from 'expo-modules-core';

import type {
  NativeDiscoveryPayload,
  NativeDeviceLostEvent,
  NativeIncomingPrepareRequestEvent,
  NativeLocalNetworkInfo,
  NativePeerDeviceEvent,
  NativeSendFilesRequest,
  NativeSendTextRequest,
  NativeServerErrorEvent,
  NativeStartConfig,
  NativeTransferDecisionEvent,
  NativeTransferProgressEvent,
} from './LocalNetwork.types';

export * from './LocalNetwork.types';

type LocalNetworkModuleEvents = {
  onDeviceDiscovered: (event: NativePeerDeviceEvent) => void;
  onDeviceLost: (event: NativeDeviceLostEvent) => void;
  onIncomingTransferRequest: (event: NativeIncomingPrepareRequestEvent) => void;
  onTransferDecision: (event: NativeTransferDecisionEvent) => void;
  onTransferProgress: (event: NativeTransferProgressEvent) => void;
  onServerError: (event: NativeServerErrorEvent) => void;
};

/**
 * Ambient shape of the native side (Android: LocalNetworkModule.kt, iOS:
 * LocalNetworkModule.swift). `requireNativeModule` throws at import time if
 * the native module isn't linked into the running binary — e.g. Expo Go,
 * or a dev client built before this module existed. Callers should go
 * through lib/networking/localNetworkService.ts rather than importing this
 * package directly, so that failure mode is handled in one place.
 */
declare class LocalNetworkNativeModule extends NativeModule<LocalNetworkModuleEvents> {
  start(config: NativeStartConfig): Promise<void>;
  stop(): Promise<void>;
  getLocalAddresses(): Promise<string[]>;
  getInfo(): Promise<NativeLocalNetworkInfo>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  sendAnnouncement(payload: NativeDiscoveryPayload): Promise<void>;
  prepareUpload(request: NativeSendFilesRequest): Promise<void>;
  startUpload(transferId: string): Promise<void>;
  sendText(request: NativeSendTextRequest): Promise<void>;
  respondToTransfer(transferId: string, accept: boolean): Promise<void>;
  cancelTransfer(transferId: string): Promise<void>;
}

export default requireNativeModule<LocalNetworkNativeModule>('LocalNetwork');
