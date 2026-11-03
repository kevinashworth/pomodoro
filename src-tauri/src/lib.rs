mod menu;
mod menu_actions;

use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
use std::time::Duration;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::window::Color;
use tauri::{ActivationPolicy, Emitter, LogicalPosition, LogicalSize, Manager};
use tauri::{PhysicalPosition, PhysicalSize, Rect};

const FADE_OUT_MS: u64 = 220;

/// True while a hide is in flight, so a tray click mid-fade can't race it.
static HIDING: AtomicBool = AtomicBool::new(false);

/// Incremented whenever a fade-out starts or is cancelled. A pending fade only
/// hides the window if its generation is still current.
static HIDE_GENERATION: AtomicU64 = AtomicU64::new(0);

fn cancel_pending_hide() {
    HIDE_GENERATION.fetch_add(1, Ordering::SeqCst);
    HIDING.store(false, Ordering::SeqCst);
}

/// Vertical gap, in logical pixels, between the menu bar and the window.
const MENU_BAR_GAP: f64 = 16.0;

/// macOS menu bar height in logical points.
const MENU_BAR_HEIGHT: f64 = 24.0;

/// Window dimensions. The webview content is 454px in both modes; Desktop mode
/// adds the native title-bar strip outside it. Keep in sync with
/// `src/constants/window.ts` and `tauri.conf.json`.
const WINDOW_WIDTH: f64 = 280.0;
const WINDOW_HEIGHT: f64 = 454.0;
const DESKTOP_WINDOW_OUTER_HEIGHT: f64 = 482.0;

/// Matches Tailwind zinc-900 (#18181b), used for the native title-bar strip.
const APP_BACKGROUND: Color = Color(24, 24, 27, 255);
const TRANSPARENT_BACKGROUND: Color = Color(0, 0, 0, 0);

#[derive(Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
enum AppMode {
    Desktop = 0,
    MenuBar = 1,
}

impl AppMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::Desktop => "desktop",
            Self::MenuBar => "menuBar",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "desktop" => Some(Self::Desktop),
            "menuBar" => Some(Self::MenuBar),
            _ => None,
        }
    }
}

static APP_MODE: AtomicU8 = AtomicU8::new(AppMode::Desktop as u8);

fn current_mode() -> AppMode {
    match APP_MODE.load(Ordering::SeqCst) {
        1 => AppMode::MenuBar,
        _ => AppMode::Desktop,
    }
}

fn set_mode(mode: AppMode) {
    APP_MODE.store(mode as u8, Ordering::SeqCst);
}

fn toggle_window(app: &tauri::AppHandle, tray_rect: Rect) {
    if let Some(window) = app.get_webview_window("main") {
        if HIDING.load(Ordering::SeqCst) {
            return;
        }
        if window.is_visible().unwrap_or(false) {
            hide_with_fade(&window);
        } else {
            // Recover from macOS app-level hide
            let _ = app.show();
            let _ = window.unminimize();

            // Open on the monitor the user clicked. Position from the cursor in
            // global logical coordinates; the tray rect is kept as a fallback.
            if !position_below_menu_bar(app, &window) {
                position_under_tray(&window, tray_rect);
            }

            let _ = window.show();
            let _ = window.emit("window:shown", ()); // custom event
            let _ = window.set_always_on_top(true);
            let _ = window.set_focus();
        }
    }
}

/// Shows the tray window without toggling it. Used after the frontend has
/// navigated to the requested page and asked for the window to be revealed.
fn show_tray_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        cancel_pending_hide();
        let _ = app.show();
        let _ = window.unminimize();

        if !window.is_visible().unwrap_or(false) {
            let _ = position_below_menu_bar(app, &window);
            let _ = window.show();
            let _ = window.set_always_on_top(true);
        }

        // Always notify the webview: cancelling an in-flight fade must restore
        // opacity even when the native window never left the screen.
        let _ = window.emit("window:shown", ());
        let _ = window.set_focus();
    }
}

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
    let generation = HIDE_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;

    let window = window.clone();
    std::thread::spawn(move || {
        // Rust hides ~40ms after the event to cover delivery latency.
        std::thread::sleep(Duration::from_millis(FADE_OUT_MS + 40));

        // A mode switch or explicit show may have happened while the fade was
        // running. In that case the window must stay visible, and a newer fade
        // (if any) owns the HIDING flag.
        if HIDE_GENERATION.load(Ordering::SeqCst) == generation
            && current_mode() == AppMode::MenuBar
        {
            let _ = window.hide();
            let _ = window.app_handle().hide();
            HIDING.store(false, Ordering::SeqCst);
        }
    });
}

