import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, test, vi } from "vitest";

import App from "@/App";
import { AppModeProvider } from "@/context/app-mode";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import { SoundsProvider } from "@/context/sounds";
import { PomodoroTimerProvider } from "@/context/pomodoro-timer";

type TauriWindow = Window & { isTauri?: boolean };

vi.mock("@/hooks/use-menu-commands", () => ({
  useMenuCommands: () => {},
}));

vi.mock("@/hooks/use-window-fade", () => ({
  useWindowFade: () => {},
}));

afterEach(() => {
  clearMocks();
  delete (window as TauriWindow).isTauri;
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppModeProvider>
        <PomodoroSettingsProvider>
          <SoundsProvider>
            <PomodoroTimerProvider>
              <App />
            </PomodoroTimerProvider>
          </SoundsProvider>
        </PomodoroSettingsProvider>
      </AppModeProvider>
    </MemoryRouter>,
  );
}

describe("App routing", () => {
  test("renders the playground on /playground in the browser", async () => {
    renderAt("/playground");

    expect(await screen.findByRole("heading", { name: /playground/i })).toBeInTheDocument();
  });

  test("redirects unknown routes to the timer", () => {
    renderAt("/nope");

    expect(screen.getByTestId("mode-label")).toHaveTextContent(/work/i);
  });

  test("returns to the timer when the app mode changes", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_app_mode") return "desktop";
    });
    (window as TauriWindow).isTauri = true;

    renderAt("/settings");

    const menuBarButton = await screen.findByTestId("window-mode-menu-bar");
    fireEvent.click(menuBarButton);

    expect(await screen.findByTestId("mode-label")).toHaveTextContent(/work/i);
  });
});
