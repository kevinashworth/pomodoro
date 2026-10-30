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
    setRemainingSeconds(newRemainingSeconds);
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-[60px] font-light text-zinc-100 tabular-nums">
        <div className="flex items-center">
          <TwoDigitInput max={60} name="minutes" onChange={(value) => handleChange("minutes", value)} value={minutes} />
          <div className="pb-3">:</div>
          <TwoDigitInput max={59} name="seconds" onChange={(value) => handleChange("seconds", value)} value={seconds} />
        </div>
      </div>
    </div>
  );
}

export default TimerInput;
