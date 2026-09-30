import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_WIDTH } from "../src/constants/window.ts";

const currentDir = dirname(fileURLToPath(import.meta.url));
const configPath = join(currentDir, "..", "src-tauri", "tauri.conf.json");

const config = JSON.parse(readFileSync(configPath, "utf8")) as {
  app: { windows: Array<{ width: number; height: number }> };
};

const window = config.app.windows[0];
window.width = WINDOW_WIDTH;
window.height = WINDOW_HEIGHT;
(window as { minWidth?: number }).minWidth = MIN_WINDOW_WIDTH;
(window as { minHeight?: number }).minHeight = MIN_WINDOW_HEIGHT;
(window as { resizable?: boolean }).resizable = true;

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
