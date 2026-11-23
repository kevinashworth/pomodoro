# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Pomodoro timer built with Vite, React 19, TypeScript, and Tailwind CSS 4. The same frontend runs as a web app and inside a Tauri 2 macOS shell (`src-tauri/`), which adds desktop and menu-bar modes.

## Commands

```bash
npm run dev               # web dev server on :5173 (strict port)
npm run dev:tauri         # desktop app in dev mode
npm run build             # web production build
npm run build:tauri       # desktop app bundle

npm run check:types       # tsc --noEmit
npm run lint              # ESLint (lint:fix to apply fixes)
npm run format            # Prettier check only; format:fix writes changes

npm run test:unit         # Vitest, single run
npm run test:unit:watch   # Vitest, watch mode
npm run test:e2e          # Playwright (starts its own dev server on :4173)

npx vitest run src/utils/time.test.ts     # one unit test file
npx vitest run -t "part of a test name"   # unit tests by name
npx playwright test -g "part of a test name"   # e2e tests by name
```

Bump the version with `npm version <patch|minor|major> --ignore-scripts=false`. This requires `cargo-edit`. `package.json` is the source of truth, and `src/version.mjs` is generated, so do not hand-edit it. Do not add `ignore-scripts=false` to a repo `.npmrc`. See `DEVELOPMENT.md`.

## Architecture

### Provider order

`src/main.tsx` nests `BrowserRouter > AppModeProvider > PomodoroSettingsProvider > SoundsProvider > PomodoroTimerProvider > App`. The order is a dependency chain: `AppModeProvider` navigates with the router, and the timer consumes app mode, settings, and sounds. The timer lives above the routes so it keeps running while Settings is open.

### Timer state machine

`src/hooks/use-pomodoro-timer.ts` owns all timer behavior and is exposed through `usePomodoroTimer()`. Its invariants span several files:

- **One clock value holds status and time.** `clock` (`TimerClock` in `src/utils/timer-utils.ts`) is either running, with `endAt` and `syncedAt`, or stopped, with frozen `remainingSeconds`. A running timer's seconds are always derived from `endAt`. `syncedAt` is the clock reading that render derives them against. A wakeup at each whole-second boundary of `endAt`, plus focus and visibility events, advances it, so the countdown never depends on how often timers fire.
- **Zero is the phase-end sentinel.** `status === "running" && remainingSeconds === 0` triggers the transition during render. User edits go through `clampRemainingForStatus` (`src/utils/timer-utils.ts`), which floors a running timer at 1 second.
- **Render stays pure.** Phase transitions are render-time state adjustments. Do not read the clock during render. The duration clamp and day rollover run in effects for this reason, and the clamp measures against `Date.now()` because `syncedAt` can be stale in a throttled tab.
- **Only natural phase ends announce.** Sounds and notifications fire from `phaseEndEvent`, which Skip and Reset never set.
- **Persistence waits for hydration.** State is saved to `localStorage` only after `hydrated` is true, so defaults cannot overwrite a saved snapshot.
- **Restore is exact.** Snapshots save `endAt`, and `restoreTimerState` (`src/utils/timer-storage.ts`) resumes a running timer from it (older snapshots fall back to `updatedAt + remainingSeconds`). It advances at most one phase and discards snapshots from an earlier pomodoro day.
- **Days start at 3:00 AM.** `getDayId` defines the pomodoro day. A live app detects rollover with a 30-second poll plus focus and visibility events, then resets to an idle work phase, even if a session is running.

Storage keys are versioned in `src/constants/pomodoro.ts`. Settings loading in `src/context/pomodoro-settings.tsx` normalizes each field, so new settings need a fallback there.

### Web and native boundary

Guard Tauri-only calls with `isTauri()` or `IS_WEB` (`src/constants/env.ts`) so the web build keeps working. `src/utils/notifications.ts` shows the pattern for features with both web and native paths.

Native actions that change the visible page follow a handshake, so the wrong route never flashes on screen:

1. Rust emits a request event (`tray-show-requested` or `app-mode-requested`).
2. The frontend navigates to the target route (`src/App.tsx`, `src/context/app-mode.tsx`).
3. The frontend calls back with `invoke` (`show_main_window` or `set_app_mode`).

In `src-tauri/src/lib.rs`, the app always launches in desktop mode, and the tray exists only in menu-bar mode. Rust owns the menu-bar hide timing: it emits `window:hide-requested`, waits for the fade, and uses `HIDE_GENERATION` to cancel a stale hide.

### Values duplicated across Rust and TypeScript

Nothing enforces these at build time, so change both sides together:

| Value                       | Locations                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Menu, tray, and mode events | `src-tauri/src/menu_actions.rs`, `src/constants/menu.ts`, `src/constants/app-mode.ts` |
| App mode strings            | `AppMode` in `src-tauri/src/lib.rs`, `src/constants/app-mode.ts`                      |
| Window dimensions           | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src/constants/window.ts`        |
| `FADE_OUT_MS`               | `src-tauri/src/lib.rs`, `src/hooks/use-window-fade.ts`                                |
| `window:*` event names      | `src-tauri/src/lib.rs`, `src/hooks/use-window-fade.ts`                                |

### Sounds

`src/constants/sounds.ts` is the catalog, and `SoundsProvider` creates one Howl per entry, so adding a sound does not require a provider change. Keep the catalog and `public/sounds/` in step. `docs/sounds.md` records which events play which sound.

## Testing

- Vitest only collects `src/**/*.{test,spec}.{ts,tsx}`. Playwright runs `tests/`. `tests/setup.ts` is the Vitest setup file despite its location.
- `tests/setup.ts` mocks `howler` globally with `src/test/sound-mock.ts` and clears `localStorage` after each test.
- Use `renderTimer` from `src/test/render-timer.tsx` for timer component tests. It seeds persisted state and wraps the required providers.
- E2E tests select elements by `data-testid`. Seed timer state from inside the page so `updatedAt` follows the mocked `page.clock`.
- Native window, tray, and menu behavior is not covered by automated tests. Use the checklist in `docs/2026-11-02-manual-testing.md`.

## Git workflow

- `main` is protected by a GitHub ruleset. All changes reach it through a branch and PR.
- Claude may create branches and commits, but does not push or merge. The maintainer does both.

## Project notes

- Import from `src` with the `@/` alias.
- `docs/next-steps.md` lists planned work and ideas. Check it when choosing what to work on.
- `docs/known-issues.md` lists accepted limitations and intentional behavior. Check it before treating rollover lag or one-directional clamping as bugs.
