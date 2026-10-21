import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/button";
import ButtonGroup from "@/components/button-group";
import SettingsIcon from "@/components/icons/settings";
import SkipBackwardIcon from "@/components/icons/skip-backward";
import SkipForwardIcon from "@/components/icons/skip-forward";
import { RING_SIZE, STROKE_WIDTH } from "@/constants/pomodoro";
import { usePomodoroTimer } from "@/context/pomodoro-timer";
import TimerInput from "@/components/timer-inputs/timer-input";
import { useAnimatedRemainingSeconds } from "@/hooks/use-animated-remaining-seconds";
import { useRingDrag } from "@/hooks/use-ring-drag";
import { useSpacebarToggle } from "@/hooks/use-spacebar-toggle";
import cn from "@/utils/cn";
import { getKnobPosition, getProgressOffset, getRemainingFraction, getRingGeometry } from "@/utils/ring";
import { formatClock } from "@/utils/time";
import { resolveTimerPresentation } from "@/utils/timer-presentation";

export function PomodoroTimer() {
  const navigate = useNavigate();

  const {
    mode,
    status,
    isEditingDuration,
    remainingSeconds,
    sessionsCompletedToday,
    phaseMaxSeconds,
    minRemainingSeconds,
    setRemainingSeconds,
    toggleDurationEditing,
    reset,
    skip,
    toggleRunning,
  } = usePomodoroTimer();
  useSpacebarToggle(toggleRunning);

  const [knobRadius, setKnobRadius] = useState<number | undefined>(undefined);

  function handleDoubleClick() {
    if (status !== "running") {
      toggleDurationEditing();
    }
  }

  function handleSVGPointerEnter() {
    setKnobRadius(6);
  }

  function handleSVGPointerLeave() {
    setKnobRadius(2);
  }

  function handleKnobPointerEnter() {
    setKnobRadius(16);
  }

  function handleKnobPointerLeave() {
    setKnobRadius(8);
  }

  const presentation = resolveTimerPresentation({ mode, status, remainingSeconds, phaseMaxSeconds });
  const secondaryActionIcon =
    presentation.secondaryAction.icon === "skip-backward" ? (
      <SkipBackwardIcon className="size-5" />
    ) : (
      <SkipForwardIcon className="size-5" />
    );

  function handlePrimaryAction() {
    if (status !== "running" && isEditingDuration) {
      toggleDurationEditing();
    }
    toggleRunning();
  }

  const handleSecondaryAction = presentation.secondaryAction.command === "skip" ? skip : reset;

  const { radius, center, circumference } = getRingGeometry(RING_SIZE);

  const { isDragging, svgRef, onDragStart, onDragMove, onDragEnd } = useRingDrag({
    center,
    phaseMaxSeconds,
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
    const minimumSeconds = minRemainingSeconds;
    const stepSeconds = Math.max(1, Math.round(phaseMaxSeconds / 100));
    let nextRemainingSeconds: number;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        nextRemainingSeconds = remainingSeconds + stepSeconds;
        break;
      case "ArrowRight":
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
    setRemainingSeconds(nextRemainingSeconds);
  };

  return (
    <div className="relative h-full p-4">
      <p className="m-1 mb-4 w-full text-center text-lg font-semibold text-zinc-200 uppercase" data-testid="mode-label">
        {presentation.modeLabel}
      </p>

      <div
        className="flex justify-center overflow-visible"
        onPointerLeave={handleSVGPointerLeave}
        onPointerEnter={handleSVGPointerEnter}
      >
        <div
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
          }}
        >
          {isEditingDuration ? (
            <TimerInput remainingSeconds={remainingSeconds} setRemainingSeconds={setRemainingSeconds} />
          ) : (
            <svg
              ref={svgRef}
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              role="group"
              aria-label={`Time remaining ${formatClock(remainingSeconds)}`}
              className="overflow-visible"
              fill="transparent"
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={STROKE_WIDTH}
                className="stroke-zinc-600"
                data-testid="ring-ring"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                transform={`rotate(-90 ${center} ${center})`}
                className={cn("stroke-current", presentation.svgAccentClassName)}
                data-testid="ring-progress"
              />
              <circle
                cx={knobPosition.x}
                cy={knobPosition.y}
                r={knobRadius}
                onKeyDown={handleKnobKeyDown}
                onFocus={handleKnobPointerEnter}
                onBlur={handleKnobPointerLeave}
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                onPointerEnter={handleKnobPointerEnter}
                onPointerLeave={handleKnobPointerLeave}
                aria-label="Adjust time remaining"
                aria-valuemin={minRemainingSeconds}
                aria-valuemax={phaseMaxSeconds}
                aria-valuenow={remainingSeconds}
                aria-valuetext={formatClock(remainingSeconds)}
                className={cn(
                  "cursor-grab fill-current stroke-current transition-[r] duration-300 ease-in-out active:cursor-grabbing",
                  "rounded-full focus-visible:outline-2 focus-visible:outline-offset-2",
                  presentation.svgAccentClassName,
                )}
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
                onDoubleClick={handleDoubleClick}
              >
                {formatClock(remainingSeconds)}
              </text>
            </svg>
          )}
        </div>
      </div>

      <div className="flex justify-center py-4">
        <ButtonGroup className="w-full">
          <Button
            data-testid="secondary-action-button"
            disabled={!presentation.secondaryAction.isEnabled}
            onClick={handleSecondaryAction}
            size="sm"
            variant="dark"
          >
            {presentation.secondaryAction.iconPlacement === "before" && secondaryActionIcon}
            <span>{presentation.secondaryAction.label}</span>
            {presentation.secondaryAction.iconPlacement === "after" && secondaryActionIcon}
          </Button>
          <Button
            data-testid="primary-action-button"
            onClick={handlePrimaryAction}
            size="sm"
            variant={presentation.primaryAction.variant}
          >
            {presentation.primaryAction.label}
          </Button>
        </ButtonGroup>
      </div>

      <div className="absolute right-4 bottom-4 mt-4 flex w-full items-center justify-between pl-8">
        <div className="flex rounded-full border border-zinc-600 px-3 py-2">
          <p data-testid="completed-count" className="text-sm text-zinc-200">
            Completed today: {sessionsCompletedToday}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          data-testid="settings-open-button"
          aria-label="Open settings"
          className="pointer-events-auto cursor-pointer rounded-full border border-zinc-600 p-2.5 text-zinc-200 hover:border-zinc-300"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
