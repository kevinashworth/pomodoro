/** Matches the Rust `AppMode` values. Keep in sync with `src-tauri/src/lib.rs`. */
export const APP_MODE = {
  desktop: "desktop",
  menuBar: "menuBar",
} as const;

export type AppMode = (typeof APP_MODE)[keyof typeof APP_MODE];

/** Custom Tauri event emitted after the native shell changes mode. */
export const APP_MODE_CHANGED_EVENT = "app-mode-changed";

/** Custom Tauri event asking the frontend to switch modes after navigating home. */
export const APP_MODE_REQUEST_EVENT = "app-mode-requested";

export function isAppMode(value: unknown): value is AppMode {
  return value === APP_MODE.desktop || value === APP_MODE.menuBar;
}
