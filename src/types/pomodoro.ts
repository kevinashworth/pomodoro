/*
Mode answers which Pomodoro phase? (work or break).
Status answers what is the timer doing? (idle, running, or paused).
Editing answers how is the user interacting with the timer right now? (can only edit when status !== "running")
*/

import type { SoundId } from "@/constants/sounds";

export type Editing = boolean;
export type Mode = "work" | "break";
export type Status = "idle" | "running" | "paused";

// User-controlled preferences, persisted under SETTINGS_STORAGE_KEY.
export type PomodoroSettings = {
  workMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  workEndSound: SoundId | null;
  breakEndSound: SoundId | null;
  notificationsEnabled: boolean;
  showTimerInMenuBar: boolean;
};

export type PomodoroSettingsContextValue = PomodoroSettings & {
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setWorkEndSound: (sound: SoundId | null) => void;
  setBreakEndSound: (sound: SoundId | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setShowTimerInMenuBar: (enabled: boolean) => void;
};

// Runtime state derived from running the timer, persisted under TIMER_STATE_STORAGE_KEY.
export type TimerState = {
  mode: Mode;
  status: Status;
  isEditing: Editing;
  remainingSeconds: number;
  sessionsCompletedToday: number;
  sessionsCompletedDayId: string;
  dailyResetHour: number;
  updatedAt: number;
};
