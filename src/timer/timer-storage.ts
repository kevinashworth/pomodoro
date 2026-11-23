import { TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { advancePhase, dayIdAt, freshDay, type Durations, type TimerSnapshot } from "@/timer/timer-reducer";

import type { Phase } from "@/types/pomodoro";

// Saved under TIMER_STATE_STORAGE_KEY as is. A running clock is saved by its
// end time, so restore is exact. Bump the key when the shape changes.
export function saveTimerState(snapshot: TimerSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(snapshot));
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Rebuilds the timer from a saved snapshot. A snapshot from an earlier pomodoro
// day is discarded, so each day opens on a fresh work phase. A running timer
// resumes from its end time, and one that ended while the app was closed moves
// to the next phase, idle, at most once and without an announcement.
export function restoreTimerState(
  raw: string | null,
  { durations, now }: { durations: Durations; now: number },
): TimerSnapshot {
  const dayId = dayIdAt(now);
  const fresh = freshDay(dayId, durations);

  let saved: Partial<TimerSnapshot> | null;
  try {
    saved = raw ? (JSON.parse(raw) as Partial<TimerSnapshot>) : null;
  } catch {
    return fresh;
  }
  if (saved?.dayId !== dayId || !saved.clock) return fresh;

  const phase: Phase = saved.phase === "break" ? "break" : "work";
  const maxMs = durations[phase];
  const base = { phase, sessionsCompletedToday: finite(saved.sessionsCompletedToday) ?? 0, dayId };
  const clock = saved.clock;

  if (clock.status === "running") {
    const endAt = finite(clock.endAt);
    if (endAt === null) return fresh;
    // A phase cannot end later than a full duration from now, which also covers
    // a shortened setting or a clock that moved backward.
    const snapshot: TimerSnapshot = { ...base, clock: { status: "running", endAt: Math.min(endAt, now + maxMs) } };
    return endAt <= now ? advancePhase(snapshot, durations) : snapshot;
  }

  const remainingMs = finite(clock.remainingMs);
  if (remainingMs === null || (clock.status !== "idle" && clock.status !== "paused")) return fresh;
  return { ...base, clock: { status: clock.status, remainingMs: Math.max(0, Math.min(maxMs, remainingMs)) } };
}
