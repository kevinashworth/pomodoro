import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import "@/index.css";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants/window";

if (isTauri()) {
  const win = getCurrentWindow();
  win.setMinSize(new LogicalSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT));
  win.setSize(new LogicalSize(WINDOW_WIDTH, WINDOW_HEIGHT));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <PomodoroSettingsProvider>
      <App />
    </PomodoroSettingsProvider>
  </BrowserRouter>,
);
