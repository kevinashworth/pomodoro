import { ChangeEvent, KeyboardEvent, useRef, useState } from "react";

import cn from "@/utils/cn";

/*
For reasons, I use a `type="text"` input element inside the component, but to
the parent of this component, the value should appear as a number. I am calling
it "TIPS": the `type`, `input`, `pattern`, `size` attributes are key.
*/

type NumericInputTwoDigitsProps = {
  className?: string;
  max?: number;
  min?: number;
  name: "minutes" | "seconds";
  onChange: (value: number, name: "minutes" | "seconds") => void;
  value?: number;
};

const DEFAULT_MAX = 59;
const DEFAULT_MIN = 0;

const clamp = (num: number, min: number, max: number) => (Number.isNaN(num) ? min : Math.max(min, Math.min(num, max)));

const format = (num: number) => num.toString().padStart(2, "0");
const parseDigits = (str: string) => str.replace(/\D/g, "").slice(0, 2);

export default function NumericInputTwoDigits({
  className,
  max = DEFAULT_MAX,
  min = DEFAULT_MIN,
  name,
  onChange,
  value = 0,
}: NumericInputTwoDigitsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const committedValue = clamp(value, min, max);
  const committedString = format(committedValue);
  const displayValue = isFocused && draft !== null ? draft : committedString;

  const commit = (input: string) => {
    const digits = parseDigits(input);
    const num = digits === "" ? min : clamp(Number(digits), min, max);
    onChange(num, name);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(parseDigits(e.target.value));
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDraft(committedString);
    inputRef.current?.select();
  };

  const handleBlur = () => {
    commit(draft ?? committedString);
    setIsFocused(false);
    setDraft(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();

    const currentString = draft ?? committedString;
    const current = currentString === "" ? min : clamp(Number(currentString), min, max);
    const next = clamp(current + (e.key === "ArrowUp" ? 1 : -1), min, max);

    setDraft(format(next));
    onChange(next, name);
  };

  return (
    <div className="flex min-w-[72px] justify-center">
      <input
        ref={inputRef}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        size={2}
        maxLength={2}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("field-sizing-content outline-none", className)}
      />
    </div>
  );
}
