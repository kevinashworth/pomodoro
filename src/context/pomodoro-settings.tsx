import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_WORK_MINUTES,
  MAX_MINUTES,
  MIN_MINUTES,
  SETTINGS_STORAGE_KEY,
} from "@/constants/pomodoro";
import type { PomodoroSettings } from "@/types/pomodoro";

type PomodoroSettingsContextValue = PomodoroSettings & {
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setMini: (mini: boolean | ((prev: boolean) => boolean)) => void;
};

const PomodoroSettingsContext = createContext<PomodoroSettingsContextValue | null>(null);

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: DEFAULT_WORK_MINUTES,
  breakMinutes: DEFAULT_BREAK_MINUTES,
  soundEnabled: true,
  notificationsEnabled: false,
  mini: false,
};

function loadInitialSettings(): PomodoroSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return {
      workMinutes: clampMinutes(parsed.workMinutes ?? DEFAULT_SETTINGS.workMinutes),
      breakMinutes: clampMinutes(parsed.breakMinutes ?? DEFAULT_SETTINGS.breakMinutes),
      soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
      notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
      mini: parsed.mini ?? DEFAULT_SETTINGS.mini,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function PomodoroSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PomodoroSettings>(loadInitialSettings);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setWorkMinutes = useCallback((minutes: number) => {
    setSettings((prev) => ({ ...prev, workMinutes: clampMinutes(minutes) }));
  }, []);

  const setBreakMinutes = useCallback((minutes: number) => {
    setSettings((prev) => ({ ...prev, breakMinutes: clampMinutes(minutes) }));
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, soundEnabled: enabled }));
  }, []);

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, notificationsEnabled: enabled }));
  }, []);

  const setMini = useCallback((mini: boolean | ((prev: boolean) => boolean)) => {
    setSettings((prev) => ({
      ...prev,
      mini: typeof mini === "function" ? mini(prev.mini) : mini,
    }));
  }, []);

  return (
    <PomodoroSettingsContext.Provider
      value={{
        ...settings,
        setWorkMinutes,
        setBreakMinutes,
        setSoundEnabled,
        setNotificationsEnabled,
        setMini,
      }}
    >
      {children}
    </PomodoroSettingsContext.Provider>
  );
}

export function usePomodoroSettings(): PomodoroSettingsContextValue {
  const ctx = useContext(PomodoroSettingsContext);
  if (!ctx) {
    throw new Error("usePomodoroSettings must be used within a PomodoroSettingsProvider");
  }
  return ctx;
}

function clampMinutes(value: number): number {
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, value));
}
