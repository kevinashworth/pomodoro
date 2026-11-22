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
