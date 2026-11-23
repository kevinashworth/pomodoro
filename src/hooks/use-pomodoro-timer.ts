import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";

import { TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { APP_MODE } from "@/constants/app-mode";
import { useAppMode } from "@/context/app-mode";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { useSounds } from "@/context/sounds";
import { useTrayTitle } from "@/hooks/use-tray-title";
import {
  clockRemainingMs,
  clockSeconds,
  initialCore,
  minRemainingSeconds,
  msUntilNextSecond,
  timerReducer,
  type Durations,
  type TimerCommand,
  type TimerCore,
} from "@/timer/timer-reducer";
import { restoreTimerState, saveTimerState } from "@/timer/timer-storage";
import { notifyPhaseEnd } from "@/utils/notifications";

import type { Phase, Status } from "@/types/pomodoro";

// How often a stopped timer checks for a new pomodoro day. A running timer
// checks on every per-second wakeup.
const DAY_CHECK_MS = 30_000;

export type PomodoroTimerState = {
  isEditingDuration: boolean;
  phase: Phase;
  status: Status;

  phaseMaxSeconds: number;
  remainingSeconds: number;
  // Exact time left: as of the last sync while running, or frozen while stopped.
  remainingMs: number;
  // Wall-clock end time while running; null otherwise.
  endAt: number | null;
  minRemainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
  sessionsCompletedToday: number;

  reset: () => void; // back to top of current phase
  skip: () => void; // skip to end of current phase
  toggleDurationEditing: () => void;
  toggleRunning: () => void; // toggles running <==> paused
};

// Restores synchronously on the first render, like the settings provider.
function initTimer(durations: Durations): TimerCore {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
  return initialCore(restoreTimerState(raw, { durations, now: Date.now() }));
}

// Timer behavior lives in `src/timer/timer-reducer.ts`; see its header. This
// hook feeds it the clock and settings, and turns its results into wakeups,
// storage writes, sounds, and notifications.
export function usePomodoroTimerState(): PomodoroTimerState {
  const {
    workMinutes,
    breakMinutes,
    soundEnabled,
    workEndSound,
    breakEndSound,
    tickSound,
    notificationsEnabled,
    showTimerInMenuBar,
  } = usePomodoroSettings();
  const { appMode } = useAppMode();
  const { playSound, fadeOutActiveSound } = useSounds();

  const durations = useMemo<Durations>(
    () => ({ work: workMinutes * 60, break: breakMinutes * 60 }),
    [breakMinutes, workMinutes],
  );
  const [state, dispatch] = useReducer(timerReducer, durations, initTimer);
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  const { phase, clock, sessionsCompletedToday, dayId, ticks, phaseEnd } = state;
  const status = clock.status;
  const endAt = clock.status === "running" ? clock.endAt : null;
  const stoppedMs = clock.status === "running" ? null : clock.remainingMs;
  const phaseMaxSeconds = durations[phase];
  // Capped for the one render between a duration drop and `fitDuration`.
  const remainingSeconds = Math.min(phaseMaxSeconds, clockSeconds(clock));

  // Every action carries the current clock reading and durations.
  const send = useCallback(
    (command: TimerCommand) => dispatch({ ...command, now: Date.now(), durations }),
    [durations],
  );

  /* Effects */

  // Wake when the displayed second next changes while running, or periodically
  // while stopped so a new day is noticed. Focus and visibility sync at once
  // after sleep or a hidden window. Each wakeup reschedules from the clock, so
  // lateness never accumulates.
  const sync = useEffectEvent(() => send({ type: "sync" }));
  useEffect(() => {
    let timer = 0;
    const delay = () => (endAt === null ? DAY_CHECK_MS : msUntilNextSecond(endAt, Date.now()));
    const wake = () => {
      sync();
      timer = window.setTimeout(wake, delay());
    };

    timer = window.setTimeout(wake, delay());
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [endAt]);

  // Keep the timer within the phase duration when a setting changes, possibly
  // from another tab. `send` changes exactly when the durations do.
  useEffect(() => {
    send({ type: "fitDuration" });
  }, [send]);

  // Persist every change except the countdown itself: a running timer is saved
  // by its end time.
  useEffect(() => {
    saveTimerState({
      phase,
      status,
      endAt,
      remainingMs: stoppedMs,
      sessionsCompletedToday,
      sessionsCompletedDayId: dayId,
    });
  }, [dayId, endAt, phase, sessionsCompletedToday, status, stoppedMs]);

  // Play one tick per bump. The ref keeps a settings change from replaying one.
  const playedTicksRef = useRef(ticks);
  useEffect(() => {
    if (playedTicksRef.current === ticks) return;
    playedTicksRef.current = ticks;
    if (soundEnabled && tickSound) {
      playSound(tickSound);
    }
  }, [playSound, soundEnabled, tickSound, ticks]);

  // Announce each natural phase end once.
  const announcedRef = useRef(phaseEnd.count);
  useEffect(() => {
    if (announcedRef.current === phaseEnd.count || phaseEnd.endedPhase === null) return;
    announcedRef.current = phaseEnd.count;

    const endedPhase = phaseEnd.endedPhase;
    if (soundEnabled) {
      const soundId = endedPhase === "work" ? workEndSound : breakEndSound;
      if (soundId) {
        playSound(soundId);
      }
    }
    if (notificationsEnabled) {
      void notifyPhaseEnd(endedPhase === "work" ? "break" : "work");
    }
  }, [breakEndSound, notificationsEnabled, phaseEnd, playSound, soundEnabled, workEndSound]);

  useTrayTitle(appMode === APP_MODE.menuBar && showTimerInMenuBar, remainingSeconds);

  /* Actions */

  const toggleRunning = useCallback(() => {
    if (status === "running") {
      send({ type: "pause" });
      return;
    }
    // Starting cuts short any phase-end sound still playing (notably the long
    // guitar loop).
    fadeOutActiveSound();
    send({ type: "start" });
  }, [fadeOutActiveSound, send, status]);

  const setRemainingSeconds = useCallback((seconds: number) => send({ type: "edit", seconds }), [send]);
  const reset = useCallback(() => send({ type: "reset" }), [send]);
  const skip = useCallback(() => send({ type: "skip" }), [send]);
  const toggleDurationEditing = useCallback(() => setIsEditingDuration((prev) => !prev), []);

  return {
    isEditingDuration,
    status,
    phase,

    phaseMaxSeconds,
    remainingSeconds,
    remainingMs: clockRemainingMs(clock),
    endAt,
    minRemainingSeconds: minRemainingSeconds(status),
    setRemainingSeconds,
    sessionsCompletedToday,

    reset,
    skip,
    toggleDurationEditing,
    toggleRunning,
  };
}
