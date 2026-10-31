import { randomFillSync } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { SETTINGS_STORAGE_KEY } from "@/constants/pomodoro";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import SettingsPage from "@/pages/settings";
import { version } from "@/version.mjs";

type TauriWindow = Window & { isTauri?: boolean };

beforeAll(() => {
  Object.defineProperty(window, "crypto", {
    value: { getRandomValues: (buffer: Parameters<typeof randomFillSync>[0]) => randomFillSync(buffer) },
  });
});

afterEach(() => {
  clearMocks();
  delete (window as TauriWindow).isTauri;
});

function renderSettings() {
  return render(
    <MemoryRouter>
      <PomodoroSettingsProvider>
        <SettingsPage />
      </PomodoroSettingsProvider>
    </MemoryRouter>,
  );
}

describe("SettingsPage quit", () => {
  test("invokes the quit command when running under Tauri", async () => {
    const calls: string[] = [];
    mockIPC((cmd) => {
      calls.push(cmd);
    });
    (window as TauriWindow).isTauri = true;

    renderSettings();
    fireEvent.click(screen.getByTestId("quit-button"));

    await waitFor(() => expect(calls).toContain("quit"));
  });

  test("hides the quit button in a plain browser", () => {
    renderSettings();

    expect(screen.queryByTestId("quit-button")).toBeNull();
  });
});

describe("SettingsPage menu bar timer", () => {
  test("shows the toggle under Tauri and persists the choice", async () => {
    mockIPC(() => {});
    (window as TauriWindow).isTauri = true;

    renderSettings();
    const toggle = screen.getByTestId("menu-bar-timer-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.showTimerInMenuBar).toBe(true);
    });
  });

  test("hides the toggle in a plain browser", () => {
    renderSettings();

    expect(screen.queryByTestId("menu-bar-timer-toggle")).toBeNull();
  });
});

describe("SettingsPage version", () => {
  test("shows the app version from the generated module", () => {
    renderSettings();

    expect(screen.getByTestId("pomodoro-version")).toHaveTextContent(`version ${version}`);
  });
});
