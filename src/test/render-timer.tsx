import { render } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { PomodoroTimer } from "@/components/pomodoro-timer";
import {
  DEFAULT_DAILY_RESET_HOUR,
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_STATE,
  SETTINGS_STORAGE_KEY,
  TIMER_STATE_STORAGE_KEY,
} from "@/constants/pomodoro";
import { PomodoroSettingsProvider, usePomodoroSettings } from "@/context/pomodoro-settings";
import { getDayId } from "@/utils/time";

import type { PomodoroSettings, PomodoroSettingsContextValue, TimerState } from "@/types/pomodoro";

export type RenderTimerOptions = {
  settings?: Partial<PomodoroSettings>;
  timerState?: Partial<TimerState>;
  route?: string;
  strict?: boolean;
};

export type RenderTimerSeedOptions = {
  // When false, skip seeding the timer-state snapshot so tests can exercise empty
  // or pre-seeded (e.g. corrupt) storage. Provided settings are still seeded so a
  // fresh start can run with a configured duration. Default: true.
  seed?: boolean;
};

export function seedTimerStateStorage(state: Partial<TimerState>): void {
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function seedRawTimerStateStorage(raw: string): void {
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, raw);
}

export function readTimerStateStorage(): TimerState | null {
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

// Fills the boilerplate fields of a persisted snapshot so tests only specify the
// values they care about. `remainingSeconds` defaults to the phase max for the
// resolved settings, mirroring a fresh start.
function resolveTimerState(
  timerState: Partial<TimerState> = {},
  settings?: Partial<PomodoroSettings>,
): Partial<TimerState> {
  const resolved = { ...DEFAULT_SETTINGS, ...settings };
  const mode = timerState.mode ?? DEFAULT_TIMER_STATE.mode;
  return {
    mode,
    status: DEFAULT_TIMER_STATE.status,
    remainingSeconds: (mode === "work" ? resolved.workMinutes : resolved.breakMinutes) * 60,
    sessionsCompletedToday: DEFAULT_TIMER_STATE.sessionsCompletedToday,
    sessionsCompletedDayId: getDayId(new Date(), DEFAULT_DAILY_RESET_HOUR),
    dailyResetHour: DEFAULT_DAILY_RESET_HOUR,
    updatedAt: Date.now(),
    ...timerState,
  };
}

function seedStorage({ settings, timerState }: RenderTimerOptions, seed: boolean): void {
  if (settings) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
  if (!seed) return;
  seedTimerStateStorage(resolveTimerState(timerState, settings));
}

function buildTree(route: string, extra?: ReactNode) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <PomodoroSettingsProvider>
        <PomodoroTimer />
        {extra}
      </PomodoroSettingsProvider>
    </MemoryRouter>
  );
}

export function renderTimer(
  { settings, timerState, route = "/", strict = false }: RenderTimerOptions = {},
  { seed = true }: RenderTimerSeedOptions = {},
) {
  seedStorage({ settings, timerState }, seed);

  const tree = buildTree(route);

  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

export type TimerSettingsControls = {
  setWorkMinutes: PomodoroSettingsContextValue["setWorkMinutes"];
  setBreakMinutes: PomodoroSettingsContextValue["setBreakMinutes"];
};

// Renders the timer alongside a probe that captures the settings setters, so a
// test can drive a mid-session settings change through the real context.
export function renderTimerWithSettingsControls(
  { settings, timerState, route = "/" }: RenderTimerOptions = {},
  { seed = true }: RenderTimerSeedOptions = {},
) {
  seedStorage({ settings, timerState }, seed);

  const controls: Partial<TimerSettingsControls> = {};

  function SettingsProbe() {
    const { setWorkMinutes, setBreakMinutes } = usePomodoroSettings();
    controls.setWorkMinutes = setWorkMinutes;
    controls.setBreakMinutes = setBreakMinutes;
    return null;
  }

  const utils = render(buildTree(route, <SettingsProbe />));

  return { ...utils, controls: controls as TimerSettingsControls };
}
