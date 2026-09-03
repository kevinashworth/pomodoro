# Window Size Sync Plan

> **Superseded** — see [window-size-mini-mode-plan.md](./window-size-mini-mode-plan.md). This plan described a fixed-size window; the app is now resizable with a hard minimum plus standard/mini modes.

## Goal

Single source of truth for window width/height that drives both `src-tauri/tauri.conf.json` (`app.windows[0].width` / `.height`) and the TypeScript styling, plus a runtime guarantee.

## Prerequisites (not yet in place)

This is the app's first use of the Tauri JS API, so two things must be added first:

1. `@tauri-apps/api` is **not** currently a dependency — the frontend uses zero Tauri APIs today (step 3 below adds it).
2. `src-tauri/capabilities/default.json` currently grants only `core:default` — the runtime `setSize` (step 6) will be silently blocked until `core:window:allow-set-size` is added (step 5).

Both are covered in the changes below, but the runtime resize will not work without them.

## Flow

`src/constants/window.ts` (`WINDOW_WIDTH` / `WINDOW_HEIGHT`) -> sync script rewrites `app.windows[0]` in `tauri.conf.json` before any `tauri`/`build` run -> the same constants drive the fixed-size app shell and a runtime `setSize` on mount. (CSS px = logical window px 1:1, so values map directly.)

## Changes

1. **New `src/constants/window.ts`** — `export const WINDOW_WIDTH = 280; export const WINDOW_HEIGHT = 400;`. No imports, so Node can run it directly.

2. **New `scripts/sync-window-size.mts`** — imports the constants (with explicit `.ts` extension, required by Node), reads `src-tauri/tauri.conf.json`, sets `app.windows[0].width/height`, writes back with `JSON.stringify(..., null, 2)` + newline (matches current formatting exactly -> minimal diffs). Run via `node` (Node 24 runs TS natively; `.mts` guarantees ESM).

3. **`package.json`**
   - Add dep `"@tauri-apps/api": "^2"` (matches CLI 2.11.4).
   - `"tauri": "node scripts/sync-window-size.mts && tauri"` — syncs before the CLI reads config for both `dev` and `build`.
   - `"build": "node scripts/sync-window-size.mts && vite build"` — covers `beforeBuildCommand` and plain Vite builds.

4. **`tsconfig.json`** — add `"allowImportingTsExtensions": true` (required for the `.ts` import specifier; safe since `noEmit: true`).

5. **`src-tauri/capabilities/default.json`** — add `"core:window:allow-set-size"` (verified it is **not** in `core:window:default`). Runtime resize won't work without it.

6. **`src/main.tsx`** — on load, `if (isTauri()) getCurrentWindow().setSize(new LogicalSize(WINDOW_WIDTH, WINDOW_HEIGHT))` (from `@tauri-apps/api/core`, `/dpi`, `/window`). Guarded so plain-browser dev/test runs are no-ops; runs once before first paint.

7. **`src/pages/home.tsx`** — replace `<main className="w-full bg-amber-50 h-screen">` with a fixed shell: `className="bg-amber-50"` + inline `style={{ width: WINDOW_WIDTH, height: WINDOW_HEIGHT }}`. Outer `flex items-center justify-center overflow-hidden` centers it and clips if the window is resized smaller. `PomodoroTimer`'s `h-full` then resolves against the fixed height; its content (~328px tall, 244px wide) still fits 280x400.

## Verification

- `node scripts/sync-window-size.mts` — confirm only the two numbers change in `tauri.conf.json`.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- `npm run test:e2e` (tests compute geometry from bounding rects, so the fixed shell shouldn't break them).
- Manual `npm run tauri dev` to confirm the window opens at 280x400.

## Notes

- Values change only in `src/constants/window.ts`; config restores itself via npm scripts. (Running `npx tauri dev` directly skips the sync — runtime `setSize` still corrects it.)
- `WINDOW_HEIGHT` (356) is a content height and assumes a 32px macOS title bar on the 388px outer window in `tauri.conf.json`. The real title-bar height varies by macOS version/theme, so the content area may not exactly fill the window (possible white strip at the bottom) until the runtime `setSize` sync below is implemented.
- `resizable: true` stays as-is; the fixed shell just centers/clips. If a truly fixed-size window is preferred, set `"resizable": false` in the same config.
