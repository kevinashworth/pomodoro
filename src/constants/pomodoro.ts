import { DEFAULT_BREAK_END_SOUND, DEFAULT_TICK_SOUND, DEFAULT_WORK_END_SOUND } from "@/constants/sounds";

import type { PomodoroSettings, TimerState } from "@/types/pomodoro";

export const TIMER_STATE_STORAGE_KEY = "pomodoro.state.v4"; // timer state derived from running (version 4)
export const SETTINGS_STORAGE_KEY = "pomodoro.settings.v3"; // user preferences (version 3)

export const STROKE_WIDTH = 5;
export const RING_SIZE = 212;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const DEFAULT_WORK_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
// The pomodoro day starts at this hour (see `getDayId`).
export const DEFAULT_DAILY_RESET_HOUR = 3;

// Persisted-state defaults. `remainingSeconds` is omitted: a fresh timer starts
// at the configured duration of its phase.
export const DEFAULT_TIMER_STATE: Omit<TimerState, "updatedAt" | "remainingSeconds"> = {
  phase: "work",
  status: "idle",
  endAt: null,
  sessionsCompletedToday: 0,
  sessionsCompletedDayId: "",
};

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: DEFAULT_WORK_MINUTES,
  breakMinutes: DEFAULT_BREAK_MINUTES,
  soundEnabled: true,
  workEndSound: DEFAULT_WORK_END_SOUND,
  breakEndSound: DEFAULT_BREAK_END_SOUND,
  tickSound: DEFAULT_TICK_SOUND,
  notificationsEnabled: false,
  showTimerInMenuBar: false,
};
