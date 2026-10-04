import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import App from "@/App";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";

vi.mock("@/hooks/use-menu-commands", () => ({
  useMenuCommands: () => {},
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PomodoroSettingsProvider>
        <App />
      </PomodoroSettingsProvider>
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
});
