/**
 * Wire-format payload shapes for each endpoint in ENDPOINTS (constants.ts).
 * File payload bytes for /upload are NOT modeled here — that endpoint is raw
 * streamed bytes with metadata carried in headers, never JSON — see
 * 02-networking-architecture.md §2 (Layer C) and 06-performance-and-size.md §3.
 */

import type { DeviceCapabilities, DeviceType } from '@/types/device';

export interface RegisterRequestBody {
  deviceId: string;
  alias: string;
  deviceType: DeviceType;
  protocolVersion: string;
  port: number;
  fingerprint: string;
  capabilities: DeviceCapabilities;
}

export interface RegisterResponseBody {
  deviceId: string;
  alias: string;
  deviceType: DeviceType;
  protocolVersion: string;
  fingerprint: string;
  capabilities: DeviceCapabilities;
}

export interface PrepareUploadFileEntry {
  fileId: string;
  name: string;
  size: number;
  mimeType: string | null;
}

export interface PrepareUploadRequestBody {
  transferId: string;
  senderDeviceId: string;
  senderAlias: string;
  senderFingerprint: string;
  protocolVersion: string;
  files: PrepareUploadFileEntry[];
  totalBytes: number;
  textPreview: string | null;
  expiresAt: number;
}

export interface PrepareUploadResponseBody {
  transferId: string;
  accepted: boolean;
  /** Only present when accepted=true; per-file upload tokens/URLs are not
   *  needed since the versioned /upload endpoint is keyed by transferId+fileId. */
}

export interface CancelRequestBody {
  transferId: string;
  reason: 'sender_canceled' | 'receiver_canceled' | 'error';
}

export interface TextRequestBody {
  transferId: string;
  senderDeviceId: string;
  senderAlias: string;
  senderFingerprint: string;
  text: string;
  createdAt: number;
}

export interface InfoResponseBody {
  alias: string;
  deviceType: DeviceType;
  protocolVersion: string;
  fingerprint: string;
  capabilities: DeviceCapabilities;
  uptimeMs: number;
}
