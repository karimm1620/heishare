// Raw native ↔ JS payload shapes. These are intentionally close to what
// crosses the Expo Modules bridge (plain objects, no class instances). The
// typed, app-facing versions of these live in src/types/native-module.ts —
// keep both in sync when changing wire shape.

export type NativeDeviceType = 'mobile' | 'desktop' | 'web' | 'unknown';

export interface NativeCapabilities {
  receiveFiles: boolean;
  receiveText: boolean;
  maxConcurrentUploads: number;
}

export interface NativeStartConfig {
  deviceId: string;
  alias: string;
  deviceType: NativeDeviceType;
  port?: number;
  capabilities: NativeCapabilities;
}

export interface NativeDiscoveryPayload {
  alias: string;
  protocolVersion: string;
  deviceType: NativeDeviceType;
  port: number;
  protocol: 'https';
  fingerprint: string;
  capabilities: NativeCapabilities;
  announce: boolean;
}

export interface NativePeerDeviceEvent {
  deviceId: string;
  alias: string;
  deviceType: NativeDeviceType;
  host: string;
  port: number;
  protocol: 'https';
  fingerprint: string;
  protocolVersion: string;
  capabilities: NativeCapabilities;
}

export interface NativeDeviceLostEvent {
  deviceId: string;
}

export interface NativeTransferProgressEvent {
  transferId: string;
  fileId: string | null;
  bytesTransferred: number;
  totalBytes: number;
  state: 'transferring' | 'verifying' | 'completed' | 'failed' | 'canceled';
  errorCategory: string | null;
  errorMessage: string | null;
}

export interface NativeIncomingPrepareRequestEvent {
  transferId: string;
  senderDeviceId: string;
  senderAlias: string;
  senderFingerprint: string;
  files: Array<{ fileId: string; name: string; size: number; mimeType: string | null }>;
  totalBytes: number;
  textPreview: string | null;
  expiresAt: number;
}

export interface NativeTransferDecisionEvent {
  transferId: string;
  accepted: boolean;
}

export interface NativeServerErrorEvent {
  category: string;
  message: string;
}

export interface NativeLocalNetworkInfo {
  running: boolean;
  addresses: string[];
  port: number | null;
  fingerprint: string | null;
}

export interface NativeSendFilesRequest {
  transferId: string;
  peerDeviceId: string;
  peerHost: string;
  peerPort: number;
  peerFingerprint: string;
  files: Array<{ fileId: string; uri: string; name: string; size: number; mimeType: string | null }>;
}

export interface NativeSendTextRequest {
  transferId: string;
  peerDeviceId: string;
  peerHost: string;
  peerPort: number;
  peerFingerprint: string;
  text: string;
}

/** Event names emitted by the native module's EventEmitter. */
export const LOCAL_NETWORK_EVENTS = {
  onDeviceDiscovered: 'onDeviceDiscovered',
  onDeviceLost: 'onDeviceLost',
  onIncomingTransferRequest: 'onIncomingTransferRequest',
  onTransferDecision: 'onTransferDecision',
  onTransferProgress: 'onTransferProgress',
  onServerError: 'onServerError',
} as const;
