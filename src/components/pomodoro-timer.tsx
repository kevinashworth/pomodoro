import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/button";
import ButtonGroup from "@/components/button-group";
import SettingsIcon from "@/components/icons/settings";
import SkipBackwardIcon from "@/components/icons/skip-backward";
import SkipForwardIcon from "@/components/icons/skip-forward";
import { RING_SIZE, STROKE_WIDTH } from "@/constants/pomodoro";
import { usePomodoroTimer } from "@/context/pomodoro-timer";
import { useAnimatedRemainingSeconds } from "@/hooks/use-animated-remaining-seconds";
import { useRingDrag } from "@/hooks/use-ring-drag";
import { useSpacebarToggle } from "@/hooks/use-spacebar-toggle";
import cn from "@/utils/cn";
import { getKnobPosition, getProgressOffset, getRemainingFraction, getRingGeometry } from "@/utils/ring";
import { clampRemaining, formatClock } from "@/utils/time";
import { resolveTimerPresentation } from "@/utils/timer-presentation";

function toTwoDigitString(num: number) {
  return num.toString().padStart(2, "0");
}

function fromTwoDigitString(str: string) {
  return Number(str);
}

function toMinutesAndSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds };
}

function fromMinutesAndSeconds(minutes: number, seconds: number) {
  return minutes * 60 + seconds;
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

  const [editMinutes, setEditMinutes] = useState(toTwoDigitString(Math.floor(remainingSeconds / 60)) || "00");
  const [editSeconds, setEditSeconds] = useState(toTwoDigitString(remainingSeconds % 60) || "00");
  const [isEditing, setIsEditing] = useState(false);
  const [knobRadius, setKnobRadius] = useState<number | undefined>(undefined);

  function handleToggleEditing() {
    if (status !== "running") {
      if (isEditing) {
        const newRemainingSeconds = fromMinutesAndSeconds(
          fromTwoDigitString(editMinutes),
          fromTwoDigitString(editSeconds),
        );
        setRemainingSeconds(clampRemaining(newRemainingSeconds, false, phaseMaxSeconds));
      } else {
        setEditMinutes(toTwoDigitString(Math.floor(remainingSeconds / 60)));
        setEditSeconds(toTwoDigitString(remainingSeconds % 60));
      }
      setIsEditing(!isEditing);
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
  const handleSecondaryAction = presentation.secondaryAction.command === "skip" ? skip : reset;

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
    setRemainingSeconds(clampRemaining(nextRemainingSeconds, status === "running", phaseMaxSeconds));
  };

  return (
    <div className="relative h-full p-4">
      <p
        className="mt-1 mb-4 w-full text-center text-lg font-semibold text-zinc-200 uppercase"
        data-testid="mode-label"
      >
        {presentation.modeLabel}
      </p>

      <div
        className="relative mt-1 flex items-center justify-center overflow-visible"
        onPointerLeave={handleSVGPointerLeave}
        onPointerEnter={handleSVGPointerEnter}
      >
        <div
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
          }}
        >
          {isEditing ? (
            <div className="flex items-center justify-center gap-2 text-[60px] font-light text-zinc-100 tabular-nums">
              {/* <input
                type="number"
                min={0}
                max={phaseMaxSeconds}
                value={remainingSeconds}
                onChange={(e) => setRemainingSeconds(parseInt(e.target.value) || 0)}
              /> */}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-6][0-9]"
                maxLength={2}
                value={editMinutes}
                onChange={(e) => setEditMinutes(parseInt(e.target.value) || "00")}
              ></input>
              <span>:</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9][0-9]"
                maxLength={2}
                value={editSeconds}
                onChange={(e) => setEditSeconds(parseInt(e.target.value) || "00")}
              ></input>
            </div>
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
                aria-valuemin={status === "running" ? 1 : 0}
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
                onDoubleClick={handleToggleEditing}
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
            onClick={toggle}
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
