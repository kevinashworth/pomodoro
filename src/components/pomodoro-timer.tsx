"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PauseControlIcon } from "@/components/icons/pause-icon";
import {
  MAX_MINUTES,
  MIN_MINUTES,
  PRESETS,
  RING_SIZE,
  STORAGE_KEY,
  STROKE_WIDTH,
} from "@/constants/pomodoro";
import { PomodoroSkipConfirmDialog } from "@/components/pomodoro-skip-confirm-dialog";
import {
  type AccentPreset,
  type Mode,
  type PersistedState,
  type Status,
} from "@/types/pomodoro";
import { PlayControlIcon } from "@/components/icons/play-icon";
import { PomodoroSettingsDialog } from "@/components/pomodoro-settings-dialog";
import { SettingsCogIcon } from "@/components/icons/settings-cog-icon";
import { SkipForwardIcon } from "@/components/icons/skip-forward-icon";
import cn from "@/utils/cn";
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CENTER = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clampMinutes(value: number): number {
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, value));
}

function clampRemaining(
  seconds: number,
  running: boolean,
  maxSeconds: number,
): number {
  const min = running ? 1 : 0;
  return Math.max(min, Math.min(maxSeconds, seconds));
}

function getDayKey(now: Date, resetHour: number): string {
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

function playSoftChime(): void {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;
  const audioContext = new AudioCtx();
  const now = audioContext.currentTime;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(784, now);
  osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.28);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 0.34);

  setTimeout(() => {
    void audioContext.close();
  }, 420);
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
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<Mode>("work");
  const [status, setStatus] = useState<Status>("idle");
  const [workMinutes, setWorkMinutes] = useState(20);
  const [breakMinutes, setBreakMinutes] = useState(6);
  const [remainingSeconds, setRemainingSeconds] = useState(20 * 60);
  const [completedToday, setCompletedToday] = useState(0);
  const [completedDayKey, setCompletedDayKey] = useState("");
  const [dailyResetHour] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [accentPreset, setAccentPreset] = useState<AccentPreset>("classic");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const phaseMaxSeconds =
    mode === "work" ? workMinutes * 60 : breakMinutes * 60;
  const fraction = phaseMaxSeconds > 0 ? remainingSeconds / phaseMaxSeconds : 0;
  const remainingFraction = Math.max(0, Math.min(1, fraction));

  const currentColors = PRESETS[accentPreset];
  const ringColor = mode === "work" ? currentColors.work : currentColors.break;

  const resetIfNeeded = useCallback(
    (count: number, key: string): { count: number; key: string } => {
      const nextKey = getDayKey(new Date(), dailyResetHour);
      if (key === nextKey) {
        return { count, key };
      }
      return { count: 0, key: nextKey };
    },
    [dailyResetHour],
  );

  const transitionToNextPhase = useCallback(
    (fromMode: Mode, triggeredBySkip: boolean) => {
      const nextMode: Mode = fromMode === "work" ? "break" : "work";

      setMode(nextMode);
      setStatus("idle");
      setRemainingSeconds(
        nextMode === "work" ? workMinutes * 60 : breakMinutes * 60,
      );

      if (fromMode === "work") {
        setCompletedToday((prevCount) => {
          const normalized = resetIfNeeded(prevCount, completedDayKey);
          setCompletedDayKey(normalized.key);
          return normalized.count + 1;
        });
      }

      if (soundEnabled) {
        playSoftChime();
      }

      if (notificationsEnabled) {
        notifyPhaseEnd(nextMode);
      }

      if (triggeredBySkip) {
        setSettingsOpen(false);
      }
    },
    [
      breakMinutes,
      completedDayKey,
      notificationsEnabled,
      resetIfNeeded,
      soundEnabled,
      workMinutes,
    ],
  );

  const saveSnapshot = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;

    const normalized = resetIfNeeded(completedToday, completedDayKey);
    const snapshot: PersistedState = {
      mode,
      status,
      remainingSeconds,
      workMinutes,
      breakMinutes,
      completedToday: normalized.count,
      completedDayKey: normalized.key,
      dailyResetHour,
      soundEnabled,
      notificationsEnabled,
      accentPreset,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    accentPreset,
    breakMinutes,
    completedDayKey,
    completedToday,
    dailyResetHour,
    hydrated,
    mode,
    notificationsEnabled,
    remainingSeconds,
    resetIfNeeded,
    soundEnabled,
    status,
    workMinutes,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId = 0;
    const schedule = (fn: () => void) => {
      rafId = window.requestAnimationFrame(fn);
    };

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const dayKey = getDayKey(new Date(), dailyResetHour);

    if (!raw) {
      schedule(() => {
        setCompletedDayKey(dayKey);
        setHydrated(true);
      });
      return () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
      };
    }

    try {
      const parsed = JSON.parse(raw) as PersistedState;
      const restoredWork = clampMinutes(parsed.workMinutes ?? 20);
      const restoredBreak = clampMinutes(parsed.breakMinutes ?? 6);
      const restoredMode: Mode = parsed.mode === "break" ? "break" : "work";
      const restoredStatus: Status =
        parsed.status === "running" || parsed.status === "paused"
          ? parsed.status
          : "idle";
      const maxSeconds =
        (restoredMode === "work" ? restoredWork : restoredBreak) * 60;

      let restoredCount = Number.isFinite(parsed.completedToday)
        ? parsed.completedToday
        : 0;
      let restoredDayKey =
        typeof parsed.completedDayKey === "string"
          ? parsed.completedDayKey
          : dayKey;

      if (restoredDayKey !== dayKey) {
        restoredCount = 0;
        restoredDayKey = dayKey;
      }

      let restoredRemaining = clampRemaining(
        parsed.remainingSeconds ?? maxSeconds,
        restoredStatus === "running",
        maxSeconds,
      );

      if (restoredStatus === "running") {
        const elapsed = Math.floor(
          (Date.now() - (parsed.updatedAt ?? Date.now())) / 1000,
        );
        restoredRemaining = restoredRemaining - Math.max(0, elapsed);

        if (restoredRemaining <= 0) {
          const nextMode: Mode = restoredMode === "work" ? "break" : "work";
          if (restoredMode === "work") {
            restoredCount += 1;
          }

          schedule(() => {
            setMode(nextMode);
            setStatus("idle");
            setWorkMinutes(restoredWork);
            setBreakMinutes(restoredBreak);
            setRemainingSeconds(
              (nextMode === "work" ? restoredWork : restoredBreak) * 60,
            );
            setCompletedToday(restoredCount);
            setCompletedDayKey(restoredDayKey);
            setSoundEnabled(parsed.soundEnabled ?? true);
            setNotificationsEnabled(parsed.notificationsEnabled ?? false);
            setAccentPreset(parsed.accentPreset ?? "classic");
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
        setWorkMinutes(restoredWork);
        setBreakMinutes(restoredBreak);
        setRemainingSeconds(restoredRemaining);
        setCompletedToday(restoredCount);
        setCompletedDayKey(restoredDayKey);
        setSoundEnabled(parsed.soundEnabled ?? true);
        setNotificationsEnabled(parsed.notificationsEnabled ?? false);
        setAccentPreset(parsed.accentPreset ?? "classic");
        setHydrated(true);
      });
    } catch {
      schedule(() => {
        setCompletedDayKey(dayKey);
        setHydrated(true);
      });
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [dailyResetHour]);

  useEffect(() => {
    if (!hydrated) return;

    const timer = window.setInterval(() => {
      const dayKey = getDayKey(new Date(), dailyResetHour);
      setCompletedDayKey((prevKey) => {
        if (prevKey === dayKey) {
          return prevKey;
        }
        setCompletedToday(0);
        return dayKey;
      });
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [dailyResetHour, hydrated]);

  useEffect(() => {
    if (status !== "running") return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          transitionToNextPhase(mode, false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [mode, status, transitionToNextPhase]);

  useEffect(() => {
    saveSnapshot();
  }, [saveSnapshot]);

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
    return CIRCUMFERENCE * (1 - remainingFraction);
  }, [remainingFraction]);

  const knobPosition = useMemo(() => {
    const elapsedFraction = 1 - remainingFraction;
    const angle = -elapsedFraction * Math.PI * 2 - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  }, [remainingFraction]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const dx = x - CENTER;
      const dy = y - CENTER;

      const raw = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Match drag direction to the anchor/ring orientation (top -> left -> bottom -> right).
      const counterClockwiseFromTop = (270 - raw + 360) % 360;

      const elapsedFraction = counterClockwiseFromTop / 360;
      const nextRemaining = (1 - elapsedFraction) * phaseMaxSeconds;
      const rounded = Math.round(nextRemaining);

      setRemainingSeconds(
        clampRemaining(rounded, status === "running", phaseMaxSeconds),
      );
    },
    [phaseMaxSeconds, status],
  );

  const onDragStart = (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    (event.currentTarget as SVGCircleElement).setPointerCapture(
      event.pointerId,
    );
    setIsDragging(true);
    updateFromPointer(event.clientX, event.clientY);
  };

  const onDragMove = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDragging) return;
    updateFromPointer(event.clientX, event.clientY);
  };

  const onDragEnd = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDragging) return;
    (event.currentTarget as SVGCircleElement).releasePointerCapture(
      event.pointerId,
    );
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

  const updateDefaultMinutes = (target: Mode, minutes: number) => {
    const clamped = clampMinutes(minutes);
    if (target === "work") {
      setWorkMinutes(clamped);
      if (mode === "work" && status === "idle") {
        setRemainingSeconds(clamped * 60);
      }
      return;
    }

    setBreakMinutes(clamped);
    if (mode === "break" && status === "idle") {
      setRemainingSeconds(clamped * 60);
    }
  };

  const handleSkip = () => {
    setSkipConfirmOpen(true);
  };

  const confirmSkip = () => {
    setSkipConfirmOpen(false);
    transitionToNextPhase(mode, true);
  };

  const toggleNotifications = async (nextValue: boolean) => {
    if (!nextValue) {
      setNotificationsEnabled(false);
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationsEnabled(false);
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  };

  const modeLabel = mode === "work" ? "Work" : "Break";
  const centerAction =
    status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start";

  return (
    <div className="relative mx-auto flex min-h-90 w-70 flex-col items-center rounded-4xl border border-zinc-200/90 bg-white/78 px-4 pt-4 pb-5 shadow-2xl dark:border-zinc-600/70 dark:bg-zinc-900/62">
      <p
        data-testid="mode-label"
        className="mt-1 mb-4 w-full text-center text-lg font-semibold tracking-wide text-zinc-500 uppercase"
      >
        {modeLabel}
      </p>

      <button
        type="button"
        onClick={handleSkip}
        data-testid="skip-button"
        aria-label="Skip current phase"
        className="pointer-events-auto absolute top-12 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-transform duration-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        <SkipForwardIcon className="h-6 w-6" />
      </button>

      <div className="relative mt-1 flex items-center justify-center">
        <svg
          ref={svgRef}
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          role="img"
          aria-label={`Time remaining ${formatClock(remainingSeconds)}`}
          className="overflow-visible"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="transparent"
            stroke="rgba(120, 120, 120, 0.45)"
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={progressOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className={
              isDragging
                ? ""
                : "transition-[stroke-dashoffset] duration-700 ease-linear"
            }
          />
          <circle
            cx={knobPosition.x}
            cy={knobPosition.y}
            r={10}
            fill="white"
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH * 0.8}
            data-testid="drag-knob"
            aria-label="Drag timer handle"
            role="slider"
            aria-valuenow={remainingFraction}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <p
            data-testid="time-display"
            className="absolute top-1/2 left-1/2 w-[5ch] -translate-x-1/2 translate-y-[-60%] text-center text-6xl leading-none font-light tabular-nums"
            style={{
              color: ringColor,
              textShadow: `0 0 24px ${currentColors.glow}`,
            }}
          >
            {hydrated ? formatClock(remainingSeconds) : "20:00"}
          </p>
          <button
            type="button"
            onClick={toggleRunState}
            data-testid="center-control"
            className="pointer-events-auto absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
            style={{ color: ringColor }}
            aria-label={`${centerAction} timer`}
          >
            {status === "running" ? (
              <PauseControlIcon className="size-12 stroke-2" />
            ) : (
              <PlayControlIcon className="size-12 stroke-2" />
            )}
          </button>
        </div>
      </div>

      <PomodoroSkipConfirmDialog
        open={skipConfirmOpen}
        onOpenChange={setSkipConfirmOpen}
        onConfirm={confirmSkip}
      />

      <div className="mt-4 flex w-full items-center justify-between rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        <p data-testid="completed-count">Completed today: {completedToday}</p>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          data-testid="settings-open-button"
          aria-expanded={settingsOpen}
          aria-controls="pomodoro-settings"
          aria-label="Open settings"
          className="pointer-events-auto cursor-pointer rounded-full border border-zinc-300 p-1.5 hover:border-zinc-500 dark:border-zinc-600 dark:hover:border-zinc-300"
        >
          <SettingsCogIcon
            className={cn("h-4 w-4 transition-transform duration-200", {
              "rotate-45": settingsOpen,
              "rotate-0": !settingsOpen,
            })}
          />
        </button>
      </div>

      <PomodoroSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workMinutes={workMinutes}
        breakMinutes={breakMinutes}
        onWorkMinutesChange={(minutes) => updateDefaultMinutes("work", minutes)}
        onBreakMinutesChange={(minutes) =>
          updateDefaultMinutes("break", minutes)
        }
        accentPreset={accentPreset}
        onAccentPresetChange={setAccentPreset}
        soundEnabled={soundEnabled}
        onSoundEnabledChange={setSoundEnabled}
        notificationsEnabled={notificationsEnabled}
        onNotificationsEnabledChange={toggleNotifications}
      />
    </div>
  );
}
