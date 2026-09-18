export type Mode = "work" | "break";
export type Status = "idle" | "running" | "paused";
export type AccentColors = { work: string; break: string; glow: string };

export type PersistedState = {
  mode: Mode;
  status: Status;
  remainingSeconds: number;
  sessionsCompletedToday: number;
  sessionsCompletedDayId: string;
  dailyResetHour: number;
  updatedAt: number;
};
