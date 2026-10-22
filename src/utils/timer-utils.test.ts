import { describe, expect, test } from "vitest";

import { clampRemainingForStatus, minRemainingSeconds } from "@/utils/timer-utils";

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
