import type { Transfer } from '@/types/transfer';

import { readJson, STORAGE_KEYS, writeJson } from './jsonStore';

/** Keeps AsyncStorage bounded regardless of how long the app has been used. */
const MAX_HISTORY_ENTRIES = 200;

export async function loadHistory(): Promise<Transfer[]> {
  return readJson<Transfer[]>(STORAGE_KEYS.history, []);
}

export async function appendHistoryEntry(transfer: Transfer): Promise<Transfer[]> {
  const current = await loadHistory();
  const next = [transfer, ...current.filter((t) => t.transferId !== transfer.transferId)].slice(
    0,
    MAX_HISTORY_ENTRIES,
  );
  await writeJson(STORAGE_KEYS.history, next);
  return next;
}

export async function clearHistory(): Promise<void> {
  await writeJson<Transfer[]>(STORAGE_KEYS.history, []);
}
