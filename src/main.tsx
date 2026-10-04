import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import "@/index.css";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants/window";

if (isTauri()) {
  const win = getCurrentWindow();
  win.setSize(new LogicalSize(WINDOW_WIDTH, WINDOW_HEIGHT));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <PomodoroSettingsProvider>
      <App />
    </PomodoroSettingsProvider>
  </BrowserRouter>,
);
