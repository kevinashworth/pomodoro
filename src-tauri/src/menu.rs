//! Native macOS application menu.
//!
//! The menu is installed only while the app is in Desktop mode. Menu-bar mode
//! deliberately has no native app menu; its actions live in the tray menu.

use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::AppHandle;

use crate::menu_actions::{ITEM_HOME, ITEM_SETTINGS};

pub fn build(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let settings = MenuItemBuilder::with_id(ITEM_SETTINGS, "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let go_to_timer = MenuItemBuilder::with_id(ITEM_HOME, "Go to Timer")
        .accelerator("CmdOrCtrl+1")
        .build(app)?;

    let app_menu = SubmenuBuilder::new(app, "Pomodoro")
        .item(&PredefinedMenuItem::about(app, None, None)?)
        .separator()
        .item(&settings)
        .item(&go_to_timer)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    // macOS routes the standard text-editing shortcuts through these
    // predefined items, so they must exist for Cut/Copy/Paste to work in the
    // WKWebView.
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .item(&PredefinedMenuItem::bring_all_to_front(app, None)?)
        .build()?;

    // No View menu: macOS would auto-inject "Enter Full Screen" into it, and
    // this app is deliberately fixed-size. No Help menu until it has content.
    MenuBuilder::new(app)
        .items(&[&app_menu, &edit_menu, &window_menu])
        .build()
}
