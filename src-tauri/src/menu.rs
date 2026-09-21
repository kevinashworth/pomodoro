use crate::menu_actions::{APP_MENU_EVENT, ITEM_HOME, ITEM_QUIT, ITEM_SETTINGS};
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, AppHandle, Emitter};

pub struct Menu;

impl Menu {
    pub fn init(app: &App) -> tauri::Result<()> {
        let settings = MenuItemBuilder::with_id(ITEM_SETTINGS, "Settings…")
            .accelerator("CmdOrCtrl+,")
            .build(app)?;
        let quit = MenuItemBuilder::with_id(ITEM_QUIT, "Quit")
            .accelerator("CmdOrCtrl+Q")
            .build(app)?;

        let app_menu = SubmenuBuilder::new(app, "Pomodoro")
            .item(&settings)
            .separator()
            .item(&quit)
            .build()?;

        let go_to_timer = MenuItemBuilder::with_id(ITEM_HOME, "Go to Timer")
            .accelerator("CmdOrCtrl+1")
            .build(app)?;

        // reminder: macOS appends "Enter Full Screen" to View automatically
        let view_menu = SubmenuBuilder::new(app, "View")
            .item(&go_to_timer)
            .build()?;

        let menu = MenuBuilder::new(app)
            .items(&[&app_menu, &view_menu])
            .build()?;
        app.set_menu(menu)?;

        Ok(())
    }

    pub fn on_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
        match event.id().as_ref() {
            id @ (ITEM_SETTINGS | ITEM_HOME) => {
                let _ = app.emit(APP_MENU_EVENT, id);
            }
            ITEM_QUIT => {
                app.exit(0);
            }
            _ => {}
        }
    }
}
