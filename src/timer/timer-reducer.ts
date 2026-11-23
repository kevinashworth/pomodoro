/*
How the timer works

Every change to the timer is a pure transition in `timerReducer`. Actions carry
the clock reading `now` and the current phase durations, so the reducer never
reads the clock or the settings itself, and it can be tested without React.
`use-pomodoro-timer.ts` dispatches the actions and turns the results into
sounds, notifications, and storage writes.

Time. A running timer stores only `endAt`, its wall-clock end time, so a
throttled tab, a hidden window, or sleep cannot slow it down. The seconds shown
are derived from `endAt` and `syncedAt`, the last clock reading, which `sync`
advances. The hook dispatches `sync` at each whole-second boundary of `endAt`
and on focus and visibility changes. A stopped timer stores exact milliseconds,
so pausing and resuming neither gains nor loses time.

Phase ends. Once `endAt` has passed, `sync` (or a `pause` that arrives late)
moves to the next phase, idle at its full duration, and a finished work phase
counts toward today. Only these natural ends bump `phaseEnd`, which the hook
announces with a sound and a notification. Skip and Reset never bump it, so
they stay silent.

Minute ticks. `sync` bumps `ticks` when the displayed minute drops while time
remains. The minute is numbered by the whole-minute mark that opened it, so
25:00 through 24:01 is minute 25. A clock that jumps over several marks plays
one tick, not several. Starting a phase from idle also ticks. Edits, duration
clamps, and resuming are separate actions, so they never tick.

Days. A pomodoro day starts at DEFAULT_DAILY_RESET_HOUR (see `getDayId`). When
`sync` sees a new day, it starts fresh with an idle work phase and a count of
0, even if a session was running.

Durations. `fitDuration` keeps the timer within a shortened phase, measured
against the real clock, because a throttled tab's last sync can be stale. It
never stretches a timer when a duration grows.
*/

import { DEFAULT_DAILY_RESET_HOUR } from "@/constants/pomodoro";
import { getDayId } from "@/utils/time";

import type { Phase, Status } from "@/types/pomodoro";

// Phase durations in milliseconds.
export type Durations = Record<Phase, number>;

// A running timer is its end time; a stopped one is its exact time left.
export type TimerClock =
  { status: "running"; endAt: number } | { status: Exclude<Status, "running">; remainingMs: number };

// The part of the timer that is saved and restored.
export type TimerSnapshot = {
  phase: Phase;
  clock: TimerClock;
  sessionsCompletedToday: number;
  dayId: string;
};

export type TimerCore = TimerSnapshot & {
  // The clock reading the displayed time is derived against. Kept outside
  // `clock` so the countdown never changes the clock object, which is what
  // gets saved.
  syncedAt: number;
  // Counters the hook watches to play sounds; each bump is one event.
  ticks: number;
  phaseEnd: { count: number; endedPhase: Phase | null };
};

export type TimerCommand =
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "skip" }
  | { type: "edit"; seconds: number }
  | { type: "fitDuration" }
  | { type: "sync" };

export type TimerAction = TimerCommand & { now: number; durations: Durations };

export function dayIdAt(now: number): string {
  return getDayId(new Date(now), DEFAULT_DAILY_RESET_HOUR);
}

// Exact time left at `now`.
export function msLeft(clock: TimerClock, now: number): number {
  return clock.status === "running" ? Math.max(0, clock.endAt - now) : clock.remainingMs;
}

// Whole seconds shown for a time left, rounded up so the display reads 25:00
// for the whole first second.
export function toSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

// Milliseconds until the displayed second next changes. Never 0, so a timer
// that has already run out cannot spin.
export function msUntilNextSecond(ms: number): number {
  return ms % 1000 > 0 ? ms % 1000 : 1000;
}

// A running timer at 0 has ended, so an edit can take it no lower than 1 second.
export function minRemainingSeconds(status: Status): number {
  return status === "running" ? 1 : 0;
}

function tickMinuteOf(seconds: number): number {
  return Math.ceil(seconds / 60);
}

