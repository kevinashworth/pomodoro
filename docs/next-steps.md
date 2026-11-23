# Next Steps

> **Last updated November 21, 2026, at version 0.3.14.** Remove items as they ship.

## Back burner

- **Seconds rollover:** arrow keys on seconds should roll into minutes in both directions. See "Direct edit" in `docs/known-issues.md`.
- **Clamp feedback:** tell the user when a direct edit is clamped at the maximum. See "Direct edit" in `docs/known-issues.md`.
- **Global start/pause hotkey:** a system-wide shortcut, probably with `tauri-plugin-global-shortcut`. It was planned in an early tray prototype but never built.
- **Remove the positioner plugin:** the app calculates the window position itself. Remove the plugin from `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `package.json`, and both files in `src-tauri/capabilities/`, then retest tray positioning with `docs/2026-11-02-manual-testing.md`.
- **Add CI:** the repo has no CI. Run type checks, lint, and tests, and include the version drift check from `docs/known-issues.md`.
- **Check duplicated values:** add a test for the Rust and TypeScript values listed in `CLAUDE.md`, which nothing currently enforces.
- **Exact restore:** save `endAt` with the timer snapshot so a relaunch restores a running timer exactly. See "Restore can add a second or two" in `docs/known-issues.md`.
- **One wakeup per second:** the countdown polls every 250 ms, and with background throttling disabled it keeps doing so while the menu-bar window is hidden. Scheduling each poll for the next whole-second boundary of `endAt` would keep the same accuracy with a quarter of the wakeups.
- **One timer source of truth:** `endAt` and `remainingSeconds` are both state, so every action must keep them in step. Deriving `remainingSeconds` from `endAt`, and folding the countdown and day-rollover listeners into one clock handler, would remove that bookkeeping.
- **Require macOS 14:** setting `bundle.macOS.minimumSystemVersion` to `14.0` in `src-tauri/tauri.conf.json` would guarantee background throttling stays off. See "Background throttling needs macOS 14" in `docs/known-issues.md`.
- **Small timer cleanups:** expose or remove `dailyResetHour`, and remove the unused `DEFAULT_TIMER_STATE.remainingSeconds`.

## Archived history

- `archive/native-timer-scheduler`: an October prototype of a native Rust timer scheduler with App Nap suppression. Not needed after the wall-clock fix, but useful if alarm timing ever regresses.
- `archive/legacy`: project history from before the Vite rewrite.
