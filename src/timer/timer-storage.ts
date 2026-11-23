import { TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import {
  advancePhase,
  dayIdAt,
  freshDay,
  remainingSecondsUntil,
  type Durations,
  type TimerSnapshot,
} from "@/timer/timer-reducer";

import type { Phase, Status, TimerState } from "@/types/pomodoro";

export type TimerStateInput = Omit<TimerState, "remainingSeconds" | "updatedAt">;

export function saveTimerState(input: TimerStateInput, now = Date.now()): void {
  if (typeof window === "undefined") return;
  // `remainingSeconds` is for older readers and for people inspecting storage.
  const remainingSeconds =
    input.endAt !== null ? remainingSecondsUntil(input.endAt, now) : Math.ceil((input.remainingMs ?? 0) / 1000);
  const state: TimerState = { ...input, remainingSeconds, updatedAt: now };
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(state));
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Rebuilds the timer from a saved snapshot. A snapshot from an earlier pomodoro
// day is discarded, so each day opens on a fresh work phase. A running timer
// resumes from its saved end time, and one that ended while the app was closed
// moves to the next phase, idle, at most once and without an announcement.
export function restoreTimerState(
  raw: string | null,
  { durations, now }: { durations: Durations; now: number },
): TimerSnapshot {
  const dayId = dayIdAt(now);
  const fresh = freshDay(dayId, durations);
  if (!raw) return fresh;

  let parsed: Partial<TimerState>;
  try {
    parsed = JSON.parse(raw) as Partial<TimerState>;
  } catch {
    return fresh;
  }

  const savedAt = finite(parsed.updatedAt);
  if (savedAt === null || dayIdAt(savedAt) !== dayId) return fresh;

  const phase: Phase = parsed.phase === "break" ? "break" : "work";
  const status: Status = parsed.status === "running" || parsed.status === "paused" ? parsed.status : "idle";
  const maxMs = durations[phase] * 1000;
  const sameDayCount = parsed.sessionsCompletedDayId === dayId || typeof parsed.sessionsCompletedDayId !== "string";
  const sessionsCompletedToday = sameDayCount ? (finite(parsed.sessionsCompletedToday) ?? 0) : 0;

  const savedSeconds = finite(parsed.remainingSeconds);
  const savedMs = finite(parsed.remainingMs) ?? (savedSeconds === null ? maxMs : savedSeconds * 1000);
  const stoppedMs = Math.max(0, Math.min(maxMs, savedMs));

  if (status !== "running") {
    return { phase, clock: { status, remainingMs: stoppedMs }, sessionsCompletedToday, dayId };
  }

  // Older snapshots have no `endAt`; their remaining time was current when saved.
  const savedEndAt = finite(parsed.endAt) ?? savedAt + Math.max(1000, stoppedMs);
  // A phase cannot end later than a full duration from now, which also covers a
  // shortened setting or a clock that moved backward.
  const endAt = Math.min(savedEndAt, now + maxMs);
  const snapshot: TimerSnapshot = {
    phase,
    clock: { status: "running", endAt, syncedAt: now },
    sessionsCompletedToday,
    dayId,
  };
  return endAt <= now ? advancePhase(snapshot, durations) : snapshot;
}
