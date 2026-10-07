#[cfg(desktop)]
mod menu_actions;
#[cfg(desktop)]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(desktop)]
use std::time::Duration;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
#[cfg(desktop)]
use tauri::Emitter;
#[cfg(target_os = "macos")]
use tauri::LogicalPosition;
#[cfg(desktop)]
use tauri::Manager;
#[cfg(desktop)]
use tauri::{PhysicalPosition, PhysicalSize, Rect};

#[cfg(desktop)]
const FADE_OUT_MS: u64 = 220;

/// True while a hide is in flight, so a tray click mid-fade can't race it.
#[cfg(desktop)]
static HIDING: AtomicBool = AtomicBool::new(false);

/// Vertical gap, in logical pixels, between the menu bar and the window.
#[cfg(desktop)]
const MENU_BAR_GAP: f64 = 16.0;

/// macOS menu bar height in logical points.
#[cfg(target_os = "macos")]
const MENU_BAR_HEIGHT: f64 = 24.0;

#[cfg(desktop)]
fn toggle_window(app: &tauri::AppHandle, tray_rect: Rect) {
    if let Some(window) = app.get_webview_window("main") {
        if HIDING.load(Ordering::SeqCst) {
            return;
        }
        if window.is_visible().unwrap_or(false) {
            hide_with_fade(&window);
        } else {
            // Recover from macOS app-level hide
            #[cfg(target_os = "macos")]
            {
                let _ = app.show();
            }

            let _ = window.unminimize();

            // Open on the monitor the user clicked. On macOS we position from the
            // cursor in global logical coordinates; elsewhere the tray rect is
            // reliable. The tray rect is kept as a fallback.
            #[cfg(target_os = "macos")]
            {
                if !position_below_menu_bar(app, &window) {
                    position_under_tray(&window, tray_rect);
                }
            }
            #[cfg(not(target_os = "macos"))]
            position_under_tray(&window, tray_rect);

            let _ = window.show();
            let _ = window.emit("window:shown", ()); // custom event
            let _ = window.set_always_on_top(true);
            let _ = window.set_focus();
        }
    }
}

#[cfg(desktop)]
fn hide_with_fade(window: &tauri::WebviewWindow) {
    if HIDING.swap(true, Ordering::SeqCst) {
        return;
    }
    if !window.is_visible().unwrap_or(false) {
        HIDING.store(false, Ordering::SeqCst);
        return;
    }

    // Tell the webview to fade; Rust owns the timing so a stalled frontend can
    // never leave the window stuck on screen.
    let _ = window.emit("window:hide-requested", ()); // custom event

    let window = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(FADE_OUT_MS + 40)); // Rust hides ~40ms after the event to cover delivery latency
        let _ = window.hide();
        #[cfg(target_os = "macos")]
        {
            let _ = window.app_handle().hide();
        }
        HIDING.store(false, Ordering::SeqCst);
    });
}

