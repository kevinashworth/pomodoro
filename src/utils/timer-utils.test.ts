import { describe, expect, test } from "vitest";

import {
  capClock,
  clampRemainingForStatus,
  clockRemainingSeconds,
  minRemainingSeconds,
  msUntilNextSecond,
  remainingSecondsUntil,
  runningClock,
  syncClock,
  type TimerClock,
} from "@/utils/timer-utils";

describe("minRemainingSeconds", () => {
  test("returns 1 while running and 0 otherwise", () => {
    expect(minRemainingSeconds("running")).toBe(1);
    expect(minRemainingSeconds("idle")).toBe(0);
    expect(minRemainingSeconds("paused")).toBe(0);
  });
});

describe("clampRemainingForStatus", () => {
  test("clamps to the max", () => {
    expect(clampRemainingForStatus(999, "running", 600)).toBe(600);
  });

  test("clamps to 1 while running", () => {
    expect(clampRemainingForStatus(0, "running", 600)).toBe(1);
    expect(clampRemainingForStatus(-5, "running", 600)).toBe(1);
  });

  test("clamps to 0 while not running", () => {
    expect(clampRemainingForStatus(0, "idle", 600)).toBe(0);
    expect(clampRemainingForStatus(0, "paused", 600)).toBe(0);
    expect(clampRemainingForStatus(-5, "idle", 600)).toBe(0);
  });

  test("passes through in-range values", () => {
    expect(clampRemainingForStatus(300, "idle", 600)).toBe(300);
  });

  // Why the running floor is 1 and not 0: `remainingSeconds === 0` while running
  // is the sentinel that advances to the next phase (use-pomodoro-timer). A value
  // clamped to 0 while running would end the phase prematurely, so the floor must
  // be strictly positive. When not running, 0 is a safe resting value.
  test("never returns 0 while running, so a user edit cannot end the phase early", () => {
    expect(clampRemainingForStatus(0, "running", 600)).toBeGreaterThan(0);
  });
});

describe("remainingSecondsUntil", () => {
  test("rounds partial seconds up", () => {
    expect(remainingSecondsUntil(10_000, 0)).toBe(10);
    expect(remainingSecondsUntil(10_000, 1)).toBe(10);
    expect(remainingSecondsUntil(10_000, 999)).toBe(10);
    expect(remainingSecondsUntil(10_000, 1000)).toBe(9);
  });

  test("never goes below zero", () => {
    expect(remainingSecondsUntil(10_000, 10_000)).toBe(0);
    expect(remainingSecondsUntil(10_000, 60_000)).toBe(0);
  });
});

describe("msUntilNextSecond", () => {
  test("waits until the displayed second changes", () => {
    expect(msUntilNextSecond(10_000, 0)).toBe(1000);
    expect(msUntilNextSecond(10_000, 1)).toBe(999);
    expect(msUntilNextSecond(10_000, 999)).toBe(1);
    expect(msUntilNextSecond(10_500, 0)).toBe(500);
  });

  test("never returns 0, even after the end time", () => {
    expect(msUntilNextSecond(10_000, 10_000)).toBe(1000);
    expect(msUntilNextSecond(10_000, 10_200)).toBe(800);
  });
});

describe("clock", () => {
  test("derives the remaining seconds of a running clock from its end time", () => {
    expect(clockRemainingSeconds(runningClock(90, 5_000))).toBe(90);
    expect(clockRemainingSeconds({ status: "running", endAt: 10_000, syncedAt: 500 })).toBe(10);
    expect(clockRemainingSeconds({ status: "paused", remainingSeconds: 42 })).toBe(42);
  });

  test("sync keeps the same object until the displayed second changes", () => {
    const clock = runningClock(10, 0);
    expect(syncClock(clock, 999)).toBe(clock);
    expect(syncClock(clock, 1000)).toEqual({ status: "running", endAt: 10_000, syncedAt: 1000 });
  });

  test("sync leaves a stopped clock alone", () => {
    const clock: TimerClock = { status: "idle", remainingSeconds: 60 };
    expect(syncClock(clock, 123_456)).toBe(clock);
  });

  test("cap lowers a stopped clock only when it is over the max", () => {
    const over: TimerClock = { status: "paused", remainingSeconds: 900 };
    const under: TimerClock = { status: "paused", remainingSeconds: 300 };
    expect(capClock(over, 600, 0)).toEqual({ status: "paused", remainingSeconds: 600 });
    expect(capClock(under, 600, 0)).toBe(under);
  });

  test("cap moves a running end time to at most the max from now", () => {
    const clock = runningClock(1500, 0);
    expect(capClock(clock, 600, 0)).toEqual({ status: "running", endAt: 600_000, syncedAt: 0 });
  });

  // A throttled tab's last sync can be far behind. The cap must measure against
  // the real clock, not against the stale display.
  test("cap uses the real clock, not a stale sync", () => {
    const stale = runningClock(1500, 0); // last synced at 25:00
    const now = 600_000; // really 15:00 left
    const capped = capClock(stale, 1200, now); // lowered to 20 minutes

    expect(capped.status === "running" && capped.endAt).toBe(1_500_000);
    expect(clockRemainingSeconds(capped)).toBe(900);
  });
});
