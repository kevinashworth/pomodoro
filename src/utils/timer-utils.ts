import type { Status } from "@/types/pomodoro";

export function minRemainingSeconds(status: Status): number {
  // While running, `remainingSeconds === 0` is the sentinel that ends the phase
  // (see use-pomodoro-timer). A user-edited value must therefore never reach 0
  // while running, so the floor is 1; idle/paused timers may rest at 0.
  return status === "running" ? 1 : 0;
}

export function clampRemainingForStatus(seconds: number, status: Status, maxSeconds: number): number {
  return Math.max(minRemainingSeconds(status), Math.min(maxSeconds, seconds));
}

// Whole seconds left before `endAt`, rounded up so the display reads 25:00 for
// the whole first second. Reading the wall clock (instead of counting interval
// firings) keeps the countdown correct after throttling, sleep, or a hidden window.
export function remainingSecondsUntil(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

// Milliseconds until `remainingSecondsUntil(endAt, now)` next changes, so the
// countdown can wake once per displayed second instead of polling. Never 0, so
// a timer that has already run out cannot spin.
export function msUntilNextSecond(endAt: number, now: number): number {
  const intoSecond = (((endAt - now) % 1000) + 1000) % 1000;
  return intoSecond === 0 ? 1000 : intoSecond;
}

// The timer's status and time as one value. A running timer stores only its
// wall-clock end time; the seconds left are derived from it. `syncedAt` is the
// clock reading the display is derived against, so render never reads the
// clock itself. A stopped timer stores its frozen seconds.
export type TimerClock =
  | { status: "running"; endAt: number; syncedAt: number }
  | { status: Exclude<Status, "running">; remainingSeconds: number };

export function clockRemainingSeconds(clock: TimerClock): number {
  return clock.status === "running" ? remainingSecondsUntil(clock.endAt, clock.syncedAt) : clock.remainingSeconds;
}

export function runningClock(seconds: number, now: number): TimerClock {
  return { status: "running", endAt: now + seconds * 1000, syncedAt: now };
}

// Re-reads a running clock at `now`. Returns the same object when the displayed
// second has not changed, so a wakeup that lands early does not re-render.
export function syncClock(clock: TimerClock, now: number): TimerClock {
  if (clock.status !== "running") return clock;
  if (remainingSecondsUntil(clock.endAt, now) === clockRemainingSeconds(clock)) return clock;
  return { ...clock, syncedAt: now };
}

// Fits the clock inside a (possibly shortened) phase duration. A running timer's
// end time moves no later than `maxSeconds` from `now`, measured against the
// real clock rather than the last sync, which can be stale in a throttled tab.
// Returns the same object when nothing changed.
export function capClock(clock: TimerClock, maxSeconds: number, now: number): TimerClock {
  if (clock.status !== "running") {
    return clock.remainingSeconds > maxSeconds ? { ...clock, remainingSeconds: maxSeconds } : clock;
  }
  const latestEndAt = now + maxSeconds * 1000;
  if (clock.endAt <= latestEndAt) return syncClock(clock, now);
  return { status: "running", endAt: latestEndAt, syncedAt: now };
}
