import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_TIMER_STATE as DTS, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { APP_MODE } from "@/constants/app-mode";
import { useAppMode } from "@/context/app-mode";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { useSounds } from "@/context/sounds";
import { notifyPhaseEnd } from "@/utils/notifications";
import { getDayId } from "@/utils/time";
import { clampRemainingForStatus, minRemainingSeconds } from "@/utils/timer-utils";
import { restoreTimerState, saveTimerState } from "@/utils/timer-storage";
import { useTrayTitle } from "@/hooks/use-tray-title";

import type { Editing, Phase, Status } from "@/types/pomodoro";

// Whole-minute marks are the only points where the interval tick should fire.
// Returns null when the clock is not sitting exactly on a minute.
function currentTickMinute(remainingSeconds: number): number | null {
  return remainingSeconds > 0 && remainingSeconds % 60 === 0 ? remainingSeconds / 60 : null;
}

export type PomodoroTimerState = {
  isEditingDuration: Editing;
  phase: Phase;
  status: Status;

  phaseMaxSeconds: number;
  remainingSeconds: number;
  minRemainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
  sessionsCompletedToday: number;

  reset: () => void; // back to top of current phase
  skip: () => void; // skip to end of current phase
  toggleDurationEditing: () => void;
  toggleRunning: () => void; // toggles running <==> paused
};

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

  const [phase, setPhase] = useState<Phase>(DTS.phase);
  const [status, setStatus] = useState<Status>(DTS.status);
  const [isEditingDuration, setIsEditingDuration] = useState<Editing>(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => workMinutes * 60); // initial phase is work, so start with work duration
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [dailyResetHour] = useState(DTS.dailyResetHour);
  const [hydrated, setHydrated] = useState(false);
  const [phaseEndEvent, setPhaseEndEvent] = useState<{ endedPhase: Phase } | null>(null);
  const lastTickMinuteRef = useRef<number | null>(null);

  const phaseMaxSeconds = phase === "work" ? workMinutes * 60 : breakMinutes * 60;

  const minimumSeconds = minRemainingSeconds(status);

  // Public setter enforces the floor invariant so callers never pass `status` around.
  const setRemainingSecondsPublic = useCallback(
    (seconds: number) => {
      setRemainingSeconds(clampRemainingForStatus(seconds, status, phaseMaxSeconds));
    },
    [phaseMaxSeconds, status],
  );

  /* Render-time state adjustments (https://react.dev/learn/you-might-not-need-an-effect) */

  // Clamp remaining seconds when the phase duration shrinks (e.g. settings change).
  const [prevPhaseMaxSeconds, setPrevPhaseMaxSeconds] = useState(phaseMaxSeconds);
  if (prevPhaseMaxSeconds !== phaseMaxSeconds) {
    setPrevPhaseMaxSeconds(phaseMaxSeconds);
    setRemainingSeconds((prev) => Math.min(prev, phaseMaxSeconds));
  }

  const transitionToNextPhase = useCallback(
    (fromPhase: Phase, announce: boolean) => {
      const nextPhase: Phase = fromPhase === "work" ? "break" : "work";

      setPhase(nextPhase);
      setStatus("idle");
      setRemainingSeconds(nextPhase === "work" ? workMinutes * 60 : breakMinutes * 60);

      if (announce) {
        setPhaseEndEvent({ endedPhase: fromPhase });
      }

      if (fromPhase === "work") {
        // Day rollover is reconciled by the rollover poll effect below, so a plain
        // increment here stays pure (no clock read during render). Accepted edge case:
        // a work phase finishing within the poll window just after the reset hour
        // increments the old day's count before the poll zeroes it. See known-issues.
        setSessionsCompletedToday((prev) => prev + 1);
      }
    },
    [breakMinutes, workMinutes],
  );

  // Advance to the next phase once the countdown reaches zero while running.
  if (status === "running" && remainingSeconds === 0) {
    transitionToNextPhase(phase, true);
  }

  /* Effects */

  // Persist current state to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    saveTimerState({
      phase,
      status,
      isEditing: isEditingDuration,
      remainingSeconds,
      sessionsCompletedToday,
      sessionsCompletedDayId,
      dailyResetHour,
    });
  }, [
    phase,
    status,
    isEditingDuration,
    remainingSeconds,
    sessionsCompletedToday,
    sessionsCompletedDayId,
    dailyResetHour,
    hydrated,
  ]);

  // Restore persisted snapshot once on mount; `hydrated` guard prevents re-runs when settings deps change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydrated) return;

    let rafId = 0;
    const schedule = (fn: () => void) => {
      rafId = window.requestAnimationFrame(fn);
    };

    const raw = window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
    const result = restoreTimerState(raw, { workMinutes, breakMinutes, dailyResetHour });

    if (result.kind === "fresh") {
      schedule(() => {
        setSessionsCompletedDayId(result.dayId);
        setHydrated(true);
      });
      return () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
      };
    }

    const restored = result.state;
    schedule(() => {
      setPhase(restored.phase);
      setStatus(restored.status);
      setRemainingSeconds(restored.remainingSeconds);
      setSessionsCompletedToday(restored.sessionsCompletedToday);
      setSessionsCompletedDayId(restored.sessionsCompletedDayId);
      // Restoring a running timer is not a phase start: seed the boundary
      // tracker so hydration cannot fire an immediate tick.
      lastTickMinuteRef.current = currentTickMinute(restored.remainingSeconds);
      setHydrated(true);
    });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [breakMinutes, dailyResetHour, hydrated, workMinutes]);

  // Mirror the persisted day id so the rollover callbacks can compare without
  // making the listener effect depend on every count/day update.
  const sessionDayRef = useRef(sessionsCompletedDayId);
  useEffect(() => {
    sessionDayRef.current = sessionsCompletedDayId;
  }, [sessionsCompletedDayId]);

  // Poll the pomodoro day so a live app reacts to the reset-hour boundary. Focus
  // and visibility checks cover sleep/wake and menu-bar show immediately, before
  // the next poll. A new day always begins in a fresh work phase, even when the
  // app stayed alive overnight and never went through restore.
  useEffect(() => {
    if (!hydrated) return;

    const startFreshDay = (dayId: string) => {
      setPhase("work");
      setStatus("idle");
      setRemainingSeconds(workMinutes * 60);
      setSessionsCompletedToday(0);
      setSessionsCompletedDayId(dayId);
      sessionDayRef.current = dayId;
    };

    const syncDay = () => {
      const dayId = getDayId(new Date(), dailyResetHour);
      if (dayId === sessionDayRef.current) return;
      startFreshDay(dayId);
    };

    const timer = window.setInterval(syncDay, 30000);
    window.addEventListener("focus", syncDay);
    document.addEventListener("visibilitychange", syncDay);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncDay);
      document.removeEventListener("visibilitychange", syncDay);
    };
  }, [dailyResetHour, hydrated, workMinutes]);

  // Count down while running; reaching 0 is handled by the render-time adjustment above.
  useEffect(() => {
    if (status !== "running") return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status]);

  // Tick on every whole-minute mark while the phase is running. The minute ref
  // prevents the start tick (and a pause/resume on the same minute) from
  // double-playing; `remainingSeconds > 0` leaves the last second to the
  // phase-end sound.
  useEffect(() => {
    if (!hydrated || status !== "running") return;
    if (!soundEnabled || !tickSound) return;

    const minute = currentTickMinute(remainingSeconds);
    if (minute === null || lastTickMinuteRef.current === minute) return;

    lastTickMinuteRef.current = minute;
    playSound(tickSound);
  }, [hydrated, playSound, remainingSeconds, soundEnabled, status, tickSound]);

  // Announce a natural phase end exactly once. Skip and Reset never set
  // `phaseEndEvent`, so they stay silent. The consumed-event identity guard
  // prevents a settings change from replaying the same event.
  const consumedPhaseEndRef = useRef<{ endedPhase: Phase } | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (!phaseEndEvent) return;
    if (consumedPhaseEndRef.current === phaseEndEvent) return;
    consumedPhaseEndRef.current = phaseEndEvent;

    const endedPhase = phaseEndEvent.endedPhase;

    if (soundEnabled) {
      const soundId = endedPhase === "work" ? workEndSound : breakEndSound;
      if (soundId) {
        playSound(soundId);
      }
    }

    if (notificationsEnabled) {
      notifyPhaseEnd(endedPhase === "work" ? "break" : "work");
    }
  }, [hydrated, notificationsEnabled, phaseEndEvent, playSound, soundEnabled, workEndSound, breakEndSound]);

  useTrayTitle(appMode === APP_MODE.menuBar && showTimerInMenuBar, remainingSeconds);

  /* Actions */

  const toggleDurationEditing = useCallback(() => {
    setIsEditingDuration((prev) => !prev);
  }, [setIsEditingDuration]);

  const toggleRunning = useCallback(() => {
    if (status === "running") {
      setStatus("paused");
      return;
    }

    const nextRemaining = remainingSeconds <= 0 ? phaseMaxSeconds : remainingSeconds;
    if (remainingSeconds <= 0) {
      setRemainingSeconds(phaseMaxSeconds);
    }

    // Starting the next phase cuts short any phase-end sound still playing
    // (notably the long guitar loop).
    fadeOutActiveSound();

    // A genuine phase start gets a tick. Resuming from pause does not; the
    // boundary tracker stays where it was so the next whole minute still fires.
    if (status === "idle") {
      lastTickMinuteRef.current = currentTickMinute(nextRemaining);
      if (soundEnabled && tickSound) {
        playSound(tickSound);
      }
    }

    setStatus("running");
  }, [fadeOutActiveSound, phaseMaxSeconds, playSound, remainingSeconds, soundEnabled, status, tickSound]);

  const skip = useCallback(() => {
    transitionToNextPhase(phase, false);
  }, [phase, transitionToNextPhase]);

  const reset = useCallback(() => {
    setRemainingSeconds(phaseMaxSeconds);
    setStatus("idle");
  }, [phaseMaxSeconds]);

  return {
    isEditingDuration,
    status,
    phase,

    phaseMaxSeconds,
    remainingSeconds,
    minRemainingSeconds: minimumSeconds,
    setRemainingSeconds: setRemainingSecondsPublic,
    sessionsCompletedToday,

    reset,
    skip,
    toggleDurationEditing,
    toggleRunning,
  };
}
