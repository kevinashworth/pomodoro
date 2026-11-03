import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { AppModeProvider } from "@/context/app-mode";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import { SoundsProvider } from "@/context/sounds";
import { PomodoroTimerProvider } from "@/context/pomodoro-timer";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppModeProvider>
        <PomodoroSettingsProvider>
          <SoundsProvider>
            <PomodoroTimerProvider>
              <App />
            </PomodoroTimerProvider>
          </SoundsProvider>
        </PomodoroSettingsProvider>
      </AppModeProvider>
    </BrowserRouter>
  </StrictMode>,
);
