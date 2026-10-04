import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PauseControlIcon } from "@/components/icons/pause-icon";
import { PlayControlIcon } from "@/components/icons/play-icon";
import { SettingsCogIcon } from "@/components/icons/settings-cog-icon";
import { SkipControlIcon } from "@/components/icons/skip-icon";
import { PomodoroSkipConfirmDialog } from "@/components/pomodoro-skip-confirm-dialog";
import { COLORS, CONTROL_CLASS, RING_SIZE, STROKE_WIDTH } from "@/constants/pomodoro";
import { usePomodoroTimer } from "@/hooks/use-pomodoro-timer";
import { useRingDrag } from "@/hooks/use-ring-drag";
import { useSpacebarToggle } from "@/hooks/use-spacebar-toggle";
import { getKnobPosition, getProgressOffset, getRemainingFraction, getRingGeometry } from "@/utils/ring";
import { formatClock } from "@/utils/time";

import type { Mode, Status } from "@/types/pomodoro";

function getModeLabel(mode: Mode): string {
  return mode === "work" ? "Focused Work" : "Break";
}

function getCenterAction(status: Status): string {
  return status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start";
}

export function PomodoroTimer() {
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  const navigate = useNavigate();

  const { mode, status, remainingSeconds, sessionsCompletedToday, phaseMaxSeconds, setRemainingSeconds, toggle, skip } =
    usePomodoroTimer();

  const { radius, center, circumference } = getRingGeometry(RING_SIZE);
  const remainingFraction = getRemainingFraction(remainingSeconds, phaseMaxSeconds);

  const { isDragging, svgRef, onDragStart, onDragMove, onDragEnd } = useRingDrag({
    center,
    phaseMaxSeconds,
    status,
    setRemainingSeconds,
  });

  const ringColor = mode === "work" ? COLORS.work : COLORS.break;

  const progressOffset = useMemo(() => {
    return getProgressOffset(circumference, remainingFraction);
  }, [circumference, remainingFraction]);

  const knobPosition = useMemo(() => {
    return getKnobPosition(center, radius, remainingFraction);
  }, [center, radius, remainingFraction]);

  useSpacebarToggle(toggle);

  const handleSkip = () => {
    setSkipConfirmOpen(true);
  };

  const confirmSkip = () => {
    setSkipConfirmOpen(false);
    skip();
  };

  return (
    <div className="relative h-full p-4">
      <p
        data-testid="mode-label"
        className="mt-1 mb-4 w-full text-center text-lg font-semibold tracking-wide text-zinc-400 uppercase"
      >
        {getModeLabel(mode)}
      </p>

      <button
        type="button"
        onClick={handleSkip}
        data-testid="skip-button"
        aria-label="Skip current phase"
        title="Skip"
        className="pointer-events-auto absolute top-12 right-4 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full border border-zinc-600 text-zinc-300 transition-colors hover:border-zinc-300 hover:text-zinc-100"
      >
        <SkipControlIcon className="size-5" />
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
            r={10}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH * 0.8}
            data-testid="drag-knob"
            aria-label="Drag timer handle"
            role="slider"
            aria-valuenow={remainingFraction}
            className="cursor-grab fill-zinc-700 active:cursor-grabbing"
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
            }}
          >
            {formatClock(remainingSeconds)}
          </p>
          <button
            type="button"
            onClick={toggle}
            data-testid="center-control"
            className="pointer-events-auto absolute top-1/2 left-1/2 flex h-45 w-45 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
            style={{ color: ringColor }}
            aria-label={`${getCenterAction(status)} timer`}
          >
            <span className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2">
              {status === "running" ? (
                <PauseControlIcon className={CONTROL_CLASS} />
              ) : (
                <PlayControlIcon className={CONTROL_CLASS} />
              )}
            </span>
          </button>
        </div>
      </div>

      <PomodoroSkipConfirmDialog open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen} onConfirm={confirmSkip} />

      <div className="absolute right-4 bottom-4 mt-4 flex w-full items-center justify-between pl-8">
        <div className="flex rounded-full border border-zinc-600 px-3 py-2">
          <p data-testid="completed-count" className="text-sm text-zinc-300">
            Completed today: {sessionsCompletedToday}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          data-testid="settings-open-button"
          aria-label="Open settings"
          className="pointer-events-auto cursor-pointer rounded-full border border-zinc-600 p-2.5 hover:border-zinc-300"
        >
          <SettingsCogIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
