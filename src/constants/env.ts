import { isTauri } from "@tauri-apps/api/core";

/** True when running as a plain web app, i.e. not in a Tauri desktop/mobile shell. */
export const IS_WEB = !isTauri();
