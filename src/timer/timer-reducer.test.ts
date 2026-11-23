import { describe, expect, test } from "vitest";

import {
  dayIdAt,
  freshDay,
  initialCore,
  msLeft,
  msUntilNextSecond,
  shownSeconds,
  timerReducer,
  toSeconds,
  type Durations,
  type TimerCommand,
  type TimerCore,
} from "@/timer/timer-reducer";

const T0 = new Date("2026-03-01T12:00:00").getTime();
const DURATIONS: Durations = { work: 25 * 60 * 1000, break: 5 * 60 * 1000 };

function idleCore(overrides: Partial<TimerCore> = {}): TimerCore {
  return { ...initialCore(freshDay(dayIdAt(T0), DURATIONS), T0), ...overrides };
}

function runningCore(seconds: number, overrides: Partial<TimerCore> = {}): TimerCore {
  return idleCore({ clock: { status: "running", endAt: T0 + seconds * 1000 }, ...overrides });
}

function apply(state: TimerCore, command: TimerCommand, now: number, durations = DURATIONS): TimerCore {
  return timerReducer(state, { ...command, now, durations });
}

// Syncs once per second from `from` (exclusive) through `to`, like the wakeups.
function syncEverySecond(state: TimerCore, from: number, to: number): TimerCore {
  let next = state;
  for (let now = from + 1000; now <= to; now += 1000) {
    next = apply(next, { type: "sync" }, now);
  }
  return next;
}

describe("clock helpers", () => {
  test("msLeft reads a running clock at a time and never goes below zero", () => {
    const running = { status: "running", endAt: 10_000 } as const;
    expect(msLeft(running, 1000)).toBe(9000);
    expect(msLeft(running, 60_000)).toBe(0);
    expect(msLeft({ status: "paused", remainingMs: 4200 }, 60_000)).toBe(4200);
  });

  test("toSeconds rounds partial seconds up", () => {
    expect(toSeconds(10_000)).toBe(10);
    expect(toSeconds(9001)).toBe(10);
    expect(toSeconds(9000)).toBe(9);
    expect(toSeconds(0)).toBe(0);
  });

  test("msUntilNextSecond waits until the displayed second changes, and never returns 0", () => {
    expect(msUntilNextSecond(10_000)).toBe(1000);
    expect(msUntilNextSecond(9999)).toBe(999);
    expect(msUntilNextSecond(10_500)).toBe(500);
    expect(msUntilNextSecond(0)).toBe(1000);
  });
});

describe("start and pause", () => {
  test("start runs from the stored time and ticks only from idle", () => {
    const started = apply(idleCore(), { type: "start" }, T0);

    expect(started.clock).toEqual({ status: "running", endAt: T0 + 1500_000 });
    expect(started.ticks).toBe(1);

    const paused = apply(started, { type: "pause" }, T0 + 5000);
    const resumed = apply(paused, { type: "start" }, T0 + 9000);
    expect(resumed.ticks).toBe(1);
  });

  test("start from zero uses the full phase", () => {
    const state = apply(idleCore({ clock: { status: "idle", remainingMs: 0 } }), { type: "start" }, T0);

    expect(shownSeconds(state)).toBe(1500);
  });

  test("pausing and resuming keeps the exact time left", () => {
    let state = apply(idleCore(), { type: "start" }, T0);
    let now = T0;
    for (let i = 0; i < 10; i++) {
      now += 1300;
      state = apply(state, { type: "pause" }, now);
      now += 5000;
      state = apply(state, { type: "start" }, now);
    }

    // 13 seconds ran in total, in partial seconds; none were gained or lost.
    expect(state.clock.status === "running" && state.clock.endAt - now).toBe(1500_000 - 13_000);
  });

  test("pausing after the end time ends the phase naturally", () => {
    const state = apply(runningCore(1), { type: "pause" }, T0 + 1000);

    expect(state.phase).toBe("break");
    expect(state.clock).toEqual({ status: "idle", remainingMs: 300_000 });
    expect(state.sessionsCompletedToday).toBe(1);
    expect(state.phaseEnd).toEqual({ count: 1, endedPhase: "work" });
  });
});

describe("phase ends", () => {
  test("sync ends a work phase, counts it, and announces it", () => {
    const state = apply(runningCore(10), { type: "sync" }, T0 + 10_000);

    expect(state.phase).toBe("break");
    expect(state.clock.status).toBe("idle");
    expect(state.sessionsCompletedToday).toBe(1);
    expect(state.phaseEnd).toEqual({ count: 1, endedPhase: "work" });
  });

  test("a break end announces without counting", () => {
    const state = apply(runningCore(10, { phase: "break" }), { type: "sync" }, T0 + 60_000);

    expect(state.phase).toBe("work");
    expect(state.sessionsCompletedToday).toBe(0);
    expect(state.phaseEnd).toEqual({ count: 1, endedPhase: "break" });
  });

  test("skip and reset never announce", () => {
    const skipped = apply(runningCore(100), { type: "skip" }, T0);
    const reset = apply(runningCore(100), { type: "reset" }, T0);

    expect(skipped.phase).toBe("break");
    expect(skipped.sessionsCompletedToday).toBe(1);
    expect(skipped.phaseEnd.count).toBe(0);
    expect(reset.clock).toEqual({ status: "idle", remainingMs: 1500_000 });
    expect(reset.phaseEnd.count).toBe(0);
  });
});

