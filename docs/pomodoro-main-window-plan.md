# Pomodoro Main Window v1 Plan

## Product Goal

Create a compact Pomodoro timer experience with a circular countdown UI, Work and Break phases, adjustable durations, settings controls, and daily completion tracking.

## Confirmed Decisions

- Layout: a centered card-style timer that stays compact on small screens while remaining responsive.
- Ring style: thin stroke, clockwise remaining-time depletion, and a 12 o'clock anchor.
- Dragging: enabled while paused and while running, with 1-second granularity and no phase-boundary crossing.
- Running lower bound while dragging: clamp to 00:01; when paused, the value can reach 00:00.
- Center control: Pause/Resume, with Start shown when idle.
- Top-right control: skip current phase via a dedicated skip button with confirmation.
- Skip behavior: skipping from Work increments Completed today and transitions to Break; skipping from Break does not increment the count and transitions to Work.
- Auto-start behavior: disabled for phase transitions.
- Phase completion: Work completion moves to Break ready, and Break completion moves to Work ready.
- Duration controls: adjust durations in settings rather than through below-ring buttons; values are bounded to 1..60 minutes.
- Settings entry: gear button.
- Settings v1: Work minutes, Break minutes, accent preset, sound toggle, and notifications toggle.
- Time format: MM:SS always.
- Daily reset: local 3:00 AM using a persisted day key.
- Persistence: restore mode, status, remaining time, and settings on reload, while reconciling elapsed time since the last save.
- Alerts defaults: sound on, notifications off.
- Notification permission: request only when the user enables notifications.

## Architecture Notes

- Implement timer logic in a client component with explicit mode and status state.
- Persist state to localStorage and reconcile elapsed time on reload to keep the countdown accurate after backgrounding or refresh.
- Keep transitions deterministic and centralize phase-completion side effects.
- Maintain an accessibility baseline with keyboard controls and ARIA labels for the current controls.

## Implementation Phases

1. Build domain state and transition rules.
2. Build the circular UI shell and drag interactions.
3. Add the settings dialog and alert toggles.
4. Add persistence, recovery, and daily reset handling.
5. Validate transitions, edge cases, and keyboard accessibility.

## Verification Checklist

- Lint and build pass.
- Transition matrix covers start, pause, resume, skip work, skip break, work complete, and break complete.
- Drag behavior is verified while running and paused.
- Reload recovery and 3:00 AM reset behavior are covered by persisted-state scenarios.
- Sound and notification defaults and permission handling are verified.
- Keyboard checks for Space and Enter are verified.

## Current Status

The implementation is now reflected by the repo’s Playwright coverage and the component logic in src/components/pomodoro-timer.tsx. The remaining follow-up, if desired, is to add a real clock-boundary test around the 3:00 AM reset path; the current suite validates the same behavior through stale persisted-day-key simulation.
