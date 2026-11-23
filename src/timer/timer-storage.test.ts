import { afterEach, describe, expect, test } from "vitest";

import { DEFAULT_DAILY_RESET_HOUR, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { freshDay, type Durations } from "@/timer/timer-reducer";
import { restoreTimerState, saveTimerState } from "@/timer/timer-storage";
import { getDayId } from "@/utils/time";

afterEach(() => {
  window.localStorage.clear();
});

const NOW = new Date("2026-03-01T12:00:00");
const NOW_MS = NOW.getTime();
const NOW_DAY_ID = getDayId(NOW, DEFAULT_DAILY_RESET_HOUR);
const durations: Durations = { work: 25 * 60, break: 5 * 60 };
const ctx = { durations, now: NOW_MS };
const FRESH = freshDay(NOW_DAY_ID, durations);

function raw(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    phase: "work",
    status: "idle",
    remainingSeconds: 600,
    sessionsCompletedToday: 0,
    sessionsCompletedDayId: NOW_DAY_ID,
    updatedAt: NOW_MS,
    ...overrides,
  });
}

function stored() {
  return JSON.parse(window.localStorage.getItem(TIMER_STATE_STORAGE_KEY) ?? "null");
}

describe("saveTimerState", () => {
  test("saves a running timer by its end time and stamps updatedAt", () => {
    saveTimerState(
      {
        phase: "work",
        status: "running",
        endAt: NOW_MS + 120_400,
        remainingMs: null,
        sessionsCompletedToday: 4,
        sessionsCompletedDayId: NOW_DAY_ID,
      },
      NOW_MS,
    );

    expect(stored()).toEqual({
      phase: "work",
      status: "running",
      endAt: NOW_MS + 120_400,
      remainingMs: null,
      remainingSeconds: 121,
      sessionsCompletedToday: 4,
      sessionsCompletedDayId: NOW_DAY_ID,
      updatedAt: NOW_MS,
    });
  });

  test("saves a stopped timer's exact milliseconds", () => {
    saveTimerState({
      phase: "break",
      status: "paused",
      endAt: null,
      remainingMs: 61_500,
      sessionsCompletedToday: 1,
      sessionsCompletedDayId: NOW_DAY_ID,
    });

    expect(stored()).toMatchObject({ remainingMs: 61_500, remainingSeconds: 62, endAt: null });
  });
});

