import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_DAILY_RESET_HOUR, DEFAULT_TIMER_STATE as DTS, TIMER_STATE_STORAGE_KEY } from "@/constants/pomodoro";
import { APP_MODE } from "@/constants/app-mode";
import { useAppMode } from "@/context/app-mode";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { useSounds } from "@/context/sounds";
import { notifyPhaseEnd } from "@/utils/notifications";
import { getDayId } from "@/utils/time";
import {
  capClock,
  clampRemainingForStatus,
  clockRemainingSeconds,
  minRemainingSeconds,
  msUntilNextSecond,
  remainingSecondsUntil,
  runningClock,
  syncClock,
  type TimerClock,
} from "@/utils/timer-utils";
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
  const [isEditingDuration, setIsEditingDuration] = useState<Editing>(false);
  // Status and time in one value, so they cannot disagree. A running timer
  // stores only its end time, and `remainingSeconds` is derived from it.
  // The initial phase is work, so start with the work duration.
  const [clock, setClock] = useState<TimerClock>(() => ({ status: "idle", remainingSeconds: workMinutes * 60 }));
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [hydrated, setHydrated] = useState(false);
  const [phaseEndEvent, setPhaseEndEvent] = useState<{ endedPhase: Phase } | null>(null);
  const lastTickMinuteRef = useRef<number | null>(null);

  const phaseMaxSeconds = phase === "work" ? workMinutes * 60 : breakMinutes * 60;

  const status: Status = clock.status;
  const endAt = clock.status === "running" ? clock.endAt : null;
  const stoppedSeconds = clock.status === "running" ? null : clock.remainingSeconds;
  // Capped at the phase duration for the one render between a duration drop and
  // the effect that moves the clock (see "Fit the clock" below).
  const remainingSeconds = Math.min(phaseMaxSeconds, clockRemainingSeconds(clock));

  const minimumSeconds = minRemainingSeconds(status);

  // Public setter enforces the floor invariant so callers never pass `status` around.
  // Editing a running timer (e.g. dragging the ring) moves its end time. An edit
  // is a new starting point for minute ticks, so dragging or typing a new time
  // never ticks, and the next whole-minute mark below it does.
  const setRemainingSecondsPublic = useCallback(
    (seconds: number) => {
      const clamped = clampRemainingForStatus(seconds, status, phaseMaxSeconds);
      lastTickMinuteRef.current = tickMinuteOf(clamped);
      setClock(status === "running" ? runningClock(clamped, Date.now()) : { status, remainingSeconds: clamped });
    },
    [phaseMaxSeconds, status],
  );

  /* Render-time state adjustments (https://react.dev/learn/you-might-not-need-an-effect) */

  const transitionToNextPhase = useCallback(
    (fromPhase: Phase, announce: boolean) => {
      const nextPhase: Phase = fromPhase === "work" ? "break" : "work";

      setPhase(nextPhase);
      setClock({ status: "idle", remainingSeconds: nextPhase === "work" ? workMinutes * 60 : breakMinutes * 60 });

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

  // Fit the clock inside the phase duration when it shrinks (e.g. a settings
  // change, possibly from another tab). This reads the real clock, so it is an
  // effect: a running timer's last sync can be stale in a throttled tab, and
  // moving the end time by that stale amount would shorten the phase too much.
  // The new value is the starting point for minute ticks, so the clamp itself
  // never ticks, and neither does a later resume.
  const fittedPhaseMaxRef = useRef(phaseMaxSeconds);
  useEffect(() => {
    if (fittedPhaseMaxRef.current === phaseMaxSeconds) return;
    fittedPhaseMaxRef.current = phaseMaxSeconds;

    const fitted = capClock(clock, phaseMaxSeconds, Date.now());
    lastTickMinuteRef.current = tickMinuteOf(clockRemainingSeconds(fitted));
    if (fitted !== clock) {
      setClock(fitted);
    }
  }, [clock, phaseMaxSeconds]);

  // Persist on every change except the countdown itself: a running timer is
  // saved by its end time, which only moves on a start, an edit, or a clamp.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    saveTimerState({
      phase,
      status,
      remainingSeconds: endAt === null ? (stoppedSeconds ?? 0) : remainingSecondsUntil(endAt, Date.now()),
      endAt,
      sessionsCompletedToday,
      sessionsCompletedDayId,
    });
  }, [phase, status, endAt, stoppedSeconds, sessionsCompletedToday, sessionsCompletedDayId, hydrated]);

  // Restore persisted snapshot once on mount; `hydrated` guard prevents re-runs when settings deps change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydrated) return;

    let rafId = 0;
    const schedule = (fn: () => void) => {
      rafId = window.requestAnimationFrame(fn);
    };

    const raw = window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
    const result = restoreTimerState(raw, { workMinutes, breakMinutes });

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
      // `updatedAt` is the time the restore reconciled elapsed time against.
      setClock(
        restored.status === "running"
          ? {
              status: "running",
              endAt: restored.endAt ?? restored.updatedAt + restored.remainingSeconds * 1000,
              syncedAt: restored.updatedAt,
            }
          : { status: restored.status, remainingSeconds: restored.remainingSeconds },
      );
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
  }, [breakMinutes, hydrated, workMinutes]);

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
      setClock({ status: "idle", remainingSeconds: workMinutes * 60 });
      setSessionsCompletedToday(0);
      setSessionsCompletedDayId(dayId);
      sessionDayRef.current = dayId;
    };

    const syncDay = () => {
      const dayId = getDayId(new Date(), DEFAULT_DAILY_RESET_HOUR);
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
  }, [hydrated, workMinutes]);

  // Count down while running by reading the wall clock against `endAt`, so a
  // throttled timer, a hidden window, or sleep cannot slow the timer down. Each
  // wakeup is scheduled for the moment the displayed second next changes, and
  // reschedules from the clock, so lateness never accumulates. Focus and
  // visibility resync at once after sleep or a hidden window. The functional
  // update sees a day rollover handled by the same event, so it cannot bring
  // back the old phase. Reaching 0 is handled by the render-time adjustment above.
  useEffect(() => {
    if (endAt === null) return;

    let timer = 0;
    const sync = () => setClock((current) => syncClock(current, Date.now()));
    const wake = () => {
      sync();
      timer = window.setTimeout(wake, msUntilNextSecond(endAt, Date.now()));
    };

    timer = window.setTimeout(wake, msUntilNextSecond(endAt, Date.now()));
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [endAt]);

  // Tick when the countdown passes a whole-minute mark while running. The minute
  // ref prevents the start tick (and a pause/resume in the same minute) from
  // double-playing, and plays one tick, not several, when the clock jumps.
  // Manual edits re-seed the ref, so they never tick. A phase duration change
  // is re-seeded by the clamp effect, and this render, which can still show the
  // pre-clamp time, is skipped. `remainingSeconds > 0` leaves the last second
  // to the phase-end sound.
  const tickPhaseMaxRef = useRef(phaseMaxSeconds);
  useEffect(() => {
    if (tickPhaseMaxRef.current !== phaseMaxSeconds) {
      tickPhaseMaxRef.current = phaseMaxSeconds;
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
    if (clock.status === "running") {
      // Use the true remaining time, which can be ahead of the last sync.
      const now = Date.now();
      const trueRemaining = remainingSecondsUntil(clock.endAt, now);
      if (trueRemaining <= 0) {
        // The phase already ended between wakeups. Sync so the sentinel ends
        // it naturally, with its sound and count, instead of pausing.
        setClock({ ...clock, syncedAt: now });
        return;
      }
      setClock({ status: "paused", remainingSeconds: Math.min(phaseMaxSeconds, trueRemaining) });
      return;
    }

    const nextRemaining = remainingSeconds <= 0 ? phaseMaxSeconds : remainingSeconds;

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

    setClock(runningClock(nextRemaining, Date.now()));
  }, [clock, fadeOutActiveSound, phaseMaxSeconds, playSound, remainingSeconds, soundEnabled, status, tickSound]);

  const skip = useCallback(() => {
    transitionToNextPhase(phase, false);
  }, [phase, transitionToNextPhase]);

  const reset = useCallback(() => {
    setClock({ status: "idle", remainingSeconds: phaseMaxSeconds });
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
