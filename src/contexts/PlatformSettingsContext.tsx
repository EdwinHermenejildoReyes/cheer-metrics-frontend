'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import settingsRepository from '@/repositories/settingsRepository';
import { DEFAULT_PLATFORM_SETTINGS, PLT_VAR_MAP } from '@/types/settings';
import type { PlatformSettings } from '@/types/settings';

interface PlatformSettingsContextValue {
  settings: PlatformSettings;
  applySettings: (s: PlatformSettings) => void;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue>({
  settings:      DEFAULT_PLATFORM_SETTINGS,
  applySettings: () => {},
});

function applyToDom(s: PlatformSettings) {
  const root = document.documentElement;
  (Object.keys(s) as Array<keyof PlatformSettings>).forEach((key) => {
    root.style.setProperty(PLT_VAR_MAP[key], s[key]);
  });
}

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);

  useEffect(() => {
    settingsRepository.getSettings()
      .then((res) => {
        setSettings(res.data);
        applyToDom(res.data);
      })
      .catch(() => {
        applyToDom(DEFAULT_PLATFORM_SETTINGS);
      });
  }, []);

  const applySettings = (s: PlatformSettings) => {
    setSettings(s);
    applyToDom(s);
  };

  return (
    <PlatformSettingsContext.Provider value={{ settings, applySettings }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  return useContext(PlatformSettingsContext);
}
