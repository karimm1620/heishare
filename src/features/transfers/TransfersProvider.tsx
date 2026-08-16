import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { localNetworkService } from '@/lib/networking/localNetworkService';
import { sanitizeFileName } from '@/lib/security/filename';
import { computeExpiresAt, generateTransferId } from '@/lib/security/transferId';
import { appendHistoryEntry } from '@/lib/storage/historyStore';
import type { PeerDevice } from '@/types/device';
import type { Transfer, TransferError, TransferFileMeta } from '@/types/transfer';

import { applyProgress, isTerminal, transition } from './transferMachine';

/** A file the user picked, before it becomes a TransferFileMeta. */
export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string | null;
}

interface TransfersContextValue {
  transfers: Transfer[];
  sendFiles: (peer: PeerDevice, files: PickedFile[]) => Promise<string>;
  sendText: (peer: PeerDevice, text: string) => Promise<string>;
  respondToIncoming: (transferId: string, accept: boolean) => Promise<void>;
  cancelTransfer: (transferId: string) => Promise<void>;
  getTransfer: (transferId: string) => Transfer | undefined;
}

const TransfersContext = createContext<TransfersContextValue | null>(null);

/** Expired/awaiting-acceptance sweep — see 03-security-and-transfer-protocol.md §9. */
const EXPIRY_SWEEP_INTERVAL_MS = 5_000;

