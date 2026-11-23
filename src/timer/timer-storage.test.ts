import { afterEach, describe, expect, test } from "vitest";

import { TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { dayIdAt, freshDay, type Durations, type TimerSnapshot } from "@/timer/timer-reducer";
import { restoreTimerState, saveTimerState } from "@/timer/timer-storage";

afterEach(() => {
  window.localStorage.clear();
});

const NOW = new Date("2026-03-01T12:00:00").getTime();
const TODAY = dayIdAt(NOW);
const durations: Durations = { work: 25 * 60 * 1000, break: 5 * 60 * 1000 };
const ctx = { durations, now: NOW };
const FRESH = freshDay(TODAY, durations);

function snapshot(overrides: Partial<TimerSnapshot> = {}): TimerSnapshot {
  return {
    phase: "work",
    clock: { status: "paused", remainingMs: 600_000 },
    sessionsCompletedToday: 0,
    dayId: TODAY,
    ...overrides,
  };
}

function restore(value: unknown) {
  return restoreTimerState(JSON.stringify(value), ctx);
}

describe("saveTimerState", () => {
  test("round-trips through restore", () => {
    const saved = snapshot({
      phase: "break",
      clock: { status: "paused", remainingMs: 61_500 },
      sessionsCompletedToday: 4,
    });
    saveTimerState(saved);

    expect(restoreTimerState(window.localStorage.getItem(TIMER_STATE_STORAGE_KEY), ctx)).toEqual(saved);
  });
});

describe("restoreTimerState", () => {
  test("starts fresh with no stored state, corrupt JSON, or an unusable clock", () => {
    expect(restoreTimerState(null, ctx)).toEqual(FRESH);
    expect(restoreTimerState("{not json", ctx)).toEqual(FRESH);
    expect(restore({ ...snapshot(), clock: undefined })).toEqual(FRESH);
    expect(restore(snapshot({ clock: { status: "running", endAt: "soon" as unknown as number } }))).toEqual(FRESH);
    expect(restore(snapshot({ clock: { status: "bogus" as "idle", remainingMs: 60_000 } }))).toEqual(FRESH);
  });

  test("starts fresh for a snapshot from an earlier pomodoro day", () => {
    const yesterday = dayIdAt(NOW - 24 * 60 * 60 * 1000);

    expect(restore(snapshot({ phase: "break", sessionsCompletedToday: 3, dayId: yesterday }))).toEqual(FRESH);
  });

  test("treats a snapshot from before the reset hour as the previous day", () => {
    const justAfterReset = new Date("2026-03-01T03:01:00").getTime();
    const dayBefore = dayIdAt(new Date("2026-03-01T02:59:00").getTime());
    const result = restoreTimerState(JSON.stringify(snapshot({ phase: "break", dayId: dayBefore })), {
      durations,
      now: justAfterReset,
    });

    expect(result).toEqual(freshDay(dayIdAt(justAfterReset), durations));
  });

  test("restores a stopped state exactly", () => {
    const saved = snapshot({ clock: { status: "paused", remainingMs: 120_300 }, sessionsCompletedToday: 3 });

    expect(restore(saved)).toEqual(saved);
  });

  test("clamps a stopped time to the phase duration", () => {
    expect(restore(snapshot({ clock: { status: "idle", remainingMs: 99_999_999 } })).clock).toEqual({
      status: "idle",
      remainingMs: 1500_000,
    });
  });

  test("restores a running state from its end time", () => {
    const saved = snapshot({ clock: { status: "running", endAt: NOW + 600_400 } });

    expect(restore(saved)).toEqual(saved);
  });

  test("caps an end time at the phase duration from now", () => {
    expect(restore(snapshot({ clock: { status: "running", endAt: NOW + 60 * 60 * 1000 } })).clock).toEqual({
      status: "running",
      endAt: NOW + 1500_000,
    });
  });

  test("advances and counts when a running work phase ended while closed", () => {
    const result = restore(snapshot({ clock: { status: "running", endAt: NOW - 50_000 }, sessionsCompletedToday: 2 }));

    expect(result).toEqual({
      phase: "break",
      clock: { status: "idle", remainingMs: 300_000 },
      sessionsCompletedToday: 3,
      dayId: TODAY,
    });
  });

  test("advances without counting when a running break ended while closed", () => {
    const result = restore(
      snapshot({ phase: "break", clock: { status: "running", endAt: NOW - 1 }, sessionsCompletedToday: 2 }),
    );

    expect(result.phase).toBe("work");
    expect(result.sessionsCompletedToday).toBe(2);
  });
});
