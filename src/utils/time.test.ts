import { describe, expect, test } from "vitest";

import { clampRemaining, formatClock, getDayId } from "@/utils/time";

describe("clampRemaining", () => {
  test("clamps to the max", () => {
    expect(clampRemaining(999, true, 600)).toBe(600);
  });

  test("clamps to 1 while running", () => {
    expect(clampRemaining(0, true, 600)).toBe(1);
    expect(clampRemaining(-5, true, 600)).toBe(1);
  });

  test("clamps to 0 while not running", () => {
    expect(clampRemaining(0, false, 600)).toBe(0);
    expect(clampRemaining(-5, false, 600)).toBe(0);
  });

  test("passes through in-range values", () => {
    expect(clampRemaining(300, false, 600)).toBe(300);
  });
});

describe("formatClock", () => {
  test.each([
    [0, "00:00"],
    [1, "00:01"],
    [59, "00:59"],
    [60, "01:00"],
    [1500, "25:00"],
    [3599, "59:59"],
    [3600, "60:00"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });

  test("treats negative values as zero", () => {
    expect(formatClock(-10)).toBe("00:00");
  });
});

describe("getDayId", () => {
  test("uses the calendar date when before the reset hour", () => {
    expect(getDayId(new Date("2026-03-01T02:59:00"), 3)).toBe("2026-02-28");
  });

  test("rolls to the new day at or after the reset hour", () => {
    expect(getDayId(new Date("2026-03-01T03:01:00"), 3)).toBe("2026-03-01");
  });

  test("handles a midnight reset", () => {
    expect(getDayId(new Date("2026-03-01T23:59:00"), 0)).toBe("2026-03-01");
    expect(getDayId(new Date("2026-03-02T00:01:00"), 0)).toBe("2026-03-02");
  });

  test("handles month boundaries", () => {
    expect(getDayId(new Date("2026-04-01T01:00:00"), 3)).toBe("2026-03-31");
  });
});
