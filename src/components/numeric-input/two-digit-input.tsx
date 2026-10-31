import NumericInput from "@/components/numeric-input/numeric-input";
import cn from "@/utils/cn";

type TwoDigitInputProps = {
  className?: string;
  max?: number;
  min?: number;
  name?: string;
  onChange: (value: number) => void;
  testId?: string;
  value?: number;
};

export default function TwoDigitInput({
  className,
  max = 59,
  min = 0,
  name,
  onChange,
  testId,
  value,
}: TwoDigitInputProps) {
  return (
    <span className="flex min-w-[72px] justify-center">
      <NumericInput
        className={cn("outline-none", className)}
        max={max}
        min={min}
        name={name}
        onChange={onChange}
        padTo={2}
        testId={testId}
        value={value}
      />
    </span>
  );
}
