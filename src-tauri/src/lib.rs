#[cfg(desktop)]
mod menu_actions;
#[cfg(desktop)]
mod menu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut app = tauri::Builder::default();
  app = app.setup(|app_handle| {
    #[cfg(debug_assertions)]
    {
      app_handle.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;
    }

    #[cfg(desktop)]
    menu::Menu::init(app_handle)?;

    Ok(())
  });

  #[cfg(desktop)]
  let app = app.on_menu_event(menu::Menu::on_menu_event);

  app
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
