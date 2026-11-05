# New Day Starts In Work

## Behavior

A Pomodoro day begins at `dailyResetHour` (currently 03:00 local time). The first
time the app is used on a new Pomodoro day, it starts a fresh work phase:

- phase: `work`
- status: `idle`
- remaining: the configured `workMinutes`
- completed count: `0`

A timer snapshot is valid only for the Pomodoro day in which it was last saved.
Snapshots from an earlier day are discarded on load rather than restoring their
phase. This prevents yesterday's break (or an overnight work phase that elapsed
past zero) from becoming today's starting phase.

Same-day relaunches still restore the saved snapshot, including break, paused,
and running states. Snapshots saved before 03:00 belong to the previous Pomodoro
day.

## Live rollover

If the app stays alive across the boundary (menu-bar mode hides instead of
quitting, and sleep can freeze the countdown), a 30-second poll checks the
Pomodoro day. A focus/visibility check runs the same check immediately after
sleep/wake or when a hidden menu-bar window is shown. When the day changes, the
timer resets to a fresh work phase and the completed count resets to zero.

An actively running timer is also reset at the boundary. This is intentional so
the first view of a new day is always the focused work phase.

## Persistence details

`saveTimerState` stamps `updatedAt` on every save. Restore derives the
snapshot's Pomodoro day from that timestamp, so no extra persisted field or
storage-version migration is needed. Snapshots with a missing or invalid
`updatedAt` are treated as stale and start fresh.

## Tests

- `src/utils/timer-storage.test.ts` covers previous-day snapshots, the reset-hour
  boundary, missing `updatedAt`, and same-day break restore.
- `src/components/pomodoro-timer.test.tsx` covers stale-day hydration, poll
  rollover, and focus-triggered rollover.
- `tests/pomodoro.spec.ts` covers the end-to-end first-open and live-rollover
  behavior.
