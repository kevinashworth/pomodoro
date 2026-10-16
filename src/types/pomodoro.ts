export type Mode = "work" | "break";
export type Status = "idle" | "running" | "paused";

// User-controlled preferences, persisted under SETTINGS_STORAGE_KEY.
export type PomodoroSettings = {
  workMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showTimerInMenuBar: boolean;
};

export type PomodoroSettingsContextValue = PomodoroSettings & {
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setShowTimerInMenuBar: (enabled: boolean) => void;
};

// Runtime state derived from running the timer, persisted under TIMER_STATE_STORAGE_KEY.
export type TimerState = {
  mode: Mode;
  status: Status;
  remainingSeconds: number;
  endAt: number | null;
  sessionsCompletedToday: number;
  sessionsCompletedDayId: string;
  dailyResetHour: number;
  updatedAt: number;
};
