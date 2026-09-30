//! Menu event and item identifiers.
//!
//! Mirrors `src/constants/menu.ts` on the frontend — keep both in sync.
//! The action ids double as the `app-menu` event payload so the TS side can
//! route them without extra mapping.

/// Event name emitted for menu actions and listened to by hooks in frontend.
pub const APP_MENU_EVENT: &str = "app-menu";

/// Desktop menu item ids.
pub const ITEM_SETTINGS: &str = "settings";
pub const ITEM_HOME: &str = "home";
pub const ITEM_QUIT: &str = "quit";
