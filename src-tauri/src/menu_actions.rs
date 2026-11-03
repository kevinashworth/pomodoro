//! Menu, tray, and app-mode identifiers.
//!
//! Mirrors `src/constants/menu.ts` and `src/constants/app-mode.ts` on the
//! frontend — keep the event names and action ids in sync.

/// Event name emitted for menu actions and listened to by hooks in the frontend.
pub const APP_MENU_EVENT: &str = "app-menu";

/// Event name emitted when the app switches between desktop and menu-bar modes.
pub const APP_MODE_EVENT: &str = "app-mode-changed";

/// Event name asking the frontend to switch modes after it has navigated home.
pub const APP_MODE_REQUEST_EVENT: &str = "app-mode-requested";

/// Event name asking the frontend to navigate and then show the tray window.
pub const TRAY_SHOW_REQUEST_EVENT: &str = "tray-show-requested";

/// Tray icon id.
pub const TRAY_ID: &str = "main_tray";

/// App menu and tray menu item id for opening Settings.
pub const ITEM_SETTINGS: &str = "settings";

/// App menu item id for returning to the timer.
pub const ITEM_HOME: &str = "home";

/// Tray menu item id for showing the timer.
pub const ITEM_SHOW: &str = "show";

/// Tray menu item id for switching back to the desktop window.
pub const ITEM_USE_DESKTOP: &str = "use-desktop";

/// Tray menu item id for quitting the app.
pub const ITEM_QUIT: &str = "quit";
