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

Timer behavior is a pure reducer in `src/timer/timer-reducer.ts`, and its header explains how the timer works. `src/hooks/use-pomodoro-timer.ts` wires the reducer to the clock, storage, sounds, and notifications, and exposes it through `usePomodoroTimer()`. Before changing it:

- Actions carry `now` and the phase durations. Read the clock in the hook's event handlers and effects, never in the reducer or during render.
- Only natural phase ends (`sync`, or a late `pause`) bump `phaseEnd`, and only `sync` and starting from idle bump `ticks`. That is what keeps Skip, Reset, edits, and duration changes silent.
- `src/timer/timer-storage.ts` saves the reducer's snapshot as is and validates it on restore.

Storage keys are versioned in `src/constants/pomodoro.ts`. The app is in beta, so saved state does not need to stay compatible: when the saved timer or settings shape changes, bump its key instead of adding fallbacks for older data. Settings loading in `src/context/pomodoro-settings.tsx` normalizes each field, so a new setting needs a default there.

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
- E2E tests select elements by `data-testid`. Seed timer state with `seedTimerStateOnInit`. Under a mocked `page.clock`, pass `dayId` explicitly.
- Native window, tray, and menu behavior is not covered by automated tests. Use the checklist in `docs/2026-11-02-manual-testing.md`.

## Git workflow

- `main` is protected by a GitHub ruleset. All changes reach it through a branch and PR.
- Claude may create branches and commits, but does not push or merge. The maintainer does both.

## Project notes

- Import from `src` with the `@/` alias.
- `docs/next-steps.md` lists planned work and ideas. Check it when choosing what to work on.
- `docs/known-issues.md` lists accepted limitations and intentional behavior. Check it before treating rollover lag or one-directional clamping as bugs.
