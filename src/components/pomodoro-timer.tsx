import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Button, { type ButtonVariant } from "@/components/button";
import ButtonGroup from "@/components/button-group";
import { SettingsCogIcon } from "@/components/icons/settings-cog-icon";
import { RING_SIZE, STROKE_WIDTH } from "@/constants/pomodoro";
import { useAnimatedRemainingSeconds } from "@/hooks/use-animated-remaining-seconds";
import { usePomodoroTimer } from "@/hooks/use-pomodoro-timer";
import { useRingDrag } from "@/hooks/use-ring-drag";
import { useSpacebarToggle } from "@/hooks/use-spacebar-toggle";
import cn from "@/utils/cn";
import { getKnobPosition, getProgressOffset, getRemainingFraction, getRingGeometry } from "@/utils/ring";
import { formatClock } from "@/utils/time";

import type { Mode, Status } from "@/types/pomodoro";

const modeMap: Record<Mode, string> = {
  work: "Focused Work",
  break: "Break",
};

const statusMap: Record<Status, { actionLabel: string; stroke: string; variant: ButtonVariant }> = {
  idle: { actionLabel: "Start", variant: "green", stroke: "stroke-green-500" },
  running: { actionLabel: "Pause", variant: "orange", stroke: "stroke-orange-500" },
  paused: { actionLabel: "Resume", variant: "green", stroke: "stroke-green-500" },
};

function getActionButtonVariant(status: Status): ButtonVariant {
  return statusMap[status].variant;
}

function getActionButtonLabel(status: Status): string {
  return statusMap[status].actionLabel;
}

function getModeLabel(mode: Mode): string {
  return modeMap[mode];
}

function getRingColor(status: Status): string {
  return statusMap[status].stroke;
}

export function PomodoroTimer() {
  const navigate = useNavigate();

  const {
    mode,
    status,
    remainingSeconds,
    sessionsCompletedToday,
    phaseMaxSeconds,
    setRemainingSeconds,
    reset,
    skip,
    toggle,
  } = usePomodoroTimer();
  useSpacebarToggle(toggle);

  const { radius, center, circumference } = getRingGeometry(RING_SIZE);

  const { isDragging, svgRef, onDragStart, onDragMove, onDragEnd } = useRingDrag({
    center,
    phaseMaxSeconds,
    status,
    setRemainingSeconds,
  });

  const visualRemainingSeconds = useAnimatedRemainingSeconds(
    remainingSeconds,
    status,
    mode,
    phaseMaxSeconds,
    isDragging,
  );
  const remainingFraction = getRemainingFraction(visualRemainingSeconds, phaseMaxSeconds);

  const progressOffset = useMemo(() => {
    return getProgressOffset(circumference, remainingFraction);
  }, [circumference, remainingFraction]);

  const knobPosition = useMemo(() => {
    return getKnobPosition(center, radius, remainingFraction);
  }, [center, radius, remainingFraction]);

  const handleKnobKeyDown = (event: React.KeyboardEvent<SVGCircleElement>) => {
    const minimumSeconds = status === "running" ? 1 : 0;
    const stepSeconds = Math.max(1, Math.round(phaseMaxSeconds / 100));
    let nextRemainingSeconds: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        nextRemainingSeconds = remainingSeconds + stepSeconds;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        nextRemainingSeconds = remainingSeconds - stepSeconds;
        break;
      case "Home":
        nextRemainingSeconds = phaseMaxSeconds;
        break;
      case "End":
        nextRemainingSeconds = minimumSeconds;
        break;
      default:
        return;
    }

    event.preventDefault();
    setRemainingSeconds(Math.min(phaseMaxSeconds, Math.max(minimumSeconds, nextRemainingSeconds)));
  };

  const cancelButton = useMemo(() => {
    const isHalfway = remainingSeconds < phaseMaxSeconds / 2;

    if (status === "running" || status === "paused") {
      return {
        label: isHalfway ? "Skip" : "Reset",
        onClick: isHalfway ? skip : reset,
      };
    }

    return {
      label: "Cancel",
      onClick: reset,
    };
  }, [phaseMaxSeconds, remainingSeconds, reset, skip, status]);

  return (
    <div className="relative h-full p-4">
      <p
        data-testid="mode-label"
        className="mt-1 mb-4 w-full text-center text-lg font-semibold tracking-wide text-zinc-400 uppercase"
      >
        {getModeLabel(mode)}
      </p>

      <div className="relative mt-1 flex items-center justify-center">
        <svg
          ref={svgRef}
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          role="group"
          aria-label={`Time remaining ${formatClock(remainingSeconds)}`}
          className={cn("overflow-visible", getRingColor(status))}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={STROKE_WIDTH}
            className="stroke-zinc-500"
            data-testid="ring-ring"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            transform={`rotate(-90 ${center} ${center})`}
            data-testid="ring-progress"
          />
          <circle
            cx={knobPosition.x}
            cy={knobPosition.y}
            r={10}
            strokeWidth={STROKE_WIDTH * 0.8}
            onKeyDown={handleKnobKeyDown}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            aria-label="Adjust time remaining"
            aria-valuemin={status === "running" ? 1 : 0}
            aria-valuemax={phaseMaxSeconds}
            aria-valuenow={remainingSeconds}
            aria-valuetext={formatClock(remainingSeconds)}
            className="cursor-grab fill-zinc-700 active:cursor-grabbing"
            data-testid="drag-knob"
            role="slider"
            tabIndex={0}
          />
          <text
            x={center}
            y={center}
            dominantBaseline="central"
            fontSize={60}
            textAnchor="middle"
            className="fill-zinc-100 stroke-zinc-100 font-light tabular-nums"
            data-testid="time-display"
          >
            {formatClock(remainingSeconds)}
          </text>
        </svg>
      </div>

      <div className="flex justify-center py-4">
        <ButtonGroup>
          <Button
            variant="dark"
            disabled={status !== "paused"}
            onClick={cancelButton.onClick}
            data-testid="cancel-button"
          >
            {cancelButton.label}
          </Button>
          <Button onClick={toggle} variant={getActionButtonVariant(status)} data-testid="action-button">
            {getActionButtonLabel(status)}
          </Button>
        </ButtonGroup>
      </div>

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
