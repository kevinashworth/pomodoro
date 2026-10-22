import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_TIMER_STATE as DTS, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { notifyPhaseEnd } from "@/utils/notifications";
import playSoftChime from "@/utils/sounds";
import { getDayId } from "@/utils/time";
import { clampRemainingForStatus, minRemainingSeconds } from "@/utils/timer-utils";
import { alignCountToDay, buildTimerState, restoreTimerState, saveTimerState } from "@/utils/timer-storage";
import { useTrayTitle } from "@/hooks/use-tray-title";

import type { Editing, Mode, Status } from "@/types/pomodoro";

export type PomodoroTimerState = {
  isEditingDuration: Editing;
  mode: Mode;
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
  const { workMinutes, breakMinutes, soundEnabled, notificationsEnabled, showTimerInMenuBar } = usePomodoroSettings();

  const [mode, setMode] = useState<Mode>(DTS.mode);
  const [status, setStatus] = useState<Status>(DTS.status);
  const [isEditingDuration, setIsEditingDuration] = useState<Editing>(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => workMinutes * 60); // initial mode is work, so start with work duration
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [dailyResetHour] = useState(DTS.dailyResetHour);
  const [hydrated, setHydrated] = useState(false);

  const phaseMaxSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;

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

  // Reset the daily count on the first render after the pomodoro day rolls over.
  if (hydrated) {
    const aligned = alignCountToDay(sessionsCompletedToday, sessionsCompletedDayId, new Date(), dailyResetHour);
    if (aligned.dayId !== sessionsCompletedDayId) {
      setSessionsCompletedDayId(aligned.dayId);
      setSessionsCompletedToday(aligned.count);
    }
  }

  const transitionToNextPhase = useCallback(
    (fromMode: Mode) => {
      const nextMode: Mode = fromMode === "work" ? "break" : "work";

      setMode(nextMode);
      setStatus("idle");
      setRemainingSeconds(nextMode === "work" ? workMinutes * 60 : breakMinutes * 60);

      if (fromMode === "work") {
        const aligned = alignCountToDay(sessionsCompletedToday, sessionsCompletedDayId, new Date(), dailyResetHour);
        setSessionsCompletedDayId(aligned.dayId);
        setSessionsCompletedToday(aligned.count + 1);
      }
    },
    [breakMinutes, dailyResetHour, sessionsCompletedDayId, sessionsCompletedToday, workMinutes],
  );

  // Advance to the next phase once the countdown reaches zero while running.
  if (status === "running" && remainingSeconds === 0) {
    transitionToNextPhase(mode);
  }

  /* Effects */

  // Persist current state to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    saveTimerState(
      buildTimerState({
        mode,
        status,
        isEditing: isEditingDuration,
        remainingSeconds,
        sessionsCompletedToday,
        sessionsCompletedDayId,
        dailyResetHour,
      }),
    );
  }, [
    mode,
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
      setMode(restored.mode);
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

  // Reset today's completed count when the Pomodoro day rolls over.
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

  // Play the chime / notification once per real phase transition.
  // A transition is the only thing that changes `mode`, but the rehydration
  // restore also sets it — so the first settled mode is treated as a baseline
  // (no fire), and we only fire when the mode actually changes afterwards.
  const lastSoundedModeRef = useRef<Mode | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (lastSoundedModeRef.current === null) {
      lastSoundedModeRef.current = mode;
      return;
    }
    if (lastSoundedModeRef.current === mode) return;
    lastSoundedModeRef.current = mode;

    if (soundEnabled) {
      playSoftChime();
    }

    if (notificationsEnabled) {
      notifyPhaseEnd(mode);
    }
  }, [hydrated, mode, notificationsEnabled, soundEnabled]);

  useTrayTitle(showTimerInMenuBar, remainingSeconds);

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

    setStatus("running");
  }, [phaseMaxSeconds, remainingSeconds, status]);

  const skip = useCallback(() => {
    transitionToNextPhase(mode);
  }, [mode, transitionToNextPhase]);

  const reset = useCallback(() => {
    setRemainingSeconds(phaseMaxSeconds);
    setStatus("paused");
    setStatus("idle");
  }, [phaseMaxSeconds]);

  return {
    isEditingDuration,
    status,
    mode,

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
