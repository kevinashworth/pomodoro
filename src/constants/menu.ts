export const APP_MENU_EVENT = "app-menu";

export const MENU_COMMAND = {
  settings: "settings",
  home: "home",
  toggleMini: "toggle-mini",
} as const;

export type AppMenuCommand = (typeof MENU_COMMAND)[keyof typeof MENU_COMMAND];
