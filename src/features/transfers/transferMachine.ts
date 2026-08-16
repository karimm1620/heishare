/**
 * Deterministic transfer state machine — see 02-networking-architecture.md §11
 * ("Prefer deterministic state machines over ad-hoc booleans") and the Phase 2
 * definition of done ("Transfer state cannot skip illegal transitions").
 *
 * Pure functions only: no I/O, no native calls. TransfersProvider is the only
 * caller in the app; tests/transfers/transferMachine.test.ts exercises this
 * directly.
 */

import { TERMINAL_TRANSFER_STATUSES, TRANSFER_TRANSITIONS } from '@/types/transfer';
import type { Transfer, TransferError, TransferStatus } from '@/types/transfer';

export function isTerminal(status: TransferStatus): boolean {
  return TERMINAL_TRANSFER_STATUSES.has(status);
}

export function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  return TRANSFER_TRANSITIONS[from].includes(to);
}

/**
 * Applies a status transition, returning the updated transfer or `null` if
 * the transition is illegal — callers must decide how to handle a rejected
 * transition (typically: log + ignore the event, never crash).
 */
export function transition(
  transfer: Transfer,
  to: TransferStatus,
  patch: Partial<Pick<Transfer, 'bytesTransferred' | 'error'>> = {},
): Transfer | null {
  if (isTerminal(transfer.status)) return null;
  if (!canTransition(transfer.status, to)) return null;

  return {
    ...transfer,
    ...patch,
    status: to,
    updatedAt: Date.now(),
  };
}

export function withError(transfer: Transfer, error: TransferError): Transfer | null {
  return transition(transfer, 'failed', { error });
}

/** Clamped, monotonic byte-progress update — never lets a stale/out-of-order
 *  event move progress backwards. */
export function applyProgress(transfer: Transfer, bytesTransferred: number): Transfer {
  const clamped = Math.max(transfer.bytesTransferred, Math.min(bytesTransferred, transfer.totalBytes));
  if (clamped === transfer.bytesTransferred) return transfer;
  return { ...transfer, bytesTransferred: clamped, updatedAt: Date.now() };
}
