import { useState } from "react";

import TwoDigitInput from "@/components/numeric-input/two-digit-input";
import cn from "@/utils/cn";

type NumberInputTimerProps = {
  remainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
  // Limits for the total time. An edit past either one is clamped to it.
  minSeconds?: number;
  maxSeconds?: number;
};

type TimePart = "minutes" | "seconds";

// "reached": an edit landed on the max (flash green). "beyond": an edit tried
// to go past a limit and was clamped (shake red).
type LimitFeedback = "reached" | "beyond" | null;

// The longest time the two fields can sensibly show. The fields alone could show 60:59.
const DEFAULT_MAX_SECONDS = 60 * 60;
// Two digits, so a typed minute value reaches the limit check unclamped.
const MINUTES_FIELD_MAX = 99;

function TimerInput({
  remainingSeconds,
  setRemainingSeconds,
  minSeconds = 0,
  maxSeconds = DEFAULT_MAX_SECONDS,
}: NumberInputTimerProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const [limitFeedback, setLimitFeedback] = useState<LimitFeedback>(null);

  function commit(total: number) {
    const clamped = Math.max(minSeconds, Math.min(maxSeconds, total));
    if (clamped !== total) {
      setLimitFeedback("beyond");
    } else if (clamped === maxSeconds && remainingSeconds !== maxSeconds) {
      setLimitFeedback("reached");
    }
    setRemainingSeconds(clamped);
  }

  function handleChange(name: TimePart, value: number) {
    commit(name === "minutes" ? value * 60 + seconds : minutes * 60 + value);
  }

  // Arrow keys step the total time. On seconds, 59 rolls up into the next
  // minute and 00 rolls down into the previous one.
  function handleMinutesStep(currentMinutes: number, direction: 1 | -1) {
    commit((currentMinutes + direction) * 60 + seconds);
  }

  function handleSecondsStep(currentSeconds: number, direction: 1 | -1) {
    commit(minutes * 60 + currentSeconds + direction);
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-[60px] font-light text-zinc-100 tabular-nums">
        <div
          className={cn(
            "flex items-center",
            limitFeedback === "reached" && "animate-limit-reached",
            limitFeedback === "beyond" && "motion-safe:animate-limit-beyond motion-reduce:animate-limit-beyond-still",
          )}
          data-limit-feedback={limitFeedback ?? undefined}
          data-testid="timer-input"
          onAnimationEnd={() => setLimitFeedback(null)}
        >
          <TwoDigitInput
            max={MINUTES_FIELD_MAX}
            name="minutes"
            onChange={(value) => handleChange("minutes", value)}
            onStep={handleMinutesStep}
            value={minutes}
          />
          <div className="pb-3">:</div>
          <TwoDigitInput
            max={59}
            name="seconds"
            onChange={(value) => handleChange("seconds", value)}
            onStep={handleSecondsStep}
            value={seconds}
          />
        </div>
      </div>
    </div>
  );
}

export default TimerInput;
