# Window Size, Mini Mode & Settings Page Plan

This plan supersedes the earlier `docs/window-size-sync-plan.md`, which described a
fixed-size (non-resizable) window. The app is now **resizable** with a hard minimum,
has **two explicit view modes** (standard + mini) toggled by the user, and moves
settings from an in-window HTML `<dialog>` to a **separate route** (Phase 1).

---

## Goals

1. A **single source of truth** for window dimensions that drives both
   `src-tauri/tauri.conf.json` (`app.windows[0].width/.height/.minWidth/.minHeight`)
   and the TypeScript styling, plus a runtime guarantee.
2. The window opens at its **default** size (280 x 400), is **resizable** by the user
   (drag edges / macOS green button), and has a hard **minimum** (140 x 180).
3. A **standard** mode (full UI) and a **mini** mode (bare-minimum UI) toggled by an
   explicit action — not an automatic response to window size. Mini shrinks the window,
   scales the ring, hides secondary UI, and shows a small expand button to exit.
4. Settings live on a **separate `/settings` route** (Phase 1, purely frontend),
   reachable via the gear button and Cmd+, on macOS. A native secondary settings
   **window** (menu-bar item, etc.) is deferred to Phase 2.

---

## Decisions & rationale

- **Resizable, not fixed.** A fixed window was the original plan; the user now wants to
  "tuck the timer in a tight corner" and freely enlarge it. `resizable` stays true.
- **A hard minimum** (140 x 180) prevents shrinking into unusability. Currently a
  tentative value; may be revisited after manual testing.
- **Mini mode is an explicit toggle**, entirely separate from mouse/green-button resizing.
  No size-based breakpoint triggers it.
- **Mini exit is a small expand button.** Settings stay out of mini mode; the user exits
  to standard mode first, then reaches settings. (One-line change later to also show a
  gear in mini if desired.)
- **Settings as an in-app route** (Phase 1). A route renders identically on desktop and
  future mobile with zero extra Tauri permissions. A truly native, separate macOS/desktop
  settings **window** is deferred (Phase 2) because multi-window maps poorly to phones.
