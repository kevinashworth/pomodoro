import { TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { getDayId } from "@/utils/time";
import { clampRemainingForStatus } from "@/utils/timer-utils";

import type { Mode, Status, TimerState } from "@/types/pomodoro";

export type RestoreContext = {
  workMinutes: number;
  breakMinutes: number;
  dailyResetHour: number;
  now?: number;
};

export type TimerStateInput = Omit<TimerState, "updatedAt">;

export type RestoreResult = { kind: "fresh"; dayId: string } | { kind: "restored"; state: TimerState };

export function saveTimerState(input: TimerStateInput): void {
  if (typeof window === "undefined") return;
  const state: TimerState = { ...input, updatedAt: Date.now() };
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

  let restoredRemaining = clampRemainingForStatus(parsed.remainingSeconds ?? maxSeconds, restoredStatus, maxSeconds);

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
          isEditing: false,
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
      isEditing: false,
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
