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

describe("PomodoroSettingsProvider phase-end sounds", () => {
  function SoundProbe() {
    const { workEndSound, breakEndSound, setWorkEndSound, setBreakEndSound } = usePomodoroSettings();
    return (
      <div>
        <span data-testid="work-end-sound">{String(workEndSound)}</span>
        <span data-testid="break-end-sound">{String(breakEndSound)}</span>
        <button data-testid="set-work-end-none" onClick={() => setWorkEndSound(null)} />
        <button data-testid="set-break-end-boop" onClick={() => setBreakEndSound("boop")} />
      </div>
    );
  }

  function renderSoundProbe() {
    return render(
      <PomodoroSettingsProvider>
        <SoundProbe />
      </PomodoroSettingsProvider>,
    );
  }

  test("defaults both sounds when legacy settings lack the fields", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        workMinutes: 30,
        breakMinutes: 10,
        soundEnabled: false,
        notificationsEnabled: true,
      }),
    );

    renderSoundProbe();

    expect(screen.getByTestId("work-end-sound")).toHaveTextContent("fanfare");
    expect(screen.getByTestId("break-end-sound")).toHaveTextContent("guitar-loop");
  });

  test("preserves an explicit None (null) selection", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        workEndSound: null,
        breakEndSound: null,
      }),
    );

    renderSoundProbe();

    expect(screen.getByTestId("work-end-sound")).toHaveTextContent("null");
    expect(screen.getByTestId("break-end-sound")).toHaveTextContent("null");
  });

  test("falls back to defaults for unknown sound ids", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        workEndSound: "not-a-sound",
        breakEndSound: "also-not-a-sound",
      }),
    );

    renderSoundProbe();

    expect(screen.getByTestId("work-end-sound")).toHaveTextContent("fanfare");
    expect(screen.getByTestId("break-end-sound")).toHaveTextContent("guitar-loop");
  });

  test("persists changed selections", async () => {
    renderSoundProbe();

    fireEvent.click(screen.getByTestId("set-work-end-none"));
    fireEvent.click(screen.getByTestId("set-break-end-boop"));

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
      expect(stored.workEndSound).toBeNull();
      expect(stored.breakEndSound).toBe("boop");
    });
  });
});

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
