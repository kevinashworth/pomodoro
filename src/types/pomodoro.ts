/*
Phase answers which Pomodoro phase? (work or break).
Status answers what is the timer doing? (idle, running, or paused).
*/

import type { SoundId } from "@/constants/sounds";

export type Phase = "work" | "break";
export type Status = "idle" | "running" | "paused";

// User-controlled preferences, persisted under SETTINGS_STORAGE_KEY.
export type PomodoroSettings = {
  workMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  workEndSound: SoundId | null;
  breakEndSound: SoundId | null;
  tickSound: SoundId | null;
  notificationsEnabled: boolean;
  showTimerInMenuBar: boolean;
};

export type PomodoroSettingsContextValue = PomodoroSettings & {
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setWorkEndSound: (sound: SoundId | null) => void;
  setBreakEndSound: (sound: SoundId | null) => void;
  setTickSound: (sound: SoundId | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setShowTimerInMenuBar: (enabled: boolean) => void;
};
