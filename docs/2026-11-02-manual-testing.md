# Manual Testing

> **Current as of November 2, 2026.**

Automated coverage stops at the webview boundary. Native OS surfaces — the
window chrome, app menu, tray, visibility, activation policy, and positioning —
have no test driver on macOS (WKWebView ships no WebDriver), so verify them by
hand.

Run `npm run dev:tauri` and check:

## Desktop mode (launch)

- [ ] App launches in Desktop mode, with the configured Dock icon in a bundled
      build. (`tauri dev` may show the generic executable icon.)
- [ ] Window has native macOS rounded corners and a dark native title bar with
      traffic lights, matching the app body color.
- [ ] The native title bar can be dragged; clicking it works normally.
- [ ] Window content is fixed-size at 280×454 and the timer page is not clipped.
- [ ] Tray icon is not visible.
- [ ] Native menu contains Pomodoro, Edit, and Window; no View or Help menu.
- [ ] Pomodoro → Settings… (`⌘,`) opens Settings.
- [ ] Pomodoro → Go to Timer (`⌘1`) returns to the timer.
- [ ] Edit commands work in Settings inputs (Cut/Copy/Paste/Select All).
- [ ] Window → Close Window (`⌘W`) quits.
- [ ] Closing the window quits.
- [ ] `⌘Q` quits.

## Settings → App

- [ ] Under Tauri, Settings shows **App** and **Window mode** with Desktop/Menu
      bar.
- [ ] Desktop mode hides the “Show timer in menu bar” checkbox.
- [ ] The page fits without scrolling in both modes.
- [ ] Selecting **Menu bar** hides the window immediately and leaves the timer
      page selected for the next time the window opens.
- [ ] Selecting **Desktop** from Menu bar mode shows the timer, with no brief
      flash of the Settings page.

## Menu-bar mode

- [ ] Dock icon and native app menu disappear.
- [ ] Tray icon appears.
- [ ] Left-click toggles the window; hidden → shown, visible → hidden.
- [ ] Shown window is centered under the tray icon and `MENU_BAR_GAP` below the
      menu bar.
- [ ] On a multi-monitor setup, the window opens on the monitor whose menu bar
      was clicked.
- [ ] Right-click opens the tray menu: Show Pomodoro, Settings…, Use Desktop
      Window, Quit.
- [ ] **Show Pomodoro** always reopens the timer.
- [ ] Showing the timer from a hidden Settings page does not flash Settings
      first.
- [ ] **Settings…** reopens the window on the Settings page.
- [ ] “Show timer in menu bar” is visible in Settings and updates the tray title.
- [ ] Clicking away auto-hides the window.
- [ ] Re-opening after auto-hide restores position and focus.
- [ ] Quit from the tray exits the app.
- [ ] The Settings Quit button exits the app.
- [ ] `⌘Q` is not expected to work in menu-bar mode.

## Switch back to Desktop mode

- [ ] Tray → **Use Desktop Window** returns the Dock icon and native app menu.
- [ ] The window centers on the monitor where the tray was clicked.
- [ ] The window shows the timer, never Settings.
- [ ] Window returns to a fixed 280×454 content area with traffic lights present
      and the green zoom button disabled.
- [ ] Settings → App → Desktop also switches back, with the same results.
- [ ] After quitting from menu-bar mode, relaunching starts in Desktop mode.

## Web-only surfaces

- [ ] `npm run dev` in a browser shows the **playground** link; the Tauri app
      does not.
- [ ] `/playground` only resolves in the browser during dev.
- [ ] The browser does not show Window mode or Quit controls.
