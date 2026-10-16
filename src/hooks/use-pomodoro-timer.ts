import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { DEFAULT_TIMER_STATE as DTS, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { notifyPhaseEnd } from "@/utils/notifications";
import playSoftChime from "@/utils/sounds";
import { getDayId } from "@/utils/time";
import { alignCountToDay, buildTimerState, restoreTimerState, saveTimerState } from "@/utils/timer-storage";
import { useTrayTitle } from "@/hooks/use-tray-title";

import type { Mode, Status } from "@/types/pomodoro";

export type PomodoroTimerState = {
  mode: Mode;
  phaseMaxSeconds: number;
  remainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
  sessionsCompletedToday: number;
  status: Status;
  reset: () => void;
  skip: () => void;
  toggle: () => void;
  endAt: number | null;
};

export function usePomodoroTimerState(): PomodoroTimerState {
  const { workMinutes, breakMinutes, soundEnabled, notificationsEnabled, showTimerInMenuBar } = usePomodoroSettings();

  const [mode, setMode] = useState<Mode>(DTS.mode);
  const [status, setStatus] = useState<Status>(DTS.status);
  const [remainingSeconds, setRemainingSecondsState] = useState(() => workMinutes * 60); // initial mode is work, so start with work duration
  const [endAt, setEndAt] = useState<number | null>(null);
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [dailyResetHour] = useState(DTS.dailyResetHour);
  const [hydrated, setHydrated] = useState(false);

  const statusRef = useRef(status);
  const endAtRef = useRef(endAt);

  const phaseMaxSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    endAtRef.current = endAt;
  }, [endAt]);

  /* Render-time state adjustments (https://react.dev/learn/you-might-not-need-an-effect) */

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
      setRemainingSecondsState(nextMode === "work" ? workMinutes * 60 : breakMinutes * 60);
      setEndAt(null);

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

  // Clamp remaining seconds when the phase duration shrinks (e.g. settings change),
  // and move the running deadline to match the clamped value.
  const prevPhaseMaxRef = useRef(phaseMaxSeconds);
  useEffect(() => {
    if (prevPhaseMaxRef.current === phaseMaxSeconds) return;
    prevPhaseMaxRef.current = phaseMaxSeconds;

    setRemainingSecondsState((prev) => Math.min(prev, phaseMaxSeconds));
    if (statusRef.current === "running") {
      setEndAt(Date.now() + Math.min(remainingSeconds, phaseMaxSeconds) * 1000);
    }
  }, [phaseMaxSeconds, remainingSeconds]);

  // Persist current state to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    saveTimerState(
      buildTimerState({
        mode,
        status,
        remainingSeconds,
        endAt,
        sessionsCompletedToday,
        sessionsCompletedDayId,
        dailyResetHour,
      }),
    );
  }, [mode, status, remainingSeconds, endAt, sessionsCompletedToday, sessionsCompletedDayId, dailyResetHour, hydrated]);

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
      setRemainingSecondsState(restored.remainingSeconds);
      setEndAt(restored.endAt);
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

  // Recompute the remaining time from the wall-clock deadline. Safe to call at
  // any cadence: a throttled or missed tick still yields the correct value.
  const reconcile = useCallback(() => {
    if (statusRef.current !== "running") return;
    const target = endAtRef.current;
    if (target == null) return;
    setRemainingSecondsState(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
  }, []);

  // Keep the display in sync while running; reaching 0 is handled by the render-time adjustment above.
  useEffect(() => {
    if (status !== "running") return;

    const timer = window.setInterval(reconcile, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [status, reconcile]);

  // Correct the display after the app was backgrounded, hidden, or woken from sleep.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconcile();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", reconcile);
    window.addEventListener("pageshow", reconcile);

    const phaseEnd = isTauri() ? listen("timer:phase-ended", reconcile) : null;
    const shown = isTauri() ? listen("window:shown", reconcile) : null;

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("pageshow", reconcile);
      if (phaseEnd) void phaseEnd.then((fn) => fn());
      if (shown) void shown.then((fn) => fn());
    };
  }, [reconcile]);

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

  useTrayTitle(showTimerInMenuBar, remainingSeconds, isTauri() && status === "running" && showTimerInMenuBar);

  // Hand the deadline to the native scheduler so the phase ends on time (and the
  // menu-bar clock keeps ticking) even when the webview is throttled or hidden.
  useEffect(() => {
    if (!isTauri()) return;
    if (status === "running" && endAt != null) {
      void invoke("schedule_timer", { endAtMs: endAt, showInMenuBar: showTimerInMenuBar });
    } else {
      void invoke("cancel_timer");
    }
  }, [status, endAt, showTimerInMenuBar]);

  /* Actions */

  const setRemainingSeconds = useCallback((seconds: number) => {
    setRemainingSecondsState(seconds);
    if (statusRef.current === "running") {
      const next = Date.now() + seconds * 1000;
      endAtRef.current = next;
      setEndAt(next);
    }
  }, []);

  const toggle = useCallback(() => {
    if (status === "running") {
      const target = endAtRef.current;
      if (target != null) {
        setRemainingSecondsState(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
      }
      endAtRef.current = null;
      setEndAt(null);
      setStatus("paused");
      return;
    }

    const nextRemaining = remainingSeconds <= 0 ? phaseMaxSeconds : remainingSeconds;
    if (remainingSeconds <= 0) {
      setRemainingSecondsState(phaseMaxSeconds);
    }

    const next = Date.now() + nextRemaining * 1000;
    endAtRef.current = next;
    setEndAt(next);
    setStatus("running");
  }, [phaseMaxSeconds, remainingSeconds, status]);

  const skip = useCallback(() => {
    transitionToNextPhase(mode);
  }, [mode, transitionToNextPhase]);

  const reset = useCallback(() => {
    setRemainingSecondsState(phaseMaxSeconds);
    endAtRef.current = null;
    setEndAt(null);
    setStatus("paused");
    setStatus("idle");
  }, [phaseMaxSeconds]);

  return {
    mode,
    phaseMaxSeconds,
    remainingSeconds,
    setRemainingSeconds,
    sessionsCompletedToday,
    status,
    reset,
    skip,
    toggle,
    endAt,
  };
}
