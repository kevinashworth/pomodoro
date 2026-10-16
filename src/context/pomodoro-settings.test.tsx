import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { SETTINGS_STORAGE_KEY } from "@/constants/pomodoro";
import { PomodoroSettingsProvider, usePomodoroSettings } from "@/context/pomodoro-settings";

function Probe() {
  const { showTimerInMenuBar, setShowTimerInMenuBar } = usePomodoroSettings();
  return (
    <button data-testid="probe" onClick={() => setShowTimerInMenuBar(!showTimerInMenuBar)}>
      {String(showTimerInMenuBar)}
    </button>
  );
}

function renderProvider() {
  return render(
    <PomodoroSettingsProvider>
      <Probe />
    </PomodoroSettingsProvider>,
  );
}

describe("PomodoroSettingsProvider showTimerInMenuBar", () => {
  test("defaults to false when legacy settings lack the field", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        workMinutes: 30,
        breakMinutes: 10,
        soundEnabled: false,
        notificationsEnabled: true,
      }),
    );

    renderProvider();

    expect(screen.getByTestId("probe")).toHaveTextContent("false");
  });

  test("persists the toggled value to storage", async () => {
    renderProvider();

    fireEvent.click(screen.getByTestId("probe"));
    expect(screen.getByTestId("probe")).toHaveTextContent("true");

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.showTimerInMenuBar).toBe(true);
    });
  });
});
