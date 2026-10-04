import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { PomodoroTimer } from "@/components/pomodoro-timer";
import { SETTINGS_STORAGE_KEY, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { PomodoroSettingsProvider, usePomodoroSettings } from "@/context/pomodoro-settings";

import type { PomodoroSettings, PomodoroSettingsContextValue, TimerState } from "@/types/pomodoro";

export type RenderTimerOptions = {
  settings?: Partial<PomodoroSettings>;
  timerState?: Partial<TimerState>;
  route?: string;
};

export function seedTimerState(state: Partial<TimerState>): void {
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function seedRawTimerState(raw: string): void {
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, raw);
}

export function readTimerState(): TimerState | null {
  const raw = window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

export function clearTimerStorage(): void {
  window.localStorage.removeItem(TIMER_STATE_STORAGE_KEY);
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
}

export function renderTimer({ settings, timerState, route = "/" }: RenderTimerOptions = {}) {
  if (settings) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
  if (timerState) {
    seedTimerState(timerState);
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <PomodoroSettingsProvider>
        <PomodoroTimer />
      </PomodoroSettingsProvider>
    </MemoryRouter>,
  );
}

export type TimerSettingsControls = {
  setWorkMinutes: PomodoroSettingsContextValue["setWorkMinutes"];
  setBreakMinutes: PomodoroSettingsContextValue["setBreakMinutes"];
};

// Renders the timer alongside a probe that captures the settings setters, so a
// test can drive a mid-session settings change through the real context.
export function renderTimerWithSettingsControls({ settings, timerState, route = "/" }: RenderTimerOptions = {}) {
  if (settings) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
  if (timerState) {
    seedTimerState(timerState);
  }

  const controls: Partial<TimerSettingsControls> = {};

  function SettingsProbe() {
    const { setWorkMinutes, setBreakMinutes } = usePomodoroSettings();
    controls.setWorkMinutes = setWorkMinutes;
    controls.setBreakMinutes = setBreakMinutes;
    return null;
  }

  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <PomodoroSettingsProvider>
        <PomodoroTimer />
        <SettingsProbe />
      </PomodoroSettingsProvider>
    </MemoryRouter>,
  );

  return { ...utils, controls: controls as TimerSettingsControls };
}
