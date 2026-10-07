# Window Visuals and Fade In / Out

## What it does

- The main window is transparent and the visible surface is a single rounded `WindowFrame`, so the whole window has rounded corners (the desktop shows through the corners) instead of a square native frame.
- Showing and hiding fade the window: ~100ms fade-in, ~220ms fade-out. The fade applies on every hide path: tray toggle, close request, and focus loss.

## Architecture

- **Transparent window** (`src-tauri/tauri.conf.json`): `app.macOSPrivateApi: true`; window `transparent: true`, `backgroundColor: "#00000000"`, `shadow: true`. Requires the `macos-private-api` feature on the `tauri` crate (`src-tauri/Cargo.toml`).
- **No first-paint flash**: an inline `<style>` in `index.html` sets `html, body { background: transparent }`, and `--background` in `src/index.css` is now `transparent`.
- **Rounded surface**: `Layout` is a plain centering wrapper now; `WindowFrame` carries the `bg-zinc-900` surface, border, and `rounded-2xl`.
- **Fade** is CSS-driven and timed by Rust:
  - `src-tauri/src/lib.rs` owns the timing. `hide_with_fade` emits `window:hide-requested`, then hides after `FADE_OUT_MS + 40ms`. `toggle_window` emits `window:shown` right after `show()`.
  - `src/hooks/use-window-fade.ts` listens for both events and toggles `#root`'s `opacity` with a per-direction transition.
  - `HIDING` (an `AtomicBool`) guards against a tray click landing mid-fade, which would otherwise race the pending hide.

## Notes

- `window:shown` and `window:hide-requested` are **custom** events.
- Fade durations live in two places and must stay in sync: `FADE_OUT_MS` in `lib.rs` and `FADE_IN_MS`/`FADE_OUT_MS` in `use-window-fade.ts`. (Rust only times the fade-out; the fade-in duration is frontend-only.)
- Non-Tauri (browser, Playwright, jsdom) short-circuits on `isTauri()`, so the fade never runs in tests or the web preview.
