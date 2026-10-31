import NumericInput from "@/components/numeric-input/numeric-input";
import { MAX_MINUTES, MIN_MINUTES } from "@/constants/pomodoro";
import cn from "@/utils/cn";

type MinutesInputProps = {
  className?: string;
  max?: number;
  min?: number;
  name?: string;
  onChange: (value: number) => void;
  testId?: string;
  value?: number;
};

export default function MinutesInput({
  className,
  max = MAX_MINUTES,
  min = MIN_MINUTES,
  name,
  onChange,
  testId,
  value,
}: MinutesInputProps) {
  return (
    <NumericInput
      className={cn("w-full rounded-md bg-zinc-200 px-2 py-1 text-zinc-900 outline-none", className)}
      max={max}
      min={min}
      name={name}
      onChange={onChange}
      testId={testId}
      value={value}
    />
  );
}
