import { TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { clampRemaining, getDayId } from "@/utils/time";

import type { Mode, Status, TimerState } from "@/types/pomodoro";

export type RestoreContext = {
  workMinutes: number;
  breakMinutes: number;
  dailyResetHour: number;
  now?: number;
};

export type TimerStateInput = {
  mode: Mode;
  status: Status;
  remainingSeconds: number;
  sessionsCompletedToday: number;
  sessionsCompletedDayId: string;
  dailyResetHour: number;
};

export type RestoreResult = { kind: "fresh"; dayId: string } | { kind: "restored"; state: TimerState };

export function alignCountToDay(
  count: number,
  dayId: string,
  now: Date,
  resetHour: number,
): { count: number; dayId: string } {
  const nextDayId = getDayId(now, resetHour);
  if (dayId === nextDayId) {
    return { count, dayId };
  }
  return { count: 0, dayId: nextDayId };
}

export function buildTimerState(input: TimerStateInput, now: Date = new Date()): TimerState {
  const aligned = alignCountToDay(
    input.sessionsCompletedToday,
    input.sessionsCompletedDayId,
    now,
    input.dailyResetHour,
  );

  return {
    mode: input.mode,
    status: input.status,
    remainingSeconds: input.remainingSeconds,
    sessionsCompletedToday: aligned.count,
    sessionsCompletedDayId: aligned.dayId,
    dailyResetHour: input.dailyResetHour,
    updatedAt: now.getTime(),
  };
}

export function saveTimerState(state: TimerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function restoreTimerState(raw: string | null, ctx: RestoreContext): RestoreResult {
  const now = ctx.now ?? Date.now();
  const dayId = getDayId(new Date(now), ctx.dailyResetHour);

  if (!raw) {
    return { kind: "fresh", dayId };
  }

  let parsed: Partial<TimerState>;
  try {
    parsed = JSON.parse(raw) as Partial<TimerState>;
  } catch {
    return { kind: "fresh", dayId };
  }

  const restoredMode: Mode = parsed.mode === "break" ? "break" : "work";
  const restoredStatus: Status = parsed.status === "running" || parsed.status === "paused" ? parsed.status : "idle";
  const maxSeconds = (restoredMode === "work" ? ctx.workMinutes : ctx.breakMinutes) * 60;

  let restoredCount = Number.isFinite(parsed.sessionsCompletedToday) ? (parsed.sessionsCompletedToday as number) : 0;
  let restoredDayId = typeof parsed.sessionsCompletedDayId === "string" ? parsed.sessionsCompletedDayId : dayId;

  if (restoredDayId !== dayId) {
    restoredCount = 0;
    restoredDayId = dayId;
  }

  let restoredRemaining = clampRemaining(
    parsed.remainingSeconds ?? maxSeconds,
    restoredStatus === "running",
    maxSeconds,
  );

  if (restoredStatus === "running") {
    const elapsed = Math.floor((now - (parsed.updatedAt ?? now)) / 1000);
    restoredRemaining = restoredRemaining - Math.max(0, elapsed);

    if (restoredRemaining <= 0) {
      const nextMode: Mode = restoredMode === "work" ? "break" : "work";
      if (restoredMode === "work") {
        restoredCount += 1;
      }

      return {
        kind: "restored",
        state: {
          mode: nextMode,
          status: "idle",
          remainingSeconds: (nextMode === "work" ? ctx.workMinutes : ctx.breakMinutes) * 60,
          sessionsCompletedToday: restoredCount,
          sessionsCompletedDayId: restoredDayId,
          dailyResetHour: ctx.dailyResetHour,
          updatedAt: now,
        },
      };
    }
  }

  return {
    kind: "restored",
    state: {
      mode: restoredMode,
      status: restoredStatus,
      remainingSeconds: restoredRemaining,
      sessionsCompletedToday: restoredCount,
      sessionsCompletedDayId: restoredDayId,
      dailyResetHour: ctx.dailyResetHour,
      updatedAt: now,
    },
  };
}
