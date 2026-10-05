import { useCallback, useEffect, useState } from "react";

import { DEFAULT_TIMER_STATE as DTS, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import notifyPhaseEnd from "@/utils/notifications";
import playSoftChime from "@/utils/sounds";
import { getDayId } from "@/utils/time";
import { alignCountToDay, buildTimerState, restoreTimerState, saveTimerState } from "@/utils/timer-storage";

import type { Mode, Status } from "@/types/pomodoro";

export type PomodoroTimerState = {
  mode: Mode;
  phaseMaxSeconds: number;
  remainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
  sessionsCompletedToday: number;
  status: Status;
  skip: () => void;
  toggle: () => void;
};

export function usePomodoroTimer(): PomodoroTimerState {
  const { workMinutes, breakMinutes, soundEnabled, notificationsEnabled } = usePomodoroSettings();

  const [mode, setMode] = useState<Mode>(DTS.mode);
  const [status, setStatus] = useState<Status>(DTS.status);
  // The initial mode is "work", so a fresh start uses the configured work duration.
  const [remainingSeconds, setRemainingSeconds] = useState(() => workMinutes * 60);
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [dailyResetHour] = useState(DTS.dailyResetHour);
  const [hydrated, setHydrated] = useState(false);

  const phaseMaxSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;

  // Two render-time state adjustments (https://react.dev/learn/you-might-not-need-an-effect)

  // 1. Clamp remaining seconds when phase max shrinks (e.g. duration settings change)
  const [prevPhaseMaxSeconds, setPrevPhaseMaxSeconds] = useState(phaseMaxSeconds);
  if (prevPhaseMaxSeconds !== phaseMaxSeconds) {
    setPrevPhaseMaxSeconds(phaseMaxSeconds);
    setRemainingSeconds((prev) => Math.min(prev, phaseMaxSeconds));
  }

  // 2. Reset daily count on first render after pomodoro day rolls over
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

      if (soundEnabled) {
        playSoftChime();
      }

      if (notificationsEnabled) {
        notifyPhaseEnd(nextMode);
      }
    },
    [
      breakMinutes,
      dailyResetHour,
      sessionsCompletedDayId,
      sessionsCompletedToday,
      notificationsEnabled,
      soundEnabled,
      workMinutes,
    ],
  );

  // Persist current state to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    saveTimerState(
      buildTimerState({
        mode,
        status,
        remainingSeconds,
        sessionsCompletedToday,
        sessionsCompletedDayId,
        dailyResetHour,
      }),
    );
  }, [mode, status, remainingSeconds, sessionsCompletedToday, sessionsCompletedDayId, dailyResetHour, hydrated]);

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

  // Count down while running and advance to the next phase at 0.
  useEffect(() => {
    if (status !== "running") return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          transitionToNextPhase(mode);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [mode, status, transitionToNextPhase]);

  const toggle = useCallback(() => {
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

  return {
    mode,
    phaseMaxSeconds,
    remainingSeconds,
    setRemainingSeconds,
    sessionsCompletedToday,
    status,
    skip,
    toggle,
  };
}