/// Positions `window` just below the menu bar of whichever monitor the cursor is
/// on, centered under it.
///
/// Global *logical* coordinates are consistent across monitors even with mixed
/// scale factors, and passing a `LogicalPosition` also sidesteps tao's
/// `set_outer_position`, which otherwise rescales physical coordinates by the
/// window's current monitor scale (the cause of the "always opens on the main
/// monitor" bug). Returns `false` when the cursor/monitor could not be read.
#[cfg(target_os = "macos")]
fn position_below_menu_bar(app: &tauri::AppHandle, window: &tauri::WebviewWindow) -> bool {
    let Ok(cursor) = app.cursor_position() else {
        return false;
    };
    let Some(primary_scale) = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())
    else {
        return false;
    };

    // tao reports the cursor as logical points multiplied by the primary
    // monitor's scale, so divide it back out to recover global logical points.
    let cursor_x = cursor.x / primary_scale;
    let cursor_y = cursor.y / primary_scale;

    // Match on x first (uniquely identifies side-by-side monitors); the cursor y
    // is only used to disambiguate vertically stacked displays.
    let Some(monitors) = app.available_monitors().ok() else {
        return false;
    };
    let mut x_match: Option<f64> = None;
    let mut exact: Option<f64> = None;
    for monitor in monitors {
        let scale = monitor.scale_factor();
        let origin = monitor.position();
        let size = monitor.size();
        let x0 = f64::from(origin.x) / scale;
        let y0 = f64::from(origin.y) / scale;
        let x1 = x0 + f64::from(size.width) / scale;
        let y1 = y0 + f64::from(size.height) / scale;
        if cursor_x >= x0 && cursor_x <= x1 {
            x_match.get_or_insert(y0);
            if cursor_y >= y0 && cursor_y <= y1 {
                exact = Some(y0);
                break;
            }
        }
    }

    let Some(monitor_top) = exact.or(x_match) else {
        return false;
    };

    let window_scale = window.scale_factor().unwrap_or(1.0);
    let window_width = f64::from(window.outer_size().unwrap_or_default().width) / window_scale;

    let x = cursor_x - window_width / 2.0;
    let y = monitor_top + MENU_BAR_HEIGHT + MENU_BAR_GAP;

    window.set_position(LogicalPosition::new(x, y)).is_ok()
}

#[cfg(desktop)]
fn position_under_tray(window: &tauri::WebviewWindow, tray_rect: Rect) {
    let tray_position: PhysicalPosition<f64> = tray_rect.position.to_physical(1.0);
    let tray_size: PhysicalSize<f64> = tray_rect.size.to_physical(1.0);
    let window_size = window.outer_size().unwrap_or_default();
    let x = tray_position.x + (tray_size.width - f64::from(window_size.width)) / 2.0;
    let y = tray_position.y + tray_size.height + MENU_BAR_GAP;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut app = tauri::Builder::default();
    #[cfg(desktop)]
    {
        app = app.plugin(tauri_plugin_positioner::init());
    }
    app = app.setup(|app_handle| {
        #[cfg(debug_assertions)]
        {
            app_handle.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
        }

        // Run as a menu-bar accessory: no dock icon.
        #[cfg(target_os = "macos")]
        app_handle.set_activation_policy(ActivationPolicy::Accessory);

        #[cfg(desktop)]
        {
            let quit_item = tauri::menu::MenuItemBuilder::with_id(menu_actions::ITEM_QUIT, "Quit")
                .accelerator("CmdOrCtrl+Q")
                .build(app_handle)?;
            let tray_menu = tauri::menu::MenuBuilder::new(app_handle)
                .item(&quit_item)
                .build()?;

            // Build the tray icon. Keeping it alive for the app's lifetime.
            let _tray = tauri::tray::TrayIconBuilder::with_id("main_tray")
                .icon(tauri::include_image!("icons/favicon.png"))
                .icon_as_template(true) // macOS: dark mode support
                .tooltip("Pomodoro Timer")
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == menu_actions::ITEM_QUIT {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Required for tray-relative positioning.
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle(), rect);
                    }
                })
                .show_menu_on_left_click(false)
                .build(app_handle)?;
        }

        Ok(())
    });

    app = app.invoke_handler(tauri::generate_handler![quit]);

    #[cfg(desktop)]
    let app = app.on_window_event(|window, event| match event {
        // don't close with the X button, just hide
        tauri::WindowEvent::CloseRequested { api, .. } => {
            if window.label() == "main" {
                api.prevent_close();
                if let Some(w) = window.app_handle().get_webview_window("main") {
                    hide_with_fade(&w);
                }
            }
        }
        // auto-hide when focus is lost
        tauri::WindowEvent::Focused(focused) => {
            if !focused && window.label() == "main" {
                if let Some(w) = window.app_handle().get_webview_window("main") {
                    hide_with_fade(&w);
                }
            }
        }
        _ => {}
    });

    app.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
