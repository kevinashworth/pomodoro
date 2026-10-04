import { describe, expect, test } from "vitest";

import { alignCountToDay, buildTimerState, restoreTimerState, type RestoreContext } from "@/utils/timer-storage";

const NOW = new Date("2026-03-01T12:00:00");
const NOW_MS = NOW.getTime();
const RESET_HOUR = 3;

const ctx: RestoreContext = {
  workMinutes: 25,
  breakMinutes: 5,
  dailyResetHour: RESET_HOUR,
  now: NOW_MS,
};

function raw(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    mode: "work",
    status: "idle",
    remainingSeconds: 600,
    sessionsCompletedToday: 0,
    sessionsCompletedDayId: "2026-03-01",
    dailyResetHour: RESET_HOUR,
    updatedAt: NOW_MS,
    ...overrides,
  });
}

describe("alignCountToDay", () => {
  test("keeps the count within the same pomodoro day", () => {
    expect(alignCountToDay(4, "2026-03-01", NOW, RESET_HOUR)).toEqual({ count: 4, dayId: "2026-03-01" });
  });

  test("resets the count for a stale day", () => {
    expect(alignCountToDay(4, "1999-01-01", NOW, RESET_HOUR)).toEqual({ count: 0, dayId: "2026-03-01" });
  });
});

describe("buildTimerState", () => {
  test("aligns the count and stamps updatedAt", () => {
    const state = buildTimerState(
      {
        mode: "work",
        status: "running",
        remainingSeconds: 120,
        sessionsCompletedToday: 4,
        sessionsCompletedDayId: "1999-01-01",
        dailyResetHour: RESET_HOUR,
      },
      NOW,
    );

    expect(state).toEqual({
      mode: "work",
      status: "running",
      remainingSeconds: 120,
      sessionsCompletedToday: 0,
      sessionsCompletedDayId: "2026-03-01",
      dailyResetHour: RESET_HOUR,
      updatedAt: NOW_MS,
    });
  });
});

describe("restoreTimerState", () => {
  test("returns a fresh result when there is no stored state", () => {
    expect(restoreTimerState(null, ctx)).toEqual({ kind: "fresh", dayId: "2026-03-01" });
  });

  test("returns a fresh result for corrupt JSON", () => {
    expect(restoreTimerState("{not json", ctx)).toEqual({ kind: "fresh", dayId: "2026-03-01" });
  });

  test("restores a paused state as-is", () => {
    const result = restoreTimerState(raw({ status: "paused", remainingSeconds: 120, sessionsCompletedToday: 3 }), ctx);

    expect(result.kind).toBe("restored");
    if (result.kind !== "restored") return;
    expect(result.state.mode).toBe("work");
    expect(result.state.status).toBe("paused");
    expect(result.state.remainingSeconds).toBe(120);
    expect(result.state.sessionsCompletedToday).toBe(3);
  });

  test("clamps an out-of-range remaining value to the phase max", () => {
    const result = restoreTimerState(raw({ status: "paused", remainingSeconds: 99999 }), ctx);

    expect(result.kind === "restored" && result.state.remainingSeconds).toBe(25 * 60);
  });

  test("deducts elapsed time from a running state", () => {
    const result = restoreTimerState(
      raw({ status: "running", remainingSeconds: 600, updatedAt: NOW_MS - 60_000 }),
      ctx,
    );

    expect(result.kind === "restored" && result.state.remainingSeconds).toBe(540);
    expect(result.kind === "restored" && result.state.status).toBe("running");
  });

  test("advances and increments when a running work phase elapsed past zero", () => {
    const result = restoreTimerState(
      raw({ status: "running", remainingSeconds: 10, sessionsCompletedToday: 2, updatedAt: NOW_MS - 60_000 }),
      ctx,
    );

    expect(result.kind).toBe("restored");
    if (result.kind !== "restored") return;
    expect(result.state.mode).toBe("break");
    expect(result.state.status).toBe("idle");
    expect(result.state.remainingSeconds).toBe(5 * 60);
    expect(result.state.sessionsCompletedToday).toBe(3);
  });

  test("does not increment when a running break phase elapsed past zero", () => {
    const result = restoreTimerState(
      raw({
        mode: "break",
        status: "running",
        remainingSeconds: 10,
        sessionsCompletedToday: 2,
        updatedAt: NOW_MS - 60_000,
      }),
      ctx,
    );

    expect(result.kind === "restored" && result.state.mode).toBe("work");
    expect(result.kind === "restored" && result.state.sessionsCompletedToday).toBe(2);
  });

  test("resets the count and day for a stale day snapshot", () => {
    const result = restoreTimerState(raw({ sessionsCompletedToday: 9, sessionsCompletedDayId: "1999-01-01" }), ctx);

    expect(result.kind === "restored" && result.state.sessionsCompletedToday).toBe(0);
    expect(result.kind === "restored" && result.state.sessionsCompletedDayId).toBe("2026-03-01");
  });

  test("falls back to idle for an invalid status", () => {
    const result = restoreTimerState(raw({ status: "bogus", remainingSeconds: 60 }), ctx);

    expect(result.kind === "restored" && result.state.status).toBe("idle");
  });

  test("falls back to the phase max when remainingSeconds is missing", () => {
    const result = restoreTimerState(JSON.stringify({ mode: "break", status: "paused" }), ctx);

    expect(result.kind === "restored" && result.state.remainingSeconds).toBe(5 * 60);
  });
});
