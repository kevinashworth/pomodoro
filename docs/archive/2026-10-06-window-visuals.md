# Window Visuals and Fade In / Out

> **Archived.** This document is superseded by
> [2026-11-02-window-visuals.md](../2026-11-02-window-visuals.md).

## What it does

- The window is transparent at the OS level in both modes.
- **Desktop mode**: a native macOS rounded window with a dark native title bar
  (`titleBarStyle: "Transparent"`, `hiddenTitle: true`) holding the traffic
  lights. The title bar uses the same zinc background as the app body. The
  window is draggable by its native title bar. `WindowFrame` drops its own
  border/rounding in this mode because the native window supplies them.
- **Menu-bar mode**: a frameless `280×454` popup with the rounded bordered
  `WindowFrame` card.
- Showing and hiding the menu-bar popup fade the window: ~100 ms fade-in and
  ~220 ms fade-out. Fading applies to tray toggle, close request, and focus
  loss. Desktop mode never fades; it is a normal always-visible window.

## Architecture

- **Transparent window** (`src-tauri/tauri.conf.json`): `app.macOSPrivateApi:
  true`; window `transparent: true`, `backgroundColor: "#18181b"`, `shadow:
  true`, `decorations: true`, `titleBarStyle: "Transparent"`, `hiddenTitle:
  true`. Requires the `macos-private-api` feature on the `tauri` crate
  (`src-tauri/Cargo.toml`).
- **Desktop launch**: the webview content is `280×454`; the native title bar sits
  outside it. Menu-bar mode resizes nothing but removes decorations and sets the
  window background transparent.
- **Background color**: Desktop mode sets the native window background to zinc
  so the transparent title bar matches the body. Menu-bar mode sets it back to
  transparent so the rounded card's corners show through.
- **No first-paint flash**: an inline `<style>` in `index.html` sets `html,
  body { background: transparent }`, and `--background` in `src/index.css` is
  `transparent`. `Layout` paints zinc behind desktop/browser content.
- **Fade** is CSS-driven and timed by Rust:
  - `src-tauri/src/lib.rs` owns the timing. `hide_with_fade` emits
    `window:hide-requested`, then hides after `FADE_OUT_MS + 40ms`.
    `toggle_window` emits `window:shown` right after `show()`.
  - `src/hooks/use-window-fade.ts` listens for both events and only applies
    opacity transitions in menu-bar mode. Desktop always forces opacity to 1.
  - `HIDING` and `HIDE_GENERATION` guard against a tray click or mode switch
    racing a pending hide.

## Notes

- `window:shown` and `window:hide-requested` are **custom** events.
- Fade durations live in two places and must stay in sync: `FADE_OUT_MS` in
  `lib.rs` and `FADE_IN_MS` / `FADE_OUT_MS` in `use-window-fade.ts`. (Rust only
  times the fade-out; the fade-in duration is frontend-only.)
- Non-Tauri (browser, Playwright, jsdom) short-circuits on `isTauri()`, so the
  fade never runs in tests or the web preview.
- Switching between modes is immediate; entering menu-bar mode hides the window
  after notifying the frontend, without waiting for the fade.