describe("sync", () => {
  test("returns the same object until the displayed second changes", () => {
    const state = runningCore(10);

    expect(apply(state, { type: "sync" }, T0 + 999)).toBe(state);
    const synced = apply(state, { type: "sync" }, T0 + 1000);
    expect(shownSeconds(synced)).toBe(9);
    // The countdown moves only `syncedAt`; the saved clock stays the same object.
    expect(synced.clock).toBe(state.clock);
  });

  test("leaves a stopped timer alone on the same day", () => {
    const state = idleCore();

    expect(apply(state, { type: "sync" }, T0 + 60_000)).toBe(state);
  });

  test("starts a fresh work phase on a new pomodoro day, even while running", () => {
    const state = runningCore(100, { phase: "break", sessionsCompletedToday: 4 });
    const nextDay = new Date("2026-03-02T04:00:00").getTime();
    const fresh = apply(state, { type: "sync" }, nextDay);

    expect(fresh.phase).toBe("work");
    expect(fresh.clock).toEqual({ status: "idle", remainingMs: 1500_000 });
    expect(fresh.sessionsCompletedToday).toBe(0);
    expect(fresh.dayId).toBe(dayIdAt(nextDay));
  });
});

describe("minute ticks", () => {
  test("tick at each whole-minute mark, not in the last second", () => {
    const state = syncEverySecond(runningCore(150), T0, T0 + 150_000);

    // Marks at 2:00 and 1:00 tick. Reaching 0:00 is the phase end instead.
    expect(state.ticks).toBe(2);
    expect(state.phaseEnd.count).toBe(1);
  });

  test("a clock jump over several marks ticks once", () => {
    const state = apply(runningCore(300), { type: "sync" }, T0 + 150_000);

    expect(shownSeconds(state)).toBe(150);
    expect(state.ticks).toBe(1);
  });

  test("edits, duration fits, and resuming never tick", () => {
    let state = runningCore(1470);
    state = apply(state, { type: "edit", seconds: 600 }, T0);
    state = apply(state, { type: "fitDuration" }, T0, { work: 300 * 1000, break: 300 * 1000 });
    state = apply(state, { type: "pause" }, T0 + 500);
    state = apply(state, { type: "start" }, T0 + 900);

    expect(state.ticks).toBe(0);
  });
});

describe("edit", () => {
  test("moves a running end time and floors it at 1 second", () => {
    const state = apply(runningCore(100), { type: "edit", seconds: 0 }, T0 + 5000);

    expect(state.clock).toEqual({ status: "running", endAt: T0 + 6000 });
    expect(shownSeconds(state)).toBe(1);
  });

  test("sets a stopped time and caps it at the phase duration", () => {
    const state = apply(idleCore(), { type: "edit", seconds: 99_999 }, T0);

    expect(state.clock).toEqual({ status: "idle", remainingMs: 1500_000 });
  });
});

describe("fitDuration", () => {
  const shorter: Durations = { work: 10 * 60 * 1000, break: 5 * 60 * 1000 };

  test("lowers a stopped time over the new duration, and never raises one", () => {
    const paused = idleCore({ clock: { status: "paused", remainingMs: 900_000 } });

    expect(apply(paused, { type: "fitDuration" }, T0, shorter).clock).toEqual({
      status: "paused",
      remainingMs: 600_000,
    });
    expect(apply(paused, { type: "fitDuration" }, T0, { work: 30 * 60 * 1000, break: 5 * 60 * 1000 })).toBe(paused);
  });

  test("moves a running end time to at most the new duration from now", () => {
    const state = apply(runningCore(1500), { type: "fitDuration" }, T0, shorter);

    expect(state.clock).toEqual({ status: "running", endAt: T0 + 600_000 });
  });

  // A throttled tab's last sync can be far behind. The fit must measure
  // against the real clock: 15 minutes are really left, under the new 20.
  test("measures against the real clock, not a stale sync", () => {
    const stale = runningCore(1500);
    const now = T0 + 600_000;
    const state = apply(stale, { type: "fitDuration" }, now, { work: 20 * 60 * 1000, break: 5 * 60 * 1000 });

    expect(state.clock).toBe(stale.clock);
    expect(shownSeconds(state)).toBe(900);
  });
});
