import { render } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { PomodoroTimer } from "@/components/pomodoro-timer";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { PomodoroSettingsProvider, usePomodoroSettings } from "@/context/pomodoro-settings";
import { SoundsProvider } from "@/context/sounds";
import { PomodoroTimerProvider } from "@/context/pomodoro-timer";
import { dayIdAt, type TimerSnapshot } from "@/timer/timer-reducer";

import type { Phase, PomodoroSettings, PomodoroSettingsContextValue, Status } from "@/types/pomodoro";

// A saved timer described in test terms. Times are whole seconds from now; a
// running seed may give an exact `endAt` instead.
export type TimerSeed = {
  phase?: Phase;
  status?: Status;
  remainingSeconds?: number;
  endAt?: number;
  sessionsCompletedToday?: number;
  dayId?: string;
};

export type RenderTimerOptions = {
  settings?: Partial<PomodoroSettings>;
  timerState?: TimerSeed;
  route?: string;
  strict?: boolean;
};

export type RenderTimerSeedOptions = {
  // When false, skip seeding the timer-state snapshot so tests can exercise empty
  // or pre-seeded (e.g. corrupt) storage. Provided settings are still seeded so a
  // fresh start can run with a configured duration. Default: true.
  seed?: boolean;
};

// Builds the saved snapshot for a seed. `remainingSeconds` defaults to the
// phase duration for the given settings, mirroring a fresh start.
export function timerSnapshot(seed: TimerSeed = {}, settings?: Partial<PomodoroSettings>): TimerSnapshot {
  const { workMinutes, breakMinutes } = { ...DEFAULT_SETTINGS, ...settings };
  const phase = seed.phase ?? "work";
  const status = seed.status ?? "idle";
  const ms = (seed.remainingSeconds ?? (phase === "work" ? workMinutes : breakMinutes) * 60) * 1000;
  return {
    phase,
    clock: status === "running" ? { status, endAt: seed.endAt ?? Date.now() + ms } : { status, remainingMs: ms },
    sessionsCompletedToday: seed.sessionsCompletedToday ?? 0,
    dayId: seed.dayId ?? dayIdAt(Date.now()),
  };
}

export function seedTimerStateStorage(seed: TimerSeed, settings?: Partial<PomodoroSettings>): void {
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(timerSnapshot(seed, settings)));
}

export function seedRawTimerStateStorage(raw: string): void {
  window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, raw);
}

export function readTimerStateStorage(): TimerSnapshot | null {
  const raw = window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerSnapshot;
  } catch {
    return null;
  }
}

export function clearTimerStorage(): void {
  window.localStorage.removeItem(TIMER_STATE_STORAGE_KEY);
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
}

function seedStorage({ settings, timerState }: RenderTimerOptions, seed: boolean): void {
  if (settings) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
  if (!seed) return;
  seedTimerStateStorage(timerState ?? {}, settings);
}

function buildTree(route: string, extra?: ReactNode) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <PomodoroSettingsProvider>
        <SoundsProvider>
          <PomodoroTimerProvider>
            <PomodoroTimer />
            {extra}
          </PomodoroTimerProvider>
        </SoundsProvider>
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
