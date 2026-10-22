import NumericInputTwoDigits from "@/components/timer-inputs/numeric-input-two-digits";

type SplitOnChangeType = {
  minutes: number;
  seconds: number;
};

type NumberInputTimerProps = {
  remainingSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
};

function TimerInput({ remainingSeconds, setRemainingSeconds }: NumberInputTimerProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  function calculateRemainingSeconds({ minutes, seconds }: SplitOnChangeType) {
    return minutes * 60 + seconds;
  }

  function handleChange(value: number, name: "minutes" | "seconds") {
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
          <NumericInputTwoDigits max={59} value={minutes} onChange={handleChange} name="minutes" />
          <div className="pb-3">:</div>
          <NumericInputTwoDigits max={59} value={seconds} onChange={handleChange} name="seconds" />
        </div>
      </div>
    </div>
  );
}

export default TimerInput;
