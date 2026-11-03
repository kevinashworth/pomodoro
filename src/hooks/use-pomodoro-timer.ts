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
    notificationsEnabled,
    showTimerInMenuBar,
  } = usePomodoroSettings();
  const { mode: appMode } = useAppMode();
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
      setHydrated(true);
    });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [breakMinutes, dailyResetHour, hydrated, workMinutes]);

  // Sole reconciliation for the Pomodoro day rollover: the render path stays pure,
  // so the daily count is reset here rather than during render. Accepted tradeoffs:
  // the UI can lag up to one poll interval after the reset hour, and the persisted
  // snapshot can carry the stale day/count until the next persist (restore normalizes
  // on load). See docs/known-issues.md.
  useEffect(() => {
    if (!hydrated) return;

    const timer = window.setInterval(() => {
      const dayId = getDayId(new Date(), dailyResetHour);
      setSessionsCompletedDayId((prevDayId) => {
        if (prevDayId === dayId) {
          return prevDayId;
        }
        setSessionsCompletedToday(0);
        return dayId;
      });
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [dailyResetHour, hydrated]);

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

    if (remainingSeconds <= 0) {
      setRemainingSeconds(phaseMaxSeconds);
    }

    // Starting the next phase cuts short any phase-end sound still playing
    // (notably the long guitar loop).
    fadeOutActiveSound();
    setStatus("running");
  }, [fadeOutActiveSound, phaseMaxSeconds, remainingSeconds, status]);

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