function idleClock(phase: Phase, durations: Durations): TimerClock {
  return { status: "idle", remainingMs: durations[phase] };
}

export function freshDay(dayId: string, durations: Durations): TimerSnapshot {
  return { phase: "work", clock: idleClock("work", durations), sessionsCompletedToday: 0, dayId };
}

export function initialCore(snapshot: TimerSnapshot, now: number): TimerCore {
  return { ...snapshot, syncedAt: now, ticks: 0, phaseEnd: { count: 0, endedPhase: null } };
}

// Whole seconds shown, as of the last sync.
export function shownSeconds(state: TimerCore): number {
  return toSeconds(msLeft(state.clock, state.syncedAt));
}

// The next phase, idle at its full duration. A finished work phase counts.
export function advancePhase<T extends TimerSnapshot>(state: T, durations: Durations): T {
  const next: Phase = state.phase === "work" ? "break" : "work";
  return {
    ...state,
    phase: next,
    clock: idleClock(next, durations),
    sessionsCompletedToday: state.sessionsCompletedToday + (state.phase === "work" ? 1 : 0),
  };
}

function endPhase(state: TimerCore, durations: Durations): TimerCore {
  return {
    ...advancePhase(state, durations),
    phaseEnd: { count: state.phaseEnd.count + 1, endedPhase: state.phase },
  };
}

export function timerReducer(state: TimerCore, action: TimerAction): TimerCore {
  const { now, durations } = action;
  const { clock } = state;
  const maxMs = durations[state.phase];

  switch (action.type) {
    case "start": {
      if (clock.status === "running") return state;
      const ms = clock.remainingMs <= 0 ? maxMs : Math.min(clock.remainingMs, maxMs);
      return {
        ...state,
        clock: { status: "running", endAt: now + ms },
        syncedAt: now,
        ticks: clock.status === "idle" ? state.ticks + 1 : state.ticks,
      };
    }

    case "pause": {
      if (clock.status !== "running") return state;
      const ms = clock.endAt - now;
      // The phase already ended between wakeups: end it naturally.
      if (ms <= 0) return endPhase(state, durations);
      return { ...state, clock: { status: "paused", remainingMs: Math.min(ms, maxMs) } };
    }

    case "reset":
      return { ...state, clock: { status: "idle", remainingMs: maxMs } };

    case "skip":
      return advancePhase(state, durations);

    case "edit": {
      const ms = Math.max(minRemainingSeconds(clock.status) * 1000, Math.min(maxMs, action.seconds * 1000));
      const next: TimerClock =
        clock.status === "running" ? { status: "running", endAt: now + ms } : { status: clock.status, remainingMs: ms };
      return { ...state, clock: next, syncedAt: now };
    }

    case "fitDuration": {
      if (clock.status !== "running") {
        return clock.remainingMs > maxMs ? { ...state, clock: { ...clock, remainingMs: maxMs } } : state;
      }
      if (clock.endAt <= now) return endPhase(state, durations);
      // Resync without ticking: a fit is not the countdown passing a mark.
      const endAt = Math.min(clock.endAt, now + maxMs);
      if (endAt === clock.endAt && toSeconds(msLeft(clock, now)) === shownSeconds(state)) return state;
      return { ...state, clock: endAt === clock.endAt ? clock : { status: "running", endAt }, syncedAt: now };
    }

    case "sync": {
      const dayId = dayIdAt(now);
      if (dayId !== state.dayId) return { ...state, ...freshDay(dayId, durations) };
      if (clock.status !== "running") return state;
      if (clock.endAt <= now) return endPhase(state, durations);

      const shown = shownSeconds(state);
      const next = toSeconds(msLeft(clock, now));
      // Same second: return the same object so React skips the render.
      if (next === shown) return state;
      return {
        ...state,
        syncedAt: now,
        ticks: tickMinuteOf(next) < tickMinuteOf(shown) ? state.ticks + 1 : state.ticks,
      };
    }
  }
}
