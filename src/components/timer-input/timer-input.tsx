import TwoDigitInput from "@/components/numeric-input/two-digit-input";

type SplitOnChangeType = {
  minutes: number;
  seconds: number;
};

type NumberInputTimerProps = {
  remainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
};

type TimePart = "minutes" | "seconds";

const MAX_MINUTES_FIELD = 60;
// The longest time an edit can set, 60:00. The fields alone could show 60:59.
const MAX_TOTAL_SECONDS = MAX_MINUTES_FIELD * 60;

function clampTotalSeconds(total: number): number {
  return Math.max(0, Math.min(MAX_TOTAL_SECONDS, total));
}

function TimerInput({ remainingSeconds, setRemainingSeconds }: NumberInputTimerProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  function calculateRemainingSeconds({ minutes, seconds }: SplitOnChangeType) {
    return minutes * 60 + seconds;
  }

  function handleChange(name: TimePart, value: number) {
    const newRemainingSeconds = calculateRemainingSeconds({
      minutes,
      seconds,
      [name]: value,
    });
    setRemainingSeconds(clampTotalSeconds(newRemainingSeconds));
  }

  // Arrow keys on seconds step the total time, so 59 rolls up into the next
  // minute and 00 rolls down into the previous one. The owner of
  // `remainingSeconds` still applies its own phase limits.
  function handleSecondsStep(currentSeconds: number, direction: 1 | -1) {
    const total = minutes * 60 + currentSeconds + direction;
    setRemainingSeconds(clampTotalSeconds(total));
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-[60px] font-light text-zinc-100 tabular-nums">
        <div className="flex items-center">
          <TwoDigitInput
            max={MAX_MINUTES_FIELD}
            name="minutes"
            onChange={(value) => handleChange("minutes", value)}
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
