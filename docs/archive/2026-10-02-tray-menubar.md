# Desktop and Menu-Bar Modes

> **Archived.** This document is superseded by
> [2026-11-02-desktop-and-menu-bar-modes.md](../2026-11-02-desktop-and-menu-bar-modes.md).

## What it does

The desktop app launches as a normal macOS desktop window and can switch to a
menu-bar (tray) popup while it is running.

- **Desktop mode** is the launch mode on every start.
  - Native rounded window with a dark native title bar containing the traffic
    lights. There is no title text.
  - Dock icon and native app menu.
  - Closing the window, `⌘W`, or `⌘Q` quits.
  - No auto-hide.
- **Menu-bar mode** is entered from Settings → App → Window mode → Menu bar.
  - Dock icon and native app menu disappear.
  - A tray icon appears and the window hides immediately.
  - Left-click toggles the popup below the menu bar.
  - Right-click opens the tray menu: Show Pomodoro, Settings…, Use Desktop Window,
    Quit.
  - The window auto-hides on focus loss; closing it hides rather than quits.
  - `⌘Q` is unavailable; tray Quit (or the Settings Quit button) is the exit.

The mode is not persisted. Every launch begins in Desktop mode. Within a
session, “Use Desktop Window” in the tray menu (or the Settings control) returns
to Desktop mode and centers the window on the active monitor.

**Both mode changes and Show Pomodoro always land on the timer**, never on
Settings. Settings remains reachable from the tray menu or `⌘,`.

## Architecture

- **Rust** (`src-tauri/src/lib.rs`): owns the current `AppMode`, builds the tray
  once, installs/removes the native menu, changes activation policy, window
  decorations, background color, size, always-on-top, and visibility, and
  handles mode-aware close/focus behavior.
- **Commands**: `get_app_mode`, `set_app_mode`, `set_tray_title`, `quit`.
- **Event**: `app-mode-changed` keeps the frontend in sync after a native
  switch. `app-menu` carries Settings / Go to Timer actions.
- **Tray menu**: Show Pomodoro shows the timer; Settings… opens `/settings`;
  Use Desktop Window switches modes; Quit exits.
- **Frontend**: `AppModeProvider` reads the mode from Rust on mount (important
  after a webview reload in menu-bar mode) and listens for changes. `App`
  navigates to `/` whenever the mode changes.
- **Window sizing**: the webview content is `280×454` in both modes. Desktop
  mode adds the native title bar outside that content.

## Notes

- The window is created transparent because transparency cannot be changed at
  runtime. Desktop mode paints an opaque surface and gives the native title bar
  the same zinc background; menu-bar mode shows the rounded card on a
  transparent window.
- The native app menu is Desktop-only. Menu-bar mode has no native menu, so
  `⌘Q` is unavailable there and clipboard shortcuts may not work in its
  Settings page.
- There is no View menu, because macOS automatically injects “Enter Full
  Screen” into a menu named View. “Go to Timer” lives in the Pomodoro app menu.
- `showTimerInMenuBar` remains a persisted preference. The control is hidden
  unless Menu bar mode is selected.
- In development, a macOS Dock-icon override is installed so `tauri dev` does
  not show the generic executable icon.