describe("restoreTimerState", () => {
  test("starts fresh when there is no stored state", () => {
    expect(restoreTimerState(null, ctx)).toEqual(FRESH);
  });

  test("starts fresh for corrupt JSON", () => {
    expect(restoreTimerState("{not json", ctx)).toEqual(FRESH);
  });

  test("starts fresh for a snapshot saved on an earlier pomodoro day", () => {
    const result = restoreTimerState(
      raw({ phase: "break", status: "paused", sessionsCompletedToday: 3, updatedAt: NOW_MS - 24 * 60 * 60 * 1000 }),
      ctx,
    );

    expect(result).toEqual(FRESH);
  });

  test("does not advance an earlier-day running work phase into a break", () => {
    const result = restoreTimerState(
      raw({ status: "running", remainingSeconds: 10, updatedAt: NOW_MS - 2 * 24 * 60 * 60 * 1000 }),
      ctx,
    );

    expect(result).toEqual(FRESH);
  });

  test("starts fresh when the snapshot has no valid updatedAt", () => {
    expect(restoreTimerState(JSON.stringify({ phase: "break", status: "paused" }), ctx)).toEqual(FRESH);
  });

  test("treats a snapshot saved before the reset hour as the previous day", () => {
    const justAfterReset = new Date("2026-03-01T03:01:00").getTime();
    const result = restoreTimerState(raw({ phase: "break", updatedAt: new Date("2026-03-01T02:59:00").getTime() }), {
      durations,
      now: justAfterReset,
    });

    expect(result).toEqual(freshDay(getDayId(new Date(justAfterReset), DEFAULT_DAILY_RESET_HOUR), durations));
  });

  test("restores a stopped state, preferring exact milliseconds", () => {
    const result = restoreTimerState(
      raw({ phase: "break", status: "paused", remainingSeconds: 121, remainingMs: 120_300, sessionsCompletedToday: 3 }),
      ctx,
    );

    expect(result).toEqual({
      phase: "break",
      clock: { status: "paused", remainingMs: 120_300 },
      sessionsCompletedToday: 3,
      dayId: NOW_DAY_ID,
    });
  });

  test("falls back to whole seconds for an older stopped snapshot", () => {
    const result = restoreTimerState(raw({ status: "paused", remainingSeconds: 120 }), ctx);

    expect(result.clock).toEqual({ status: "paused", remainingMs: 120_000 });
  });

  test("clamps an out-of-range remaining value to the phase max", () => {
    const result = restoreTimerState(raw({ status: "paused", remainingSeconds: 99999 }), ctx);

    expect(result.clock).toEqual({ status: "paused", remainingMs: 1500_000 });
  });

  test("falls back to the phase max when remainingSeconds is missing", () => {
    const result = restoreTimerState(JSON.stringify({ phase: "break", status: "paused", updatedAt: NOW_MS }), ctx);

    expect(result.clock).toEqual({ status: "paused", remainingMs: 300_000 });
  });

  test("falls back to idle for an invalid status", () => {
    expect(restoreTimerState(raw({ status: "bogus", remainingSeconds: 60 }), ctx).clock.status).toBe("idle");
  });

  test("restores a running state exactly from its saved end time", () => {
    // The saved remaining seconds are stale on purpose; `endAt` wins.
    const endAt = NOW_MS + 600_400;
    const result = restoreTimerState(
      raw({ status: "running", remainingSeconds: 700, endAt, updatedAt: NOW_MS - 60_000 }),
      ctx,
    );

    expect(result.clock).toEqual({ status: "running", endAt, syncedAt: NOW_MS });
  });

  test("rebuilds the end time of an older running snapshot without one", () => {
    const result = restoreTimerState(
      raw({ status: "running", remainingSeconds: 600, updatedAt: NOW_MS - 60_000 }),
      ctx,
    );

    expect(result.clock).toEqual({ status: "running", endAt: NOW_MS + 540_000, syncedAt: NOW_MS });
  });

  test("caps a saved end time at the phase duration from now", () => {
    const result = restoreTimerState(raw({ status: "running", endAt: NOW_MS + 60 * 60 * 1000 }), ctx);

    expect(result.clock).toEqual({ status: "running", endAt: NOW_MS + 1500_000, syncedAt: NOW_MS });
  });

  test("advances and counts when a running work phase ended while closed", () => {
    const result = restoreTimerState(
      raw({ status: "running", remainingSeconds: 10, sessionsCompletedToday: 2, updatedAt: NOW_MS - 60_000 }),
      ctx,
    );

    expect(result).toEqual({
      phase: "break",
      clock: { status: "idle", remainingMs: 300_000 },
      sessionsCompletedToday: 3,
      dayId: NOW_DAY_ID,
    });
  });

  test("advances without counting when a running break ended while closed", () => {
    const result = restoreTimerState(
      raw({ phase: "break", status: "running", sessionsCompletedToday: 2, endAt: NOW_MS - 1 }),
      ctx,
    );

    expect(result.phase).toBe("work");
    expect(result.sessionsCompletedToday).toBe(2);
  });

  test("resets the count for a stale count day", () => {
    const result = restoreTimerState(raw({ sessionsCompletedToday: 9, sessionsCompletedDayId: "1999-01-01" }), ctx);

    expect(result.sessionsCompletedToday).toBe(0);
    expect(result.dayId).toBe(NOW_DAY_ID);
  });
});
