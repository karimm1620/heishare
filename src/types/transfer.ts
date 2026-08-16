/**
 * Transfer domain types.
 *
 * A `Transfer` models one preparation → (accept|reject) → stream → verify →
 * commit lifecycle, in either direction. See 02-networking-architecture.md §7
 * and 03-security-and-transfer-protocol.md §5–7 for the pipeline this mirrors.
 */

export type TransferDirection = 'outgoing' | 'incoming';

/**
 * Every status the union can be in. Kept flat (not nested per-direction)
 * because the UI, history store, and progress components all key off this
 * single field regardless of direction.
 */
export type TransferStatus =
  | 'preparing' // sender only: building the prepare-upload request
  | 'awaiting_acceptance' // sent/received prepare request, waiting on receiver
  | 'accepted' // receiver accepted, upload has not started streaming yet
  | 'transferring' // bytes actively streaming
  | 'verifying' // all bytes received, digest check in progress
  | 'completed' // committed to final destination (outgoing: receiver confirmed)
  | 'rejected' // receiver explicitly rejected
  | 'canceled' // sender or receiver canceled
  | 'failed' // network/TLS/storage/digest failure
  | 'expired'; // prepare request expired before acceptance

export const TERMINAL_TRANSFER_STATUSES: ReadonlySet<TransferStatus> = new Set([
  'completed',
  'rejected',
  'canceled',
  'failed',
  'expired',
]);

export interface TransferFileMeta {
  fileId: string;
  name: string;
  /** Sanitized display/destination name — see lib/security/filename. */
  safeName: string;
  size: number;
  mimeType: string | null;
  /** Populated once the sender has hashed the file (incremental, native side). */
  expectedSha256: string | null;
  /** Bytes confirmed written/sent for this specific file. */
  bytesTransferred: number;
}

export interface TransferError {
  category:
    | 'network'
    | 'tls'
    | 'timeout'
    | 'rejected'
    | 'canceled'
    | 'storage'
    | 'integrity'
    | 'validation'
    | 'unknown';
  /** Human-readable, safe to show directly in UI — never a raw stack trace. */
  message: string;
}

export interface Transfer {
  transferId: string;
  direction: TransferDirection;
  status: TransferStatus;
  peerDeviceId: string;
  peerAlias: string;
  peerFingerprint: string;
  files: TransferFileMeta[];
  totalBytes: number;
  bytesTransferred: number;
  textPreview: string | null;
  createdAt: number;
  /** Preparation requests are short-lived — see 03-security §9 (replay protection). */
  expiresAt: number;
  updatedAt: number;
  error: TransferError | null;
}

/** Legal state transitions, enforced by features/transfers/transferMachine.ts. */
export const TRANSFER_TRANSITIONS: Readonly<Record<TransferStatus, readonly TransferStatus[]>> = {
  preparing: ['awaiting_acceptance', 'failed', 'canceled'],
  awaiting_acceptance: ['accepted', 'rejected', 'expired', 'canceled', 'failed'],
  accepted: ['transferring', 'canceled', 'failed'],
  transferring: ['verifying', 'canceled', 'failed'],
  verifying: ['completed', 'failed'],
  completed: [],
  rejected: [],
  canceled: [],
  failed: [],
  expired: [],
};
