import type { PersistedState } from "@/types/pomodoro";

export const POMODORO_STORAGE_KEY = "pomodoro.main.v3"; // pomodoro timer state (version 3)
export const SETTINGS_STORAGE_KEY = "pomodoro.settings.v1"; // user preferences (version 1)

export const STROKE_WIDTH = 5;
export const DEFAULT_RING_SIZE = 212;
export const MINI_RING_SIZE = 140;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const DEFAULT_WORK_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;

export const DEFAULT_PERSISTED_STATE: Omit<PersistedState, "updatedAt"> = {
  mode: "work",
  status: "idle",
  remainingSeconds: DEFAULT_WORK_MINUTES * 60,
  sessionsCompletedToday: 0,
  sessionsCompletedDayId: "",
  dailyResetHour: 3,
};

export const COLORS = {
  work: "#4f9ad8",
  break: "#58c7a6",
};
