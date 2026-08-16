import { colorScheme } from 'nativewind';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadOrCreateDeviceIdentity } from '@/lib/storage/deviceIdentityStore';
import { defaultSettings, loadSettings, saveSettings } from '@/lib/storage/settingsStore';
import type { AppSettings } from '@/lib/storage/settingsStore';

interface SettingsContextValue {
  settings: AppSettings | null;
  isLoading: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const identity = await loadOrCreateDeviceIdentity();
      const loaded = await loadSettings(identity.alias);
      if (cancelled) return;
      setSettings(loaded);
      colorScheme.set(loaded.appearance);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const base = prev ?? defaultSettings('heishare device');
        const next = { ...base, ...patch };
        saveSettings(next);
        if (patch.appearance) colorScheme.set(patch.appearance);
        return next;
      });
    },
    [],
  );

  const value = useMemo(() => ({ settings, isLoading, updateSettings }), [settings, isLoading, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
