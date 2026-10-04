import type { PomodoroSettings, TimerState } from "@/types/pomodoro";

export const TIMER_STATE_STORAGE_KEY = "pomodoro.state.v3"; // timer state derived from running (version 3)
export const SETTINGS_STORAGE_KEY = "pomodoro.settings.v3"; // user preferences (version 3)

export const STROKE_WIDTH = 5;
export const RING_SIZE = 212;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const DEFAULT_WORK_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const DEFAULT_DAILY_RESET_HOUR = 3;

export const DEFAULT_TIMER_STATE: Omit<TimerState, "updatedAt"> = {
  mode: "work",
  status: "idle",
  remainingSeconds: DEFAULT_WORK_MINUTES * 60,
  sessionsCompletedToday: 0,
  sessionsCompletedDayId: "",
  dailyResetHour: DEFAULT_DAILY_RESET_HOUR,
};

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: DEFAULT_WORK_MINUTES,
  breakMinutes: DEFAULT_BREAK_MINUTES,
  soundEnabled: true,
  notificationsEnabled: false,
};

export const COLORS = {
  work: "#4f9ad8",
  break: "#58c7a6",
};

export const CONTROL_CLASS = "size-12 stroke-2";
