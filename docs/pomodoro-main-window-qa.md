# Pomodoro Main Window QA Report

Date: 2026-08-06

## Scope
Validation for the implemented v1 main window behavior after latest UI refinements.

## Automated Manual-Flow Checks (Playwright Browser Session)
- Default boot state: Focus, 20:00, Start.
- Start/Pause/Resume transitions.
- Drag while paused updates time.
- Drag while running updates time and keeps running state.
- Skip confirm cancel keeps phase unchanged.
- Skip from work increments completed count and moves to break ready state.
- Skip from break does not increment completed count and moves to work ready state.
- Natural work completion at 00:01 transitions to break idle.
- Natural break completion at 00:01 transitions to work idle.
- Reload while running restores running state and decremented remaining time.
- Stale completed-day key in storage resets daily count to 0.
- Keyboard: Space toggles pause/resume; Enter activates focused settings button.
- Alert defaults: sound enabled, notifications disabled.

## Result
- Passed: 14/14 behavior checks in the core matrix.
- Keyboard verification: pass.
- Lint: pass.
- Build: pass.

## Notes
- Label casing in rendered mode text is visually uppercase due text transform; state behavior is correct.
- 3:00 AM reset boundary was verified via stale day-key simulation in persisted state (functional equivalent check).
