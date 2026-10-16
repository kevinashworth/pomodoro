import { createContext, useContext, type ReactNode } from "react";

import { usePomodoroTimerState, type PomodoroTimerState } from "@/hooks/use-pomodoro-timer";

const PomodoroTimerContext = createContext<PomodoroTimerState | null>(null);

export function PomodoroTimerProvider({ children }: { children: ReactNode }) {
  const value = usePomodoroTimerState();
  return <PomodoroTimerContext.Provider value={value}>{children}</PomodoroTimerContext.Provider>;
}

export function usePomodoroTimer(): PomodoroTimerState {
  const ctx = useContext(PomodoroTimerContext);
  if (!ctx) throw new Error("usePomodoroTimer must be used within a PomodoroTimerProvider");
  return ctx;
}
