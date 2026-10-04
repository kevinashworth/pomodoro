# Manual Testing

Automated coverage stops at the webview boundary. Native OS surfaces — the tray
icon, its context menu, window visibility, and positioning — have no test driver
on macOS (WKWebView ships no WebDriver), so verify them by hand.

Run `npm run dev:tauri` and check:

The window is undecorated (`"decorations": false`), so there is no title bar or
close button. The `CloseRequested` handler still hides instead of quitting as a
safety net, but it isn't reachable from the UI.

## Tray menubar

- [ ] Tray icon appears in the menu bar.
- [ ] No dock icon appears (app runs as a menu-bar accessory).
- [ ] Left-click toggles the window: hidden → shown, then visible → hidden.
- [ ] Shown window is centered under the tray icon and `MENU_BAR_GAP` below the menu bar.
- [ ] On a multi-monitor setup, the window opens on the monitor whose menu bar was clicked.
- [ ] Right-click opens the tray context menu with a **Quit** item.
- [ ] Tray **Quit** exits the app.
- [ ] Settings page **Quit** button exits the app (`⌘,` opens settings).
- [ ] Typing `⌘Q` exits the app.
- [ ] Clicking away auto-hides the window (and hides the app on macOS).
- [ ] Re-opening after auto-hide restores position and focus.

## Web-only surfaces

- [ ] `npm run dev` in a browser shows the **playground** link; the Tauri app does not.
- [ ] `/playground` only resolves in the browser during dev.
