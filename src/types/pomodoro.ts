export type Mode = "work" | "break";
export type Status = "idle" | "running" | "paused";
export type AccentPreset = "classic" | "sunset" | "ocean";
export type AccentColors = { work: string; break: string; glow: string };

export type PersistedState = {
  mode: Mode;
  status: Status;
  remainingSeconds: number;
  workMinutes: number;
  breakMinutes: number;
  completedToday: number;
  completedDayKey: string;
  dailyResetHour: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  accentPreset: AccentPreset;
  updatedAt: number;
};
