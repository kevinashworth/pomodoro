/*
Phase answers which Pomodoro phase? (work or break).
Status answers what is the timer doing? (idle, running, or paused).
Editing answers how is the user interacting with the timer right now? (can only edit when status !== "running")
*/

import type { SoundId } from "@/constants/sounds";

export type Editing = boolean;
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

// The timer snapshot persisted under TIMER_STATE_STORAGE_KEY. Restore prefers
// the exact fields: `endAt` while running and `remainingMs` while stopped.
// Older snapshots lack them and fall back to `remainingSeconds`.
export type TimerState = {
  phase: Phase;
  status: Status;
  remainingSeconds: number;
  // Wall-clock end time (ms) of a running phase; null otherwise.
  endAt: number | null;
  // Exact time left (ms) of a stopped phase; null while running.
  remainingMs: number | null;
  sessionsCompletedToday: number;
  sessionsCompletedDayId: string;
  updatedAt: number;
};
