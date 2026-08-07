# Pomodoro Main Window v1 Plan

## Product Goal

Create a compact Pomodoro timer window with a circular countdown UI that defaults to 20:00 work and transitions to a 6:00 break phase, with adjustable durations and daily completion tracking.

## Confirmed Decisions

- Compact layout target: 260x320.
- Ring style: thin 6px stroke, clockwise remaining-time depletion, 12 o'clock anchor.
- Dragging: enabled while running, 1-second granularity, no phase-boundary crossing.
- Running lower bound while dragging: clamp to 00:01.
- Center control: Pause/Resume (Start when idle).
- Top-right X: Skip current phase.
- Skip behavior: skipping work increments Completed today.
- Auto-start behavior: disabled for both transitions.
- Work completion: move to break ready state.
- Break completion: move to work ready state.
- Duration controls: remove below-ring +/- buttons; adjust durations in settings with bounds 1..60.
- Settings entry: gear button.
- Settings v1: work minutes, break minutes, accent preset, sound toggle, notification toggle.
- Time format: MM:SS always.
- Daily reset: local 3:00 AM.
- Persistence: restore exact remaining time and running/paused state on reload.
- Alerts defaults: sound on, notifications off.
- Notification permission: request only when user enables notifications.

## Architecture Notes

- Implement timer logic in a client component with explicit mode/status state.
- Persist to localStorage with timestamp reconciliation to account for elapsed time during reload/background.
- Keep transitions deterministic and side effects centralized at phase completion.
- Keep accessibility baseline: keyboard controls and ARIA labels for current controls.

## Implementation Phases

1. Build domain state and transition rules.
2. Build circular UI shell and drag interactions.
3. Add settings drawer and alert toggles (duration adjustment lives in settings).
4. Add persistence/recovery and daily reset handling.
5. Validate transitions, edge cases, and keyboard accessibility.

## Verification Checklist

- Lint and build pass.
- Transition matrix: start, pause, resume, skip work, skip break, work complete, break complete.
- Drag behavior while running and paused.
- Reload recovery and 3:00 AM reset behavior.
- Sound and notification defaults/permissions verified.
- Keyboard checks for current controls (Space and Enter) verified.

## Undone

### Item 1

The Daily Reset

```text
Code Review Findings
...
Medium: Daily reset is checked by synthetic stale-key mutation, but not by a real clock-boundary behavior test.
Current coverage in pomodoro.spec.ts:204 verifies storage correction, which is useful, but does not validate real boundary timing behavior around 3:00 AM.
Risk is low-to-medium but it is still a coverage gap for production confidence.
...
Open Questions / Assumptions
...
Assumption: For this milestone, a synthetic daily reset check is acceptable instead of boundary-time simulation.
```

### Item 2

docs/pomodoro-main-window-plan.md and docs/pomodoro-main-window-qa.md

These 2 markdown documents might be a little off upon commit, given some changes made after the bulk of the code was generated.

TODO: Bring them into alignment with reality.
