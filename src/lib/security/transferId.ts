/**
 * Transfer ID generation and replay/expiration checks — see
 * 03-security-and-transfer-protocol.md §9.
 */

import * as Crypto from 'expo-crypto';

import { LIMITS, TRANSFER_ID_PATTERN } from '@/lib/protocol/constants';

export function generateTransferId(): string {
  return Crypto.randomUUID();
}

export function isValidTransferIdFormat(id: string): boolean {
  return TRANSFER_ID_PATTERN.test(id);
}

export function computeExpiresAt(nowMs: number = Date.now()): number {
  return nowMs + LIMITS.transferPreparationTtlMs;
}

export function isExpired(expiresAt: number, nowMs: number = Date.now()): boolean {
  return nowMs >= expiresAt;
}

/**
 * Tracks transfer IDs that have already reached a terminal state so a reused
 * ID (replay of a completed/canceled/expired preparation) is rejected — see
 * 03-security §9 ("Reject reused completed transfer IDs"). Bounded so a
 * malformed/malicious peer can't grow this set without limit.
 */
export class SeenTransferIdRegistry {
  private readonly seen = new Map<string, number>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  markSeen(transferId: string, atMs: number = Date.now()): void {
    if (this.seen.size >= this.maxEntries) {
      const oldestKey = this.seen.keys().next().value;
      if (oldestKey !== undefined) this.seen.delete(oldestKey);
    }
    this.seen.set(transferId, atMs);
  }

  hasBeenSeen(transferId: string): boolean {
    return this.seen.has(transferId);
  }
}
