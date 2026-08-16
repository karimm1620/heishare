import { DEFAULT_PORT } from '@/lib/protocol/constants';

import { readJson, STORAGE_KEYS, writeJson } from './jsonStore';

export type AppearanceMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  alias: string;
  port: number;
  appearance: AppearanceMode;
  /** Ask for confirmation even from trusted devices (default true — trusted
   *  only skips *discovery ambiguity*, never skips consent, see 04-ui-ux.md §6). */
  requireConfirmationFromTrusted: boolean;
}

export function defaultSettings(alias: string): AppSettings {
  return {
    alias,
    port: DEFAULT_PORT,
    appearance: 'system',
    requireConfirmationFromTrusted: true,
  };
}

export async function loadSettings(fallbackAlias: string): Promise<AppSettings> {
  return readJson<AppSettings>(STORAGE_KEYS.settings, defaultSettings(fallbackAlias));
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeJson(STORAGE_KEYS.settings, settings);
}