- **No window-state persistence.** The app opens at the default on every launch. Tauri
  does not persist window size/position by default, and we intentionally do not add
  persistence now (it would conflict with mini mode's fixed sizes). Deferred feature.
- **Config sync on `prebuild` only.** The compiled initial-window size must be correct for
  `build`, so set `minWidth`/`minHeight`/`width`/`height` at build time. No `predev` hook:
  the dev loop doesn't need a regenerated file, and the runtime `setSize`/`setMinSize`
  calls self-correct at launch anyway.

---

## Constants — `src/constants/window.ts` (single source of truth)

```ts
export const WINDOW_WIDTH = 280;
export const WINDOW_HEIGHT = 400;

export const MINI_WINDOW_WIDTH = 180;
export const MINI_WINDOW_HEIGHT = 250;

export const MIN_WINDOW_WIDTH = 140;
export const MIN_WINDOW_HEIGHT = 180;
```

- Default: 280 x 400 (content area; excludes OS title bar).
- Mini: 180 x 250 (compact but comfortable for the ring).
- Hard minimum: 140 x 180 (user-specified; tentative).
- `MINI_*` drives the mini window size and the `<main>` shell in mini mode.
- `MIN_*` drives `setMinSize` and `tauri.conf.json` `minWidth`/`minHeight`.

---

## Ring geometry — `src/constants/pomodoro.ts`

The current module-level `RING_SIZE`, `RADIUS`, `CENTER`, `CIRCUMFERENCE` are static and
used by both the SVG and the knob-drag pointer math. Because the ring must scale in mini
mode, they are replaced with a helper so the SVG `viewBox` and screen pixels stay 1:1
(keeping the drag math correct):

```ts
export const STROKE_WIDTH = 5;
export const DEFAULT_RING_SIZE = 212; // standard mode

export function ringGeometry(ringSize: number) {
  const radius = (ringSize - STROKE_WIDTH) / 2;
  const center = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  return { radius, center, circumference };
}
```

- Remove the static `RADIUS`/`CENTER`/`CIRCUMFERENCE` exports and update importers.
- `MIN_MINUTES`, `MAX_MINUTES`, `COLORS`, `STORAGE_KEY` stay unchanged.

---

## Config sync — `scripts/sync-window-size.mts`

- Node 24 runs TypeScript natively; `.mts` guarantees ESM.
- Imports the constants from `src/constants/window.ts` with an explicit `.ts` extension
  (which requires `allowImportingTsExtensions` in `tsconfig.json`).
- Reads `src-tauri/tauri.conf.json`, sets `app.windows[0]`:
  - `width = WINDOW_WIDTH`, `height = WINDOW_HEIGHT`
  - `minWidth = MIN_WINDOW_WIDTH`, `minHeight = MIN_WINDOW_HEIGHT`
  - `resizable = true`
- Writes back with `JSON.stringify(value, null, 2) + "\n"` to match current formatting
  (minimal diffs).
- Run via `npm run sync:window`. It is wired into **`prebuild` only**.

---

## `package.json`

- Add dependency `"@tauri-apps/api": "^2"` (matches CLI 2.11.4; needed for the settings
  window/page and window APIs).
- Scripts:
  ```json
  "sync:window": "node scripts/sync-window-size.mts",
  "prebuild": "npm run sync:window"
  ```
- No `predev` hook. The `tauri` wrapper stays `"tauri": "tauri"`; `tauri build` runs
  `beforeBuildCommand` (`npm run build`), which triggers `prebuild` and regenerates config.
  Plain `tauri dev` does not sync — the runtime `setSize`/`setMinSize` handles it.

---

## `tsconfig.json`

- Add `"allowImportingTsExtensions": true` (required for the `.ts` import specifier in
  the sync script; safe because `noEmit: true`).

---

## `src-tauri/tauri.conf.json` — window config

Set `resizable: true`. The `prebuild` sync regenerates the sizing keys:

```json
{
  "title": "Pomodoro",
  "width": 280,
  "height": 400,
  "minWidth": 140,
  "minHeight": 180,
  "resizable": true,
  "fullscreen": false
}
```

---

## `src-tauri/capabilities/default.json` — permissions

Add to `permissions`:

```json
"core:window:allow-set-size",
"core:window:allow-set-min-size"
```

- `setSize` — needed for the mode-switch window resize.
- `setMinSize` — needed to enforce the hard minimum.

Phase 2 adds `create-webview-window` and the global-shortcut plugin; not needed now.

---

## Runtime window sizing — `src/main.tsx`

On load (before first paint):

```tsx
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import {
  WINDOW_WIDTH, WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT,
} from "@/constants/window";

if (isTauri()) {
  const win = getCurrentWindow();
  win.setMinSize(new LogicalSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT));
  win.setSize(new LogicalSize(WINDOW_WIDTH, WINDOW_HEIGHT));
}
```

Guarded so plain-browser dev/test runs are no-ops. Mode switches trigger additional
`setSize` calls (see `PomodoroTimer`).

---

## Shared settings state — `src/context/pomodoro-settings.tsx`

Because settings move to a separate route, the settings state currently living inside
`PomodoroTimer` must be shared between `/` and `/settings`. Introduce a provider that
holds the settings plus `mini`, hydrated from and persisted to localStorage
(`pomodoro.main.v2`), and add `mini: boolean` to `PersistedState`. Wrap `<App />`.

Exactly what is shared: `workMinutes`, `breakMinutes`, `soundEnabled`,
`notificationsEnabled`, and `mini`. (Timer-run state like `mode`/`status`/`remainingSeconds`
stays in `PomodoroTimer` for Phase 1.)

---

## Settings page — `src/pages/settings.tsx` + route

- New `/settings` route in `src/App.tsx`.
- Reuses the existing setting controls (work/break minutes, sound, notifications) and adds
  a **mini mode toggle** (checkbox), reading/writing via the provider.
- Rendered as an in-window page (scrollable centered panel), not a `<dialog>`, so it scales
  when the window is enlarged.
- The settings `<dialog>` component can be removed or repurposed; the timer no longer opens it.

---

## `PomodoroTimer` changes — `src/components/pomodoro-timer.tsx`

1. **Dynamic ring:** use `ringGeometry(ringSize)` instead of static `CENTER`/`RADIUS`/
   `CIRCUMFERENCE`. `ringSize = DEFAULT_RING_SIZE` (212) in standard mode; in mini mode it
   shrinks to `MINI_RING_SIZE = 140` (180px window leaves ~20px side padding; 140px min
   window leaves ~5px). SVG `width`/`height`/`viewBox` and the knob-drag math use the
   dynamic `center`/`radius`.
2. **Mini-mode UI** (when `mini` is true): hide mode label, skip button, completed count,
   and the bottom settings bar; scale the timer text down (`text-6xl` → `text-4xl`); show a
   small **expand button** (`data-testid="expand-button"`) that sets `mini = false`.
3. **Resize on toggle:** an effect watching `mini` calls
   `getCurrentWindow().setSize(new LogicalSize(...))` with `MINI_*` or `WINDOW_*`.
4. **Gear → settings:** the existing `data-testid="settings-open-button"` becomes a
   navigation action (`navigate("/settings")`) instead of `setSettingsOpen(true)`.
   Remove the `settingsOpen` state and the `PomodoroSettingsDialog` usage from the timer.

---

## Cmd+, (macOS)

Add a global `keydown` handler (e.g. in a small hook or the settings provider) that on
`metaKey && key === ","` calls `navigate("/settings")`. This is web-level and works in the
browser and in Tauri. Phase 2 replaces it with a native macOS menu item.

---

## E2e test impact — `tests/pomodoro.spec.ts`

Selectors used today: `mode-label`, `time-display`, `center-control`, `skip-button`,
`settings-open-button`, `completed-count`, `work-minutes-input`, `break-minutes-input`,
`sound-toggle`, `notifications-toggle`, `settings-close-button`, `drag-knob`,
`skip-confirm-dialog`/`-cancel`/`-confirm`.

- `settings-open-button` now navigates away instead of opening a dialog. Tests that open
  settings, edit values, then continue on the timer must navigate back to `/` after editing.
- `settings-close-button` (the "Done" button) may change or be removed.
- Data persists via the provider/localStorage across route changes, so the flows still work
  with navigation steps added.
- Add new tests: mini-mode toggle (via `/settings`), expand-button exit, and Cmd+, navigation.
- Existing drag/geometry tests (`dragKnobToRemaining`) are safe — they read geometry from
  the SVG bounding box, which now matches the dynamic `ringSize`.

---

## Verification

1. `node scripts/sync-window-size.mts` — confirm only the intended keys change in
   `tauri.conf.json`.
2. `npx tsc --noEmit` passes.
3. `npm run lint` passes.
4. `npm run build` passes (runs `prebuild` sync first).
5. `npm run test:e2e` passes after updating the settings-flow tests.
6. Manual `npm run tauri dev`:
   - Window opens 280 x 400, resizable, hard floor 140 x 180.
   - Drag to resize → content centers/clips at larger sizes.
   - Gear / Cmd+, → settings page; edit values → persist on return.
   - Toggle mini (in settings) → window snaps to 180 x 250, ring scales, secondary UI hides,
     expand button appears.
   - Click expand → returns to 280 x 400, full UI restored.
   - Drag knob works in both modes (dynamic geometry).

---

## Out of scope / deferred (Phase 2)

- Native secondary settings **window** on desktop (`WebviewWindow`, `create-webview-window`
  permission, macOS menu item).
- Platform global shortcut via Rust / real macOS menu item (replacing the Cmd+, keydown).
- Window-state persistence (size/position across launches).
- Mobile targets (`tauri ios init` / `tauri android init`) and mobile multi-window behavior.
