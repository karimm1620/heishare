jest.mock('expo-crypto', () => ({
  randomUUID: () => '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
}));

import { TRANSFER_ID_PATTERN } from '@/lib/protocol/constants';
import {
  computeExpiresAt,
  generateTransferId,
  isExpired,
  isValidTransferIdFormat,
  SeenTransferIdRegistry,
} from '@/lib/security/transferId';

describe('generateTransferId', () => {
  it('produces a v4-UUID-shaped id', () => {
    expect(TRANSFER_ID_PATTERN.test(generateTransferId())).toBe(true);
  });
});

describe('isValidTransferIdFormat', () => {
  it('accepts a valid UUID', () => {
    expect(isValidTransferIdFormat('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    expect(isValidTransferIdFormat('not-a-uuid')).toBe(false);
    expect(isValidTransferIdFormat('')).toBe(false);
  });
});

describe('computeExpiresAt / isExpired', () => {
  it('is not expired immediately after creation', () => {
    const now = 1_000_000;
    const expiresAt = computeExpiresAt(now);
    expect(isExpired(expiresAt, now)).toBe(false);
  });

  it('is expired once the TTL has elapsed', () => {
    const now = 1_000_000;
    const expiresAt = computeExpiresAt(now);
    expect(isExpired(expiresAt, expiresAt + 1)).toBe(true);
  });
});

describe('SeenTransferIdRegistry', () => {
  it('reports unseen ids as not seen', () => {
    const registry = new SeenTransferIdRegistry();
    expect(registry.hasBeenSeen('abc')).toBe(false);
  });

  it('reports a marked id as seen (replay protection)', () => {
    const registry = new SeenTransferIdRegistry();
    registry.markSeen('abc');
    expect(registry.hasBeenSeen('abc')).toBe(true);
  });

  it('evicts the oldest entry once the bound is reached', () => {
    const registry = new SeenTransferIdRegistry(2);
    registry.markSeen('a');
    registry.markSeen('b');
    registry.markSeen('c'); // should evict 'a'
    expect(registry.hasBeenSeen('a')).toBe(false);
    expect(registry.hasBeenSeen('b')).toBe(true);
    expect(registry.hasBeenSeen('c')).toBe(true);
  });
});
