import { randomFillSync } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import SettingsPage from "@/pages/settings";

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
