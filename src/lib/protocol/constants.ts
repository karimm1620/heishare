/**
 * Versioned LocalShare-family protocol constants for heishare.
 *
 * heishare does not claim LocalSend interoperability (see 02-networking-architecture.md §10)
 * — it follows the same local-network *architecture* (UDP multicast discovery,
 * REST-style HTTPS API, port 53317) with its own versioned namespace.
 */

export const PROTOCOL_VERSION = '1.0';

export const DEFAULT_PORT = 53317;

/** Reference multicast group per 02-networking-architecture.md §4. */
export const MULTICAST_GROUP = '224.0.0.167';

export const API_NAMESPACE = '/api/heishare/v1';

export const ENDPOINTS = {
  register: `${API_NAMESPACE}/register`,
  prepareUpload: `${API_NAMESPACE}/prepare-upload`,
  upload: `${API_NAMESPACE}/upload`,
  cancel: `${API_NAMESPACE}/cancel`,
  text: `${API_NAMESPACE}/text`,
  info: `${API_NAMESPACE}/info`,
} as const;

/** Resource/request limits — see 03-security-and-transfer-protocol.md §10. */
export const LIMITS = {
  /** Max bytes for a JSON metadata body (register/prepare-upload/cancel/text). */
  maxMetadataBodyBytes: 64 * 1024,
  /** Max UTF-16 code units for a single text-transfer payload. */
  maxTextPayloadLength: 100_000,
  /** Max files in one prepare-upload request. */
  maxFilesPerTransfer: 200,
  /** Max simultaneous incoming preparations awaiting a user decision. */
  maxPendingIncomingPreparations: 10,
  /** Max simultaneous active uploads (sending or receiving). */
  maxSimultaneousUploads: 3,
  /** Preparation requests are rejected once older than this. */
  transferPreparationTtlMs: 2 * 60 * 1000,
  /** Idle socket connection timeout. */
  connectionIdleTimeoutMs: 30 * 1000,
  /** Discovery announcement payload cap — keep packets small, see 06-performance-and-size.md §5. */
  maxDiscoveryPacketBytes: 2 * 1024,
} as const;

export const TRANSFER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const FILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
