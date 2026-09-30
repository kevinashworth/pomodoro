import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { DEFAULT_SETTINGS, MAX_MINUTES, MIN_MINUTES, SETTINGS_STORAGE_KEY } from "@/constants/pomodoro";
import type { PomodoroSettings, PomodoroSettingsContextValue } from "@/types/pomodoro";

const PomodoroSettingsContext = createContext<PomodoroSettingsContextValue | null>(null);

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

  return (
    <PomodoroSettingsContext.Provider
      value={{
        ...settings,
        setWorkMinutes,
        setBreakMinutes,
        setSoundEnabled,
        setNotificationsEnabled,
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
