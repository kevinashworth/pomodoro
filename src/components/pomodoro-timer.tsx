import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { ExpandIcon } from "@/components/icons/expand-icon";
import { PauseControlIcon } from "@/components/icons/pause-icon";
import { PlayControlIcon } from "@/components/icons/play-icon";
import { SettingsCogIcon } from "@/components/icons/settings-cog-icon";
import { SkipControlIcon } from "@/components/icons/skip-icon";
import { PomodoroSkipConfirmDialog } from "@/components/pomodoro-skip-confirm-dialog";
import {
  COLORS,
  DEFAULT_RING_SIZE,
  DEFAULT_TIMER_STATE as DTS,
  MINI_RING_SIZE,
  STROKE_WIDTH,
  TIMER_STATE_STORAGE_KEY,
} from "@/constants/pomodoro";
import { MINI_WINDOW_HEIGHT, MINI_WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants/window";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import cn from "@/utils/cn";
import ringGeometry from "@/utils/ring";
import playSoftChime from "@/utils/sounds";

import type { Mode, Status, TimerState } from "@/types/pomodoro";

function clampRemaining(seconds: number, running: boolean, maxSeconds: number): number {
  const min = running ? 1 : 0;
  return Math.max(min, Math.min(maxSeconds, seconds));
}

function getDayId(now: Date, resetHour: number): string {
  const shifted = new Date(now);
  shifted.setHours(
    shifted.getHours() - resetHour,
    shifted.getMinutes(),
    shifted.getSeconds(),
    shifted.getMilliseconds(),
  );
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function notifyPhaseEnd(nextMode: Mode): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const label = nextMode === "break" ? "Break ready" : "Work ready";
  new Notification(`Pomodoro: ${label}`, {
    body: "Open the timer to start the next phase.",
    silent: true,
  });
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>(DTS.mode);
  const [status, setStatus] = useState<Status>(DTS.status);
  const [remainingSeconds, setRemainingSeconds] = useState(DTS.remainingSeconds);
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(DTS.sessionsCompletedToday);
  const [sessionsCompletedDayId, setSessionsCompletedDayId] = useState(DTS.sessionsCompletedDayId);
  const [dailyResetHour] = useState(DTS.dailyResetHour);

  const [hydrated, setHydrated] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  const navigate = useNavigate();
  const { workMinutes, breakMinutes, soundEnabled, notificationsEnabled, mini, setMini } = usePomodoroSettings();

  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ringSize = mini ? MINI_RING_SIZE : DEFAULT_RING_SIZE;
  const iconClassName = mini ? "size-8 stroke-2" : "size-12 stroke-2";

  const { radius, center, circumference } = ringGeometry(ringSize);

  // Resize the window to match mini vs full mode.
  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    const isMini = mini;
    win
      .setSize(new LogicalSize(isMini ? MINI_WINDOW_WIDTH : WINDOW_WIDTH, isMini ? MINI_WINDOW_HEIGHT : WINDOW_HEIGHT))
      .catch(() => undefined);
  }, [mini]);

  const phaseMaxSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;
  const fraction = phaseMaxSeconds > 0 ? remainingSeconds / phaseMaxSeconds : 0;
  const remainingFraction = Math.max(0, Math.min(1, fraction));

  const ringColor = mode === "work" ? COLORS.work : COLORS.break;

  const alignCountToDay = useCallback(
    (count: number, dayId: string): { count: number; dayId: string } => {
      const nextDayId = getDayId(new Date(), dailyResetHour);
      if (dayId === nextDayId) {
        return { count, dayId };
      }
      return { count: 0, dayId: nextDayId };
    },
    [dailyResetHour],
  );

  const transitionToNextPhase = useCallback(
    (fromMode: Mode) => {
      const nextMode: Mode = fromMode === "work" ? "break" : "work";

      setMode(nextMode);
      setStatus("idle");
      setRemainingSeconds(nextMode === "work" ? workMinutes * 60 : breakMinutes * 60);

      if (fromMode === "work") {
        setSessionsCompletedToday((prevCount) => {
          const aligned = alignCountToDay(prevCount, sessionsCompletedDayId);
          setSessionsCompletedDayId(aligned.dayId);
          return aligned.count + 1;
        });
      }

      if (soundEnabled) {
        playSoftChime();
      }

      if (notificationsEnabled) {
        notifyPhaseEnd(nextMode);
      }
    },
    [breakMinutes, sessionsCompletedDayId, notificationsEnabled, alignCountToDay, soundEnabled, workMinutes],
  );

  // Persist current state to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    const aligned = alignCountToDay(sessionsCompletedToday, sessionsCompletedDayId);
    const snapshot: TimerState = {
      mode,
      status,
      remainingSeconds,
      sessionsCompletedToday: aligned.count,
      sessionsCompletedDayId: aligned.dayId,
      dailyResetHour,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    mode,
    status,
    remainingSeconds,
    sessionsCompletedToday,
    sessionsCompletedDayId,
    dailyResetHour,
    hydrated,
    alignCountToDay,
  ]);

  // Restore the persisted snapshot from localStorage on mount.
  // Hook's dependencies are effectively stable, so expected to run once, on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId = 0;
    const schedule = (fn: () => void) => {
      rafId = window.requestAnimationFrame(fn);
    };

    const raw = window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
    const dayId = getDayId(new Date(), dailyResetHour);

    if (!raw) {
      schedule(() => {
        setSessionsCompletedDayId(dayId);
        setHydrated(true);
      });
      return () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
      };
    }

    try {
      const parsed = JSON.parse(raw) as TimerState;
      const restoredWork = workMinutes;
      const restoredBreak = breakMinutes;
      const restoredMode: Mode = parsed.mode === "break" ? "break" : "work";
      const restoredStatus: Status = parsed.status === "running" || parsed.status === "paused" ? parsed.status : "idle";
      const maxSeconds = (restoredMode === "work" ? restoredWork : restoredBreak) * 60;

      let restoredCount = Number.isFinite(parsed.sessionsCompletedToday) ? parsed.sessionsCompletedToday : 0;
      let restoredDayId = typeof parsed.sessionsCompletedDayId === "string" ? parsed.sessionsCompletedDayId : dayId;

      if (restoredDayId !== dayId) {
        restoredCount = 0;
        restoredDayId = dayId;
      }

      let restoredRemaining = clampRemaining(
        parsed.remainingSeconds ?? maxSeconds,
        restoredStatus === "running",
        maxSeconds,
      );

      if (restoredStatus === "running") {
        const elapsed = Math.floor((Date.now() - (parsed.updatedAt ?? Date.now())) / 1000);
        restoredRemaining = restoredRemaining - Math.max(0, elapsed);

        if (restoredRemaining <= 0) {
          const nextMode: Mode = restoredMode === "work" ? "break" : "work";
          if (restoredMode === "work") {
            restoredCount += 1;
          }

          schedule(() => {
            setMode(nextMode);
            setStatus("idle");
            setRemainingSeconds((nextMode === "work" ? restoredWork : restoredBreak) * 60);
            setSessionsCompletedToday(restoredCount);
            setSessionsCompletedDayId(restoredDayId);
            setHydrated(true);
          });
          return () => {
            if (rafId) {
              window.cancelAnimationFrame(rafId);
            }
          };
        }
      }

      schedule(() => {
        setMode(restoredMode);
        setStatus(restoredStatus);
        setRemainingSeconds(restoredRemaining);
        setSessionsCompletedToday(restoredCount);
        setSessionsCompletedDayId(restoredDayId);
        setHydrated(true);
      });
    } catch {
      schedule(() => {
        setSessionsCompletedDayId(dayId);
        setHydrated(true);
      });
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [breakMinutes, dailyResetHour, workMinutes]);

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

  // Toggle run/pause on Space, ignoring form inputs.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      event.preventDefault();

      if (status === "running") {
        setStatus("paused");
      } else if (status === "paused") {
        setStatus("running");
      } else {
        if (remainingSeconds <= 0) {
          setRemainingSeconds(phaseMaxSeconds);
        }
        setStatus("running");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phaseMaxSeconds, remainingSeconds, status]);

  const progressOffset = useMemo(() => {
    return circumference * (1 - remainingFraction);
  }, [circumference, remainingFraction]);

  const knobPosition = useMemo(() => {
    const elapsedFraction = 1 - remainingFraction;
    const angle = -elapsedFraction * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }, [center, radius, remainingFraction]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const dx = x - center;
      const dy = y - center;

      const raw = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Match drag direction to the anchor/ring orientation (top -> left -> bottom -> right).
      const counterClockwiseFromTop = (270 - raw + 360) % 360;

      const elapsedFraction = counterClockwiseFromTop / 360;
      const nextRemaining = (1 - elapsedFraction) * phaseMaxSeconds;
      const rounded = Math.round(nextRemaining);

      setRemainingSeconds(clampRemaining(rounded, status === "running", phaseMaxSeconds));
    },
    [center, phaseMaxSeconds, status],
  );

  const onDragStart = (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    (event.currentTarget as SVGCircleElement).setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateFromPointer(event.clientX, event.clientY);
  };

  const onDragMove = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDragging) return;
    updateFromPointer(event.clientX, event.clientY);
  };

  const onDragEnd = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDragging) return;
    (event.currentTarget as SVGCircleElement).releasePointerCapture(event.pointerId);
    setIsDragging(false);
    updateFromPointer(event.clientX, event.clientY);
  };

  const toggleRunState = () => {
    if (status === "running") {
      setStatus("paused");
      return;
    }

    if (remainingSeconds <= 0) {
      setRemainingSeconds(phaseMaxSeconds);
    }

    setStatus("running");
  };

  const handleSkip = () => {
    setSkipConfirmOpen(true);
  };

  const confirmSkip = () => {
    setSkipConfirmOpen(false);
    transitionToNextPhase(mode);
  };

  const modeLabel = mode === "work" ? "Focused Work" : "Break";
  const centerAction = status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start";

  return (
    <div className="relative p-4">
      <p
        data-testid="mode-label"
        className={cn(
          "mt-1 mb-4 w-full text-center text-lg font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400",
          mini && "hidden",
        )}
      >
        {modeLabel}
      </p>

      <button
        type="button"
        onClick={handleSkip}
        data-testid="skip-button"
        aria-label="Skip current phase"
        title="Skip"
        className={cn(
          "pointer-events-auto absolute top-12 right-4 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-300 dark:hover:text-zinc-100",
          mini && "hidden",
        )}
      >
        <SkipControlIcon className="size-5" />
      </button>

      <div className="relative mt-1 flex items-center justify-center">
        <svg
          ref={svgRef}
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          role="img"
          aria-label={`Time remaining ${formatClock(remainingSeconds)}`}
          className="overflow-visible"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(120, 120, 120, 0.45)"
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className={isDragging ? "" : "transition-[stroke-dashoffset] duration-700 ease-linear"}
          />
          <circle
            cx={knobPosition.x}
            cy={knobPosition.y}
            r={mini ? 8 : 10}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH * 0.8}
            data-testid="drag-knob"
            aria-label="Drag timer handle"
            role="slider"
            aria-valuenow={remainingFraction}
            className="cursor-grab fill-amber-50 active:cursor-grabbing dark:fill-zinc-700"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <p
            data-testid="time-display"
            className={cn(
              "absolute top-1/2 left-1/2 w-[5ch] -translate-x-1/2 translate-y-[-60%] text-center leading-none font-light tabular-nums",
              mini ? "text-4xl" : "text-6xl",
            )}
            style={{
              color: ringColor,
            }}
          >
            {formatClock(remainingSeconds)}
          </p>
          <button
            type="button"
            onClick={toggleRunState}
            data-testid="center-control"
            className="pointer-events-auto absolute top-1/2 left-1/2 flex h-45 w-45 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
            style={{ color: ringColor }}
            aria-label={`${centerAction} timer`}
          >
            <span className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2">
              {status === "running" ? (
                <PauseControlIcon className={iconClassName} />
              ) : (
                <PlayControlIcon className={iconClassName} />
              )}
            </span>
          </button>
        </div>
      </div>

      <PomodoroSkipConfirmDialog open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen} onConfirm={confirmSkip} />

      {!mini && (
        <div className="mt-4 flex w-full items-center justify-between">
          <div className="flex rounded-full border border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <p data-testid="completed-count" className="text-sm text-zinc-600 dark:text-zinc-300">
              Completed today: {sessionsCompletedToday}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            data-testid="settings-open-button"
            aria-label="Open settings"
            className="pointer-events-auto cursor-pointer rounded-full border border-zinc-300 p-1.5 hover:border-zinc-500 dark:border-zinc-600 dark:hover:border-zinc-300"
          >
            <SettingsCogIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {mini && (
        <div className="mt-4 flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => setMini(false)}
            data-testid="exit-mini-mode-button"
            aria-label="Exit mini mode"
            title="Exit mini mode"
            className="pointer-events-auto size-10 cursor-pointer rounded-full text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <ExpandIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
