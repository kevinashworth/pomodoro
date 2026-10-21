import { describe, expect, test } from "vitest";

import { formatClock, getDayId } from "@/utils/time";

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
