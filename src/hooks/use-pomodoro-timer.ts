import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_TIMER_STATE as DTS, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { APP_MODE } from "@/constants/app-mode";
import { useAppMode } from "@/context/app-mode";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { useSounds } from "@/context/sounds";
import { notifyPhaseEnd } from "@/utils/notifications";
import { getDayId } from "@/utils/time";
import { clampRemainingForStatus, minRemainingSeconds, remainingSecondsUntil } from "@/utils/timer-utils";
import { restoreTimerState, saveTimerState } from "@/utils/timer-storage";
import { useTrayTitle } from "@/hooks/use-tray-title";

import type { Editing, Phase, Status } from "@/types/pomodoro";

// The minute the countdown is in, numbered by the whole-minute mark that opened
// it: 25:00 through 24:01 are minute 25. A tick plays when this number drops,
// which is exactly at a whole-minute mark normally, or on the first update past
// one when a throttled or sleeping clock jumps over it.
function tickMinuteOf(remainingSeconds: number): number {
  return Math.ceil(remainingSeconds / 60);
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
  // Wall-clock time (ms) at which the running phase ends; null unless running.
  // `remainingSeconds` is derived from it while running.
  const [endAt, setEndAt] = useState<number | null>(null);
  // Mirror of `endAt` for the countdown poll and listeners. The day rollover
  // clears it synchronously, so a countdown sync handling the same focus event
  // cannot overwrite the fresh day with the old phase's time.
  const endAtRef = useRef(endAt);
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [dailyResetHour] = useState(DTS.dailyResetHour);
  const [hydrated, setHydrated] = useState(false);
  const [phaseEndEvent, setPhaseEndEvent] = useState<{ endedPhase: Phase } | null>(null);
  const lastTickMinuteRef = useRef<number | null>(null);

  const phaseMaxSeconds = phase === "work" ? workMinutes * 60 : breakMinutes * 60;

  const minimumSeconds = minRemainingSeconds(status);

  // Public setter enforces the floor invariant so callers never pass `status` around.
  // Editing a running timer (e.g. dragging the ring) moves its end time. An edit
  // is a new starting point for minute ticks, so dragging or typing a new time
  // never ticks, and the next whole-minute mark below it does.
  const setRemainingSecondsPublic = useCallback(
    (seconds: number) => {
      const clamped = clampRemainingForStatus(seconds, status, phaseMaxSeconds);
      setRemainingSeconds(clamped);
      lastTickMinuteRef.current = tickMinuteOf(clamped);
      if (status === "running") {
        setEndAt(Date.now() + clamped * 1000);
      }
    },
    [phaseMaxSeconds, status],
  );

  /* Render-time state adjustments (https://react.dev/learn/you-might-not-need-an-effect) */

  // Clamp remaining seconds when the phase duration shrinks (e.g. settings change).
  const [prevPhaseMaxSeconds, setPrevPhaseMaxSeconds] = useState(phaseMaxSeconds);
  // A running timer's end time moves earlier by the same amount, without reading the clock.
  if (prevPhaseMaxSeconds !== phaseMaxSeconds) {
    setPrevPhaseMaxSeconds(phaseMaxSeconds);
    if (remainingSeconds > phaseMaxSeconds) {
      setRemainingSeconds(phaseMaxSeconds);
      if (endAt !== null) {
        setEndAt(endAt - (remainingSeconds - phaseMaxSeconds) * 1000);
      }
    }
  }

  const transitionToNextPhase = useCallback(
    (fromPhase: Phase, announce: boolean) => {
      const nextPhase: Phase = fromPhase === "work" ? "break" : "work";

      setPhase(nextPhase);
      setStatus("idle");
      setRemainingSeconds(nextPhase === "work" ? workMinutes * 60 : breakMinutes * 60);
      setEndAt(null);

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

  // Declared first so the mirror is current before the countdown effect runs.
  useEffect(() => {
    endAtRef.current = endAt;
  }, [endAt]);

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
      // `updatedAt` is the time the restore reconciled elapsed time against.
      setEndAt(restored.status === "running" ? restored.updatedAt + restored.remainingSeconds * 1000 : null);
      setSessionsCompletedToday(restored.sessionsCompletedToday);
      setSessionsCompletedDayId(restored.sessionsCompletedDayId);
      // Restoring a running timer is not a phase start: seed the boundary
      // tracker so hydration cannot fire an immediate tick.
      lastTickMinuteRef.current = tickMinuteOf(restored.remainingSeconds);
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
      setEndAt(null);
      endAtRef.current = null;
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

  // Count down while running by reading the wall clock against `endAt`, so a
  // throttled interval, a hidden window, or sleep cannot slow the timer down.
  // Polling faster than once a second keeps each displayed second on time.
  // Reading `endAtRef` keeps the interval and listeners stable while a drag
  // moves the end time. Reaching 0 is handled by the render-time adjustment above.
  useEffect(() => {
    if (status !== "running") return;

    const sync = () => {
      const target = endAtRef.current;
      if (target === null) return;
      setRemainingSeconds(remainingSecondsUntil(target, Date.now()));
    };

    const timer = window.setInterval(sync, 250);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [status]);

  // Tick when the countdown passes a whole-minute mark while running. The minute
  // ref prevents the start tick (and a pause/resume in the same minute) from
  // double-playing, and plays one tick, not several, when the clock jumps.
  // Manual edits re-seed the ref, so they never tick. A phase duration change
  // re-seeds it too, so a settings clamp neither ticks now nor on a later
  // resume. `remainingSeconds > 0` leaves the last second to the phase-end sound.
  const tickPhaseMaxRef = useRef(phaseMaxSeconds);
  useEffect(() => {
    if (tickPhaseMaxRef.current !== phaseMaxSeconds) {
      tickPhaseMaxRef.current = phaseMaxSeconds;
      lastTickMinuteRef.current = tickMinuteOf(remainingSeconds);
      return;
    }
    if (!hydrated || status !== "running" || remainingSeconds <= 0) return;

    const minute = tickMinuteOf(remainingSeconds);
    const previous = lastTickMinuteRef.current;
    if (previous === minute) return;

    lastTickMinuteRef.current = minute;
    if (previous === null || minute > previous) return;
    if (soundEnabled && tickSound) {
      playSound(tickSound);
    }
  }, [hydrated, phaseMaxSeconds, playSound, remainingSeconds, soundEnabled, status, tickSound]);

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
      // Use the true remaining time, which can be ahead of the last poll.
      const trueRemaining = endAt === null ? remainingSeconds : remainingSecondsUntil(endAt, Date.now());
      if (trueRemaining <= 0) {
        // The phase already ended between polls. Let the sentinel end it
        // naturally, with its sound and count, instead of pausing.
        setRemainingSeconds(0);
        return;
      }
      setRemainingSeconds(trueRemaining);
      setEndAt(null);
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
      lastTickMinuteRef.current = tickMinuteOf(nextRemaining);
      if (soundEnabled && tickSound) {
        playSound(tickSound);
      }
    }

    setEndAt(Date.now() + nextRemaining * 1000);
    setStatus("running");
  }, [endAt, fadeOutActiveSound, phaseMaxSeconds, playSound, remainingSeconds, soundEnabled, status, tickSound]);

  const skip = useCallback(() => {
    transitionToNextPhase(phase, false);
  }, [phase, transitionToNextPhase]);

  const reset = useCallback(() => {
    setRemainingSeconds(phaseMaxSeconds);
    setEndAt(null);
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
