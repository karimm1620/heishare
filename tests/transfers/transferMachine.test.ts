import { applyProgress, canTransition, isTerminal, transition } from '@/features/transfers/transferMachine';
import type { Transfer } from '@/types/transfer';

function makeTransfer(overrides: Partial<Transfer> = {}): Transfer {
  const now = Date.now();
  return {
    transferId: 't1',
    direction: 'outgoing',
    status: 'preparing',
    peerDeviceId: 'peer-1',
    peerAlias: 'Peer',
    peerFingerprint: 'aa:bb',
    files: [],
    totalBytes: 1000,
    bytesTransferred: 0,
    textPreview: null,
    createdAt: now,
    expiresAt: now + 60_000,
    updatedAt: now,
    error: null,
    ...overrides,
  };
}

describe('canTransition', () => {
  it('allows the documented happy path', () => {
    expect(canTransition('preparing', 'awaiting_acceptance')).toBe(true);
    expect(canTransition('awaiting_acceptance', 'accepted')).toBe(true);
    expect(canTransition('accepted', 'transferring')).toBe(true);
    expect(canTransition('transferring', 'verifying')).toBe(true);
    expect(canTransition('verifying', 'completed')).toBe(true);
  });

  it('rejects skipping a state', () => {
    expect(canTransition('preparing', 'completed')).toBe(false);
    expect(canTransition('awaiting_acceptance', 'transferring')).toBe(false);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(canTransition('completed', 'transferring')).toBe(false);
    expect(canTransition('failed', 'transferring')).toBe(false);
    expect(canTransition('canceled', 'awaiting_acceptance')).toBe(false);
  });
});

describe('isTerminal', () => {
  it('flags completed/rejected/canceled/failed/expired as terminal', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('rejected')).toBe(true);
    expect(isTerminal('canceled')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('expired')).toBe(true);
  });

  it('does not flag in-progress states as terminal', () => {
    expect(isTerminal('preparing')).toBe(false);
    expect(isTerminal('transferring')).toBe(false);
  });
});

describe('transition', () => {
  it('applies a legal transition', () => {
    const t = makeTransfer({ status: 'preparing' });
    const result = transition(t, 'awaiting_acceptance');
    expect(result?.status).toBe('awaiting_acceptance');
  });

  it('returns null for an illegal transition', () => {
    const t = makeTransfer({ status: 'preparing' });
    const result = transition(t, 'completed');
    expect(result).toBeNull();
  });

  it('returns null once the transfer is already terminal', () => {
    const t = makeTransfer({ status: 'completed' });
    const result = transition(t, 'failed');
    expect(result).toBeNull();
  });

  it('attaches an error payload on transition to failed', () => {
    const t = makeTransfer({ status: 'transferring' });
    const result = transition(t, 'failed', { error: { category: 'network', message: 'boom' } });
    expect(result?.error).toEqual({ category: 'network', message: 'boom' });
  });
});

describe('applyProgress', () => {
  it('advances bytesTransferred', () => {
    const t = makeTransfer({ bytesTransferred: 100, totalBytes: 1000 });
    const result = applyProgress(t, 500);
    expect(result.bytesTransferred).toBe(500);
  });

  it('never moves progress backwards on a stale/out-of-order event', () => {
    const t = makeTransfer({ bytesTransferred: 500, totalBytes: 1000 });
    const result = applyProgress(t, 200);
    expect(result.bytesTransferred).toBe(500);
  });

  it('clamps progress to totalBytes', () => {
    const t = makeTransfer({ bytesTransferred: 0, totalBytes: 1000 });
    const result = applyProgress(t, 5000);
    expect(result.bytesTransferred).toBe(1000);
  });
});
