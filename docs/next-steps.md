# Next Steps

> **Last updated November 23, 2026, at version 0.3.16.** Remove items as they ship.

## Back burner

- **Global start/pause hotkey:** a system-wide shortcut, probably with `tauri-plugin-global-shortcut`. It was planned in an early tray prototype but never built.
- **Remove the positioner plugin:** the app calculates the window position itself. Remove the plugin from `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `package.json`, and both files in `src-tauri/capabilities/`, then retest tray positioning with `docs/2026-11-02-manual-testing.md`.
- **Add CI:** the repo has no CI. Run type checks, lint, and tests, and include the version drift check from `docs/known-issues.md`.
- **Check duplicated values:** add a test for the Rust and TypeScript values listed in `CLAUDE.md`, which nothing currently enforces.
- **Require macOS 14:** setting `bundle.macOS.minimumSystemVersion` to `14.0` in `src-tauri/tauri.conf.json` would guarantee background throttling stays off. See "Background throttling needs macOS 14" in `docs/known-issues.md`.

## Archived history

- `archive/native-timer-scheduler`: an October prototype of a native Rust timer scheduler with App Nap suppression. Not needed after the wall-clock fix, but useful if alarm timing ever regresses.
- `archive/legacy`: project history from before the Vite rewrite.
