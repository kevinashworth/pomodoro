export type Mode = "work" | "break";
export type Status = "idle" | "running" | "paused";
export type AccentColors = { work: string; break: string; glow: string };

export type PersistedState = {
  mode: Mode;
  status: Status;
  remainingSeconds: number;
  completedToday: number;
  completedDayKey: string;
  dailyResetHour: number;
  updatedAt: number;
};