export function TransfersProvider({ children }: { children: React.ReactNode }) {
  const [transfersById, setTransfersById] = useState<Map<string, Transfer>>(new Map());
  const transfersRef = useRef(transfersById);
  transfersRef.current = transfersById;

  const updateTransfer = useCallback((transferId: string, updater: (t: Transfer) => Transfer | null) => {
    setTransfersById((prev) => {
      const current = prev.get(transferId);
      if (!current) return prev;
      const next = updater(current);
      if (!next) return prev;
      const map = new Map(prev);
      map.set(transferId, next);
      if (isTerminal(next.status)) {
        appendHistoryEntry(next).catch(() => {});
      }
      return map;
    });
  }, []);

  const insertTransfer = useCallback((transfer: Transfer) => {
    setTransfersById((prev) => {
      const map = new Map(prev);
      map.set(transfer.transferId, transfer);
      return map;
    });
  }, []);

  // --- native event wiring --------------------------------------------
  useEffect(() => {
    const unsubscribeIncoming = localNetworkService.onIncomingTransferRequest((request) => {
      const files: TransferFileMeta[] = request.files.map((f) => ({
        fileId: f.fileId,
        name: f.name,
        safeName: sanitizeFileName(f.name),
        size: f.size,
        mimeType: f.mimeType,
        expectedSha256: null,
        bytesTransferred: 0,
      }));
      const now = Date.now();
      insertTransfer({
        transferId: request.transferId,
        direction: 'incoming',
        status: 'awaiting_acceptance',
        peerDeviceId: request.senderDeviceId,
        peerAlias: request.senderAlias,
        peerFingerprint: request.senderFingerprint,
        files,
        totalBytes: request.totalBytes,
        bytesTransferred: 0,
        textPreview: request.textPreview,
        createdAt: now,
        expiresAt: request.expiresAt,
        updatedAt: now,
        error: null,
      });
    });

    const unsubscribeDecision = localNetworkService.onTransferDecision(({ transferId, accepted }) => {
      updateTransfer(transferId, (t) => {
        if (!accepted) return transition(t, 'rejected');
        const accepted_ = transition(t, 'accepted');
        if (!accepted_) return null;
        localNetworkService.startUpload(transferId).catch(() => {});
        return transition(accepted_, 'transferring') ?? accepted_;
      });
    });

    const unsubscribeProgress = localNetworkService.onTransferProgress((event) => {
      updateTransfer(event.transferId, (t) => {
        let next: Transfer | null = t;

        if (event.state === 'failed') {
          const error: TransferError = {
            category: event.errorCategory ?? 'unknown',
            message: event.errorMessage ?? 'The transfer failed.',
          };
          return transition(t, 'failed', { error });
        }
        if (event.state === 'canceled') {
          return transition(t, 'canceled');
        }

        next = applyProgress(next, event.bytesTransferred);

        if (event.state === 'verifying' && next.status === 'transferring') {
          next = transition(next, 'verifying') ?? next;
        }
        if (event.state === 'completed') {
          if (next.status === 'transferring') next = transition(next, 'verifying') ?? next;
          if (next.status === 'verifying') next = transition(next, 'completed') ?? next;
        }
        return next;
      });
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeDecision();
      unsubscribeProgress();
    };
  }, [insertTransfer, updateTransfer]);

  // --- expiry sweep ------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const t of transfersRef.current.values()) {
        if (t.status === 'awaiting_acceptance' && now >= t.expiresAt) {
          updateTransfer(t.transferId, (current) => transition(current, 'expired'));
        }
      }
    }, EXPIRY_SWEEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [updateTransfer]);

  // --- public actions ------------------------------------------------------
  const sendFiles = useCallback(async (peer: PeerDevice, pickedFiles: PickedFile[]): Promise<string> => {
    const transferId = generateTransferId();
    const files: TransferFileMeta[] = pickedFiles.map((f) => ({
      fileId: Crypto.randomUUID(),
      name: f.name,
      safeName: sanitizeFileName(f.name),
      size: f.size,
      mimeType: f.mimeType,
      expectedSha256: null,
      bytesTransferred: 0,
    }));
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    const now = Date.now();

    insertTransfer({
      transferId,
      direction: 'outgoing',
      status: 'preparing',
      peerDeviceId: peer.deviceId,
      peerAlias: peer.alias,
      peerFingerprint: peer.fingerprint,
      files,
      totalBytes,
      bytesTransferred: 0,
      textPreview: null,
      createdAt: now,
      expiresAt: computeExpiresAt(now),
      updatedAt: now,
      error: null,
    });

    try {
      await localNetworkService.prepareUpload({
        transferId,
        peerDeviceId: peer.deviceId,
        peerHost: peer.host,
        peerPort: peer.port,
        peerFingerprint: peer.fingerprint,
        files: files.map((f, i) => ({
          fileId: f.fileId,
          uri: pickedFiles[i].uri,
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
      });
      updateTransfer(transferId, (t) => transition(t, 'awaiting_acceptance'));
    } catch (e) {
      updateTransfer(transferId, (t) =>
        transition(t, 'failed', {
          error: { category: 'network', message: e instanceof Error ? e.message : 'Could not reach that device.' },
        }),
      );
    }

    return transferId;
  }, [insertTransfer, updateTransfer]);

  const sendText = useCallback(async (peer: PeerDevice, text: string): Promise<string> => {
    const transferId = generateTransferId();
    const now = Date.now();
    const bytes = new TextEncoder().encode(text).length;

    insertTransfer({
      transferId,
      direction: 'outgoing',
      status: 'preparing',
      peerDeviceId: peer.deviceId,
      peerAlias: peer.alias,
      peerFingerprint: peer.fingerprint,
      files: [],
      totalBytes: bytes,
      bytesTransferred: 0,
      textPreview: text.slice(0, 512),
      createdAt: now,
      expiresAt: computeExpiresAt(now),
      updatedAt: now,
      error: null,
    });

    try {
      await localNetworkService.sendText({
        transferId,
        peerDeviceId: peer.deviceId,
        peerHost: peer.host,
        peerPort: peer.port,
        peerFingerprint: peer.fingerprint,
        text,
      });
      updateTransfer(transferId, (t) => transition(t, 'awaiting_acceptance'));
    } catch (e) {
      updateTransfer(transferId, (t) =>
        transition(t, 'failed', {
          error: { category: 'network', message: e instanceof Error ? e.message : 'Could not reach that device.' },
        }),
      );
    }

    return transferId;
  }, [insertTransfer, updateTransfer]);

  const respondToIncoming = useCallback(async (transferId: string, accept: boolean) => {
    try {
      await localNetworkService.respondToTransfer(transferId, accept);
      updateTransfer(transferId, (t) => transition(t, accept ? 'accepted' : 'rejected'));
    } catch (e) {
      updateTransfer(transferId, (t) =>
        transition(t, 'failed', {
          error: { category: 'network', message: e instanceof Error ? e.message : 'Could not respond to the sender.' },
        }),
      );
    }
  }, [updateTransfer]);

  const cancelTransfer = useCallback(async (transferId: string) => {
    try {
      await localNetworkService.cancelTransfer(transferId);
    } finally {
      updateTransfer(transferId, (t) => transition(t, 'canceled'));
    }
  }, [updateTransfer]);

  const getTransfer = useCallback((transferId: string) => transfersRef.current.get(transferId), []);

  const value = useMemo<TransfersContextValue>(() => {
    const transfers = Array.from(transfersById.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    return { transfers, sendFiles, sendText, respondToIncoming, cancelTransfer, getTransfer };
  }, [transfersById, sendFiles, sendText, respondToIncoming, cancelTransfer, getTransfer]);

  return <TransfersContext.Provider value={value}>{children}</TransfersContext.Provider>;
}

export function useTransfers(): TransfersContextValue {
  const ctx = useContext(TransfersContext);
  if (!ctx) throw new Error('useTransfers must be used within TransfersProvider');
  return ctx;
}