/// Returns the logical bounds `(x, y, width, height)` of the monitor under the
/// cursor.
fn cursor_monitor_bounds(app: &tauri::AppHandle) -> Option<(f64, f64, f64, f64)> {
    let cursor = app.cursor_position().ok()?;
    let primary_scale = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())?;

    // tao reports the cursor as logical points multiplied by the primary
    // monitor's scale, so divide it back out to recover global logical points.
    let cursor_x = cursor.x / primary_scale;
    let cursor_y = cursor.y / primary_scale;

    let monitors = app.available_monitors().ok()?;
    let mut x_match: Option<(f64, f64, f64, f64)> = None;
    let mut exact: Option<(f64, f64, f64, f64)> = None;

    for monitor in monitors {
        let scale = monitor.scale_factor();
        let origin = monitor.position();
        let size = monitor.size();
        let x0 = f64::from(origin.x) / scale;
        let y0 = f64::from(origin.y) / scale;
        let width = f64::from(size.width) / scale;
        let height = f64::from(size.height) / scale;

        if cursor_x >= x0 && cursor_x <= x0 + width {
            x_match.get_or_insert((x0, y0, width, height));
            if cursor_y >= y0 && cursor_y <= y0 + height {
                exact = Some((x0, y0, width, height));
                break;
            }
        }
    }

    exact.or(x_match)
}

/// Positions `window` just below the menu bar of whichever monitor the cursor is
/// on, centered under it.
///
/// Global *logical* coordinates are consistent across monitors even with mixed
/// scale factors, and passing a `LogicalPosition` also sidesteps tao's
/// `set_outer_position`, which otherwise rescales physical coordinates by the
/// window's current monitor scale (the cause of the "always opens on the main
/// monitor" bug). Returns `false` when the cursor/monitor could not be read.
fn position_below_menu_bar(app: &tauri::AppHandle, window: &tauri::WebviewWindow) -> bool {
    let Some((x0, y0, width, _height)) = cursor_monitor_bounds(app) else {
        return false;
    };

    let cursor = match app.cursor_position() {
        Ok(cursor) => cursor,
        Err(_) => return false,
    };
    let Some(primary_scale) = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())
    else {
        return false;
    };
    let cursor_x = cursor.x / primary_scale;

    let window_scale = window.scale_factor().unwrap_or(1.0);
    let window_width = f64::from(window.outer_size().unwrap_or_default().width) / window_scale;

    let x = cursor_x - window_width / 2.0;
    let y = y0 + MENU_BAR_HEIGHT + MENU_BAR_GAP;

    // Clamp horizontally to the monitor so the popup stays fully on-screen.
    let x = x.max(x0).min(x0 + width - window_width);
    window.set_position(LogicalPosition::new(x, y)).is_ok()
}

fn center_on_cursor_monitor(app: &tauri::AppHandle, window: &tauri::WebviewWindow) -> bool {
    let Some((x0, y0, width, height)) = cursor_monitor_bounds(app) else {
        return false;
    };

    let x = x0 + (width - WINDOW_WIDTH) / 2.0;
    let y = y0 + (height - DESKTOP_WINDOW_OUTER_HEIGHT) / 2.0;
    window.set_position(LogicalPosition::new(x, y)).is_ok()
}

