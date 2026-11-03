# Desktop and Menu-Bar Modes

> **Current as of November 2, 2026.**

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
- **Commands**: `get_app_mode`, `set_app_mode`, `show_main_window`,
  `set_tray_title`, `quit`.
- **Events**: `app-mode-changed` keeps the frontend in sync after a native
  switch. `app-mode-requested` and `tray-show-requested` let native tray
  actions ask the frontend to navigate first, then reveal the window. `app-menu`
  carries Settings / Go to Timer actions from the app menu.
- **Tray menu**: Show Pomodoro requests the timer; Settings… requests
  `/settings`; Use Desktop Window requests a mode switch; Quit exits. The
  frontend navigates before asking Rust to show the window or change modes.
- **Frontend**: `AppModeProvider` reads the mode from Rust on mount (important
  after a webview reload in menu-bar mode), listens for changes, and navigates
  to `/` before requesting a mode switch. Tray show requests navigate first;
  Rust reveals the window only after the requested route has rendered.
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
- The tray icon is created after switching to the accessory activation policy
  and removed when returning to Desktop mode. Creating it after the policy
  change is required for reliable status-item visibility in `tauri dev`.
- There is no View menu, because macOS automatically injects “Enter Full
  Screen” into a menu named View. “Go to Timer” lives in the Pomodoro app menu.
- `showTimerInMenuBar` remains a persisted preference. The control is hidden
  unless Menu bar mode is selected.
