# Tray Menubar

## What it does

The desktop app now lives in the system tray (menu bar on macOS) instead of an app menu.

- Tray icon `main_tray`, built from `icons/favicon.png`, template-rendered for macOS dark mode.
- Left-click toggles the `main` window: hidden → shown, positioned below the tray via `Position::TrayCenter`; visible → hidden.
- `show_menu_on_left_click(false)` — left-click is the toggle; right-click opens a tray context menu with **Quit** (`CmdOrCtrl+Q`).
- Quit is also available from the **Settings** page (bottom-left `quit` button), which invokes the Rust `quit` command from the UI.
- Window is hidden, not closed: `CloseRequested` is prevented.
- Window auto-hides on focus loss (and hides the whole app on macOS).

## Architecture

- **Rust**: tray + window events wired in `lib.rs` (`toggle_window`, `quit` command).
- **Positioner**: `tauri-plugin-positioner` provides `move_window(Position::TrayCenter)` and `on_tray_event`, which feeds tray geometry to the positioner. Plugin is registered on the builder, desktop-only.
- **Tray menu**: built with `MenuBuilder` / `MenuItemBuilder`; the `Quit` item id lives in `menu_actions.rs` (`ITEM_QUIT`).
- **Quit paths**: tray `on_menu_event` and the `quit` Tauri command both call `app.exit(0)`.
- **Mobile**: all tray/window/menu code is gated `#[cfg(desktop)]`; positioner is target-gated in `Cargo.toml`. The `quit` command is not gated, so the Settings button works on mobile too. Foundation only — mobile is not wired up yet.

## Notes

- `menu.rs` (native app menu) is no longer compiled and can be deleted; `menu_actions.rs` now only holds tray ids.
- The Settings `quit` button is only rendered when running under Tauri (`isTauri()`), so it does not appear in the browser.
- `@tauri-apps/plugin-positioner` is pinned to `2.3.4` to match the Rust crate (no `2.4` crate released).

## Obsolete

[docs/2026-09-04-app-menu.md](2026-09-04-app-menu.md) is **obsolete**. It documents the native app menu (Pomodoro/View submenus, Cmd+, / Cmd+1 / Cmd+⇧M shortcuts) that has been replaced by the tray menubar described above.