fn position_under_tray(window: &tauri::WebviewWindow, tray_rect: Rect) {
    let tray_position: PhysicalPosition<f64> = tray_rect.position.to_physical(1.0);
    let tray_size: PhysicalSize<f64> = tray_rect.size.to_physical(1.0);
    let window_size = window.outer_size().unwrap_or_default();
    let x = tray_position.x + (tray_size.width - f64::from(window_size.width)) / 2.0;
    let y = tray_position.y + tray_size.height + MENU_BAR_GAP;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

fn apply_mode(app: &tauri::AppHandle, next: AppMode) -> tauri::Result<()> {
    if current_mode() == next {
        return Ok(());
    }

    let previous = current_mode();
    // Update the mode before touching the window so focus-loss events caused by
    // the transition see the destination mode, not the old one.
    set_mode(next);

    let result = match next {
        AppMode::Desktop => apply_desktop_mode(app),
        AppMode::MenuBar => apply_menu_bar_mode(app),
    };

    if let Err(error) = result {
        set_mode(previous);
        return Err(error);
    }

    let _ = app.emit(menu_actions::APP_MODE_EVENT, next.as_str());
    Ok(())
}

fn apply_desktop_mode(app: &tauri::AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    cancel_pending_hide();
    let _ = app.show();
    let _ = window.unminimize();
    let _ = app.set_activation_policy(ActivationPolicy::Regular);

    // Remove the tray while in Desktop mode. It is recreated after switching
    // back to the accessory policy, matching the startup order that macOS
    // reliably supports for status items.
    if let Some(tray) = app.remove_tray_by_id(menu_actions::TRAY_ID) {
        drop(tray);
    }

    let menu = menu::build(app)?;
    let _ = app.set_menu(menu);

    let _ = window.set_decorations(true);
    let _ = window.set_always_on_top(false);
    let _ = window.set_background_color(Some(APP_BACKGROUND));
    let _ = window.set_size(LogicalSize::new(WINDOW_WIDTH, WINDOW_HEIGHT));
    let _ = center_on_cursor_monitor(app, &window);

    let _ = window.show();
    let _ = window.emit("window:shown", ());
    let _ = window.set_focus();

    Ok(())
}

fn apply_menu_bar_mode(app: &tauri::AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    // Hide first so the window never visibly jumps between the desktop and
    // menu-bar sizes/decorations.
    let _ = window.emit("window:hide-requested", ());
    let _ = window.hide();

    let _ = app.remove_menu();
    let _ = app.set_activation_policy(ActivationPolicy::Accessory);

    let _ = window.set_decorations(false);
    let _ = window.set_always_on_top(true);
    let _ = window.set_background_color(Some(TRANSPARENT_BACKGROUND));
    let _ = window.set_size(LogicalSize::new(WINDOW_WIDTH, WINDOW_HEIGHT));

    // Build the status item after switching to the accessory policy. This is
    // the order the original menu-bar app used and avoids a macOS dev-mode
    // issue where a status item created while the app was still regular never
    // becomes visible after the policy change.
    if app.tray_by_id(menu_actions::TRAY_ID).is_none() {
        build_tray(app)?;
    }

    let _ = app.hide();

    Ok(())
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn set_tray_title(app: tauri::AppHandle, title: String) {
    if let Some(tray) = app.tray_by_id(menu_actions::TRAY_ID) {
        let _ = tray.set_title(Some(title));
    }
}

#[tauri::command]
fn get_app_mode() -> String {
    current_mode().as_str().to_string()
}

#[tauri::command]
fn set_app_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    let next = AppMode::parse(&mode).ok_or_else(|| format!("unknown app mode: {mode}"))?;
    apply_mode(&app, next).map_err(|error| error.to_string())
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    show_tray_window(&app);
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show_item =
        MenuItemBuilder::with_id(menu_actions::ITEM_SHOW, "Show Pomodoro").build(app)?;
    let settings_item =
        MenuItemBuilder::with_id(menu_actions::ITEM_SETTINGS, "Settings…").build(app)?;
    let use_desktop_item =
        MenuItemBuilder::with_id(menu_actions::ITEM_USE_DESKTOP, "Use Desktop Window")
            .build(app)?;
    let quit_item = MenuItemBuilder::with_id(menu_actions::ITEM_QUIT, "Quit").build(app)?;

    let tray_menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&settings_item)
        .separator()
        .item(&use_desktop_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let tray = TrayIconBuilder::with_id(menu_actions::TRAY_ID)
        .title("🍅")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            menu_actions::ITEM_SHOW => {
                let _ = app.emit(
                    menu_actions::TRAY_SHOW_REQUEST_EVENT,
                    menu_actions::ITEM_HOME,
                );
            }
            menu_actions::ITEM_SETTINGS => {
                let _ = app.emit(
                    menu_actions::TRAY_SHOW_REQUEST_EVENT,
                    menu_actions::ITEM_SETTINGS,
                );
            }
            menu_actions::ITEM_USE_DESKTOP => {
                let _ = app.emit(
                    menu_actions::APP_MODE_REQUEST_EVENT,
                    AppMode::Desktop.as_str(),
                );
            }
            menu_actions::ITEM_QUIT => app.exit(0),
            _ => {}
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
        .build(app)?;

    // The tray only exists while the app is in Menu bar mode.
    drop(tray);
    Ok(())
}

pub fn run() {
    let mut app = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init());

    app = app.setup(|app_handle| {
        #[cfg(debug_assertions)]
        {
            app_handle.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
        }

        set_mode(AppMode::Desktop);
        let handle = app_handle.handle();
        let _ = handle.set_activation_policy(ActivationPolicy::Regular);
        if let Some(window) = handle.get_webview_window("main") {
            let _ = window.set_background_color(Some(APP_BACKGROUND));
        }
        let menu = menu::build(handle)?;
        handle.set_menu(menu)?;

        Ok(())
    });

    app = app.invoke_handler(tauri::generate_handler![
        quit,
        set_tray_title,
        get_app_mode,
        set_app_mode,
        show_main_window
    ]);

    app = app.on_menu_event(|app, event| match event.id().as_ref() {
        menu_actions::ITEM_SETTINGS | menu_actions::ITEM_HOME => {
            let _ = app.emit(menu_actions::APP_MENU_EVENT, event.id().as_ref());
        }
        _ => {}
    });

    let app = app.on_window_event(|window, event| match event {
        // Desktop mode closes/quits. Menu-bar mode hides instead.
        tauri::WindowEvent::CloseRequested { api, .. } => {
            if window.label() == "main" {
                if current_mode() == AppMode::MenuBar {
                    api.prevent_close();
                    if let Some(w) = window.app_handle().get_webview_window("main") {
                        hide_with_fade(&w);
                    }
                } else {
                    window.app_handle().exit(0);
                }
            }
        }
        // Auto-hide only as a menu-bar popup.
        tauri::WindowEvent::Focused(focused) => {
            if !focused && window.label() == "main" && current_mode() == AppMode::MenuBar {
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
