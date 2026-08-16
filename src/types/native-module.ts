/**
 * Contract for the native networking bridge (Layer D — see
 * 02-networking-architecture.md §2). This is the ONLY interface the JS
 * application layer is allowed to depend on for sockets, TLS, multicast, or
 * file streaming.
 *
 * Production implementation: modules/local-network (Expo Module, Kotlin/Swift).
 * A dev-only mock exists at lib/networking/__dev__/mockLocalNetworkService.ts
 * for UI iteration in Expo Go / simulators where the native module isn't
 * built — it must never be reachable from production code paths. See
 * lib/networking/localNetworkService.ts for the selection wiring, and
 * README.md "Sandbox & dev-mode notes" for why this split exists.
 */

import type { DeviceCapabilities, DeviceType } from './device';

export interface StartConfig {
  deviceId: string;
  alias: string;
  deviceType: DeviceType;
  /** Falls back to DEFAULT_PORT (53317) when omitted or unavailable. */
  port?: number;
  capabilities: DeviceCapabilities;
}

export interface DiscoveryPayload {
  alias: string;
  protocolVersion: string;
  deviceType: DeviceType;
  port: number;
  protocol: 'https';
  fingerprint: string;
  capabilities: DeviceCapabilities;
  /** True for periodic announce, false for a one-shot "leaving" notice. */
  announce: boolean;
}

export interface NativePeerDeviceEvent {
  deviceId: string;
  alias: string;
  deviceType: DeviceType;
  host: string;
  port: number;
  protocol: 'https';
  fingerprint: string;
  protocolVersion: string;
  capabilities: DeviceCapabilities;
}

export type TransferProgressState =
  | 'transferring'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'canceled';

/**
 * Progress events are the ONLY thing that crosses the native→JS bridge
 * during an active transfer. Never raw bytes. Aggregated/coalesced natively
 * to ~10-20Hz — see 06-performance-and-size.md §4.
 */
export interface TransferProgress {
  transferId: string;
  fileId: string | null;
  bytesTransferred: number;
  totalBytes: number;
  state: TransferProgressState;
  errorCategory: TransferErrorCategory | null;
  errorMessage: string | null;
}

export type TransferErrorCategory =
  | 'network'
  | 'tls'
  | 'timeout'
  | 'storage'
  | 'integrity'
  | 'validation'
  | 'unknown';

/** Sender-side: fired when a peer responds to a prepare-upload we sent them. */
export interface TransferDecisionEvent {
  transferId: string;
  accepted: boolean;
}

export interface IncomingPrepareRequest {
  transferId: string;
  senderDeviceId: string;
  senderAlias: string;
  senderFingerprint: string;
  files: { fileId: string; name: string; size: number; mimeType: string | null }[];
  totalBytes: number;
  textPreview: string | null;
  expiresAt: number;
}

export interface SendFilesRequest {
  transferId: string;
  peerDeviceId: string;
  peerHost: string;
  peerPort: number;
  peerFingerprint: string;
  files: { fileId: string; uri: string; name: string; size: number; mimeType: string | null }[];
}

export interface SendTextRequest {
  transferId: string;
  peerDeviceId: string;
  peerHost: string;
  peerPort: number;
  peerFingerprint: string;
  text: string;
}

export interface LocalNetworkInfo {
  running: boolean;
  addresses: string[];
  port: number | null;
  fingerprint: string | null;
}

/**
 * JS-facing shape of the native module. Mirrors 05-project-structure-and-dependencies.md §8,
 * extended with the request/response calls the transfer pipeline needs.
 *
 * Every method returning a subscription follows the `() => void` unsubscribe
 * pattern rather than a named `off*` method, to match Expo Modules event
 * emitter conventions.
 */
export interface LocalNetworkService {
  start(config: StartConfig): Promise<void>;
  stop(): Promise<void>;
  getLocalAddresses(): Promise<string[]>;
  getInfo(): Promise<LocalNetworkInfo>;

  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  sendAnnouncement(payload: DiscoveryPayload): Promise<void>;

  /** Sender: submit prepare-upload metadata to a peer, awaiting its decision. */
  prepareUpload(request: SendFilesRequest): Promise<void>;
  /** Sender: begin the streaming upload once the receiver has accepted. */
  startUpload(transferId: string): Promise<void>;
  sendText(request: SendTextRequest): Promise<void>;

  /** Receiver: respond to an incoming prepare request. */
  respondToTransfer(transferId: string, accept: boolean): Promise<void>;

  cancelTransfer(transferId: string): Promise<void>;

  onDeviceDiscovered(listener: (device: NativePeerDeviceEvent) => void): () => void;
  onDeviceLost(listener: (deviceId: string) => void): () => void;
  onIncomingTransferRequest(listener: (request: IncomingPrepareRequest) => void): () => void;
  /** Sender-side counterpart to respondToTransfer on the receiver. */
  onTransferDecision(listener: (event: TransferDecisionEvent) => void): () => void;
  onTransferProgress(listener: (event: TransferProgress) => void): () => void;
  onServerError(listener: (error: { category: TransferErrorCategory; message: string }) => void): () => void;
}
