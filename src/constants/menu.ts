export const APP_MENU_EVENT = "app-menu";

export const MENU_COMMAND = {
  settings: "settings",
  home: "home",
} as const;

export type AppMenuCommand = (typeof MENU_COMMAND)[keyof typeof MENU_COMMAND];

/** Custom Tauri event asking the frontend to navigate, then show the tray window. */
export const TRAY_SHOW_REQUEST_EVENT = "tray-show-requested";

export function isAppMenuCommand(value: unknown): value is AppMenuCommand {
  return value === MENU_COMMAND.home || value === MENU_COMMAND.settings;
}
