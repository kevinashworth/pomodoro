import { randomFillSync } from "node:crypto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/constants/pomodoro";
import { getSound, PHASE_END_SOUNDS, TICK_SOUNDS } from "@/constants/sounds";
import { AppModeProvider } from "@/context/app-mode";
import { PomodoroSettingsProvider } from "@/context/pomodoro-settings";
import { SoundsProvider } from "@/context/sounds";
import SettingsPage from "@/pages/settings";
import { playedSoundSrcs, soundCalls } from "@/test/sound-mock";
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
      <AppModeProvider>
        <PomodoroSettingsProvider>
          <SoundsProvider>
            <SettingsPage />
          </SoundsProvider>
        </PomodoroSettingsProvider>
      </AppModeProvider>
    </MemoryRouter>,
  );
}

function mockTauriIpc(handler: (cmd: string, payload: unknown) => unknown = () => undefined) {
  mockIPC((cmd, payload) => {
    if (cmd === "get_app_mode") return "desktop";
    return handler(cmd, payload);
  });
  (window as TauriWindow).isTauri = true;
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

describe("SettingsPage app mode", () => {
  test("shows the desktop mode control under Tauri", async () => {
    mockTauriIpc();
    renderSettings();

    expect(await screen.findByTestId("app-mode-desktop")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("app-mode-menu-bar")).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByTestId("menu-bar-timer-toggle")).toBeNull();
  });

  test("switches to menu bar app mode and reveals the menu bar timer toggle", async () => {
    const calls: string[] = [];
    mockIPC((cmd, payload) => {
      if (cmd === "get_app_mode") return "desktop";
      if (cmd === "set_app_mode") calls.push((payload as { appMode: string }).appMode);
    });
    (window as TauriWindow).isTauri = true;

    renderSettings();
    fireEvent.click(await screen.findByTestId("app-mode-menu-bar"));

    await waitFor(() => expect(calls).toEqual(["menuBar"]));
    expect(await screen.findByTestId("menu-bar-timer-toggle")).toBeInTheDocument();
  });

  test("hides the app mode control in a plain browser", () => {
    renderSettings();

    expect(screen.queryByTestId("app-mode-desktop")).toBeNull();
    expect(screen.queryByTestId("app-mode-menu-bar")).toBeNull();
  });
});

describe("SettingsPage menu bar timer", () => {
  test("shows the toggle in menu bar mode and persists the choice", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_app_mode") return "menuBar";
    });
    (window as TauriWindow).isTauri = true;

    renderSettings();
    const toggle = (await screen.findByTestId("menu-bar-timer-toggle")) as HTMLInputElement;
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

describe("SettingsPage phase-end sounds", () => {
  function selectSound(testId: string, value: string) {
    fireEvent.change(screen.getByTestId(testId), { target: { value } });
  }

  function fadeSrcs(): string[] {
    return soundCalls()
      .filter((call) => call.action === "fade")
      .map((call) => call.src);
  }

  test("renders defaults and the full catalog", () => {
    renderSettings();

    const workSelect = screen.getByTestId("work-end-sound-select") as HTMLSelectElement;
    const breakSelect = screen.getByTestId("break-end-sound-select") as HTMLSelectElement;

    expect(workSelect.value).toBe("fanfare");
    expect(breakSelect.value).toBe("guitar-loop");
    expect(within(workSelect).getAllByRole("option")).toHaveLength(PHASE_END_SOUNDS.length + 1);
    expect(within(workSelect).getByRole("option", { name: "None" })).toBeInTheDocument();
    expect(within(workSelect).queryByRole("option", { name: "Pop" })).toBeNull();
  });

  test("renders the tick defaults and only tick sounds", () => {
    renderSettings();

    const tickSelect = screen.getByTestId("tick-sound-select") as HTMLSelectElement;

    expect(tickSelect.value).toBe("tick-tock");
    expect(within(tickSelect).getAllByRole("option")).toHaveLength(TICK_SOUNDS.length + 1);
    expect(within(tickSelect).getByRole("option", { name: "None" })).toBeInTheDocument();
    expect(within(tickSelect).queryByRole("option", { name: "Fanfare" })).toBeNull();
  });

  test("persists and previews a tick selection", async () => {
    renderSettings();

    selectSound("tick-sound-select", "pop");

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.tickSound).toBe("pop");
    });
    expect(playedSoundSrcs()).toContain(getSound("pop").src);
  });

  test("None on the tick picker persists null and fades the preview", async () => {
    renderSettings();

    selectSound("tick-sound-select", "pop");
    selectSound("tick-sound-select", "none");

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.tickSound).toBeNull();
    });
    expect(fadeSrcs()).toContain(getSound("pop").src);
  });

  test("persists a selection and previews it", async () => {
    renderSettings();

    selectSound("work-end-sound-select", "boop");

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.workEndSound).toBe("boop");
    });
    expect(playedSoundSrcs()).toContain(getSound("boop").src);
  });

  test("None persists null and fades the preview", async () => {
    renderSettings();

    selectSound("work-end-sound-select", "boop");
    selectSound("work-end-sound-select", "none");

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.workEndSound).toBeNull();
    });
    expect(fadeSrcs()).toContain(getSound("boop").src);
  });

  test("keeps pickers active and previews while Sound is off", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, soundEnabled: false }));

    renderSettings();

    const select = screen.getByTestId("work-end-sound-select") as HTMLSelectElement;
    expect(select).not.toBeDisabled();

    selectSound("work-end-sound-select", "meow");
    expect(playedSoundSrcs()).toContain(getSound("meow").src);
  });

  test("fades an active preview when leaving the page", () => {
    const { unmount } = renderSettings();

    selectSound("work-end-sound-select", "guitar-loop");
    unmount();

    expect(fadeSrcs()).toContain(getSound("guitar-loop").src);
  });
});
