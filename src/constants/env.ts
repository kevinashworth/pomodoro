import { isTauri } from "@tauri-apps/api/core";

/** True when running as a plain web app, i.e. not in a Tauri desktop/mobile shell. */
export const IS_WEB = !isTauri();

/** Playground is a dev-only web tool, never available in Tauri desktop or mobile. */
export const IS_PLAYGROUND_ENABLED = import.meta.env.DEV && IS_WEB;
