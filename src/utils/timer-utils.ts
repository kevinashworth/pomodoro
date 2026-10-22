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
