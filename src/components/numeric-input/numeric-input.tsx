import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";

import cn from "@/utils/cn";

/*
For reasons, I use a `type="text"` input element inside the component, but to
the parent of this component, the value should appear as a number. I am calling
it "TIPS": the `type`, `input`, `pattern`, `size` attributes are key.
*/

type NativeInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  | "className"
  | "defaultChecked"
  | "defaultValue"
  | "inputMode"
  | "max"
  | "maxLength"
  | "min"
  | "name"
  | "onChange"
  | "pattern"
  | "size"
  | "type"
  | "value"
>;

export type NumericInputProps = NativeInputProps & {
  className?: string;
  max?: number;
  maxDigits?: number;
  min?: number;
  name?: string;
  onChange: (value: number) => void;
  padTo?: number;
  testId?: string;
  value?: number;
};

const DEFAULT_MAX = 99;
const DEFAULT_MIN = 0;

const clamp = (num: number, min: number, max: number) => (Number.isNaN(num) ? min : Math.max(min, Math.min(num, max)));

const digitCount = (num: number) => String(Math.abs(Math.trunc(num))).length;

export default function NumericInput({
  className,
  max = DEFAULT_MAX,
  maxDigits,
  min = DEFAULT_MIN,
  name,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  padTo,
  testId,
  value = 0,
  ...inputProps
}: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const padWidth = padTo !== undefined && padTo > 0 ? padTo : undefined;
  const digitLimit = maxDigits ?? padWidth ?? Math.max(1, digitCount(max));

  const format = (num: number) => (padWidth ? String(num).padStart(padWidth, "0") : String(num));
  const parseDigits = (str: string) => str.replace(/\D/g, "").slice(0, digitLimit);

  const committedValue = clamp(value, min, max);
  const committedString = format(committedValue);
  const displayValue = isFocused && draft !== null ? draft : committedString;

  const commit = (input: string) => {
    const digits = parseDigits(input);
    const num = digits === "" ? min : clamp(Number(digits), min, max);
    onChange(num);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(parseDigits(e.target.value));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDraft(committedString);
    inputRef.current?.select();
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commit(draft ?? committedString);
    setIsFocused(false);
    setDraft(null);
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();

    const currentString = draft ?? committedString;
    const current = currentString === "" ? min : clamp(Number(currentString), min, max);
    const next = clamp(current + (event.key === "ArrowUp" ? 1 : -1), min, max);

    setDraft(format(next));
    onChange(next);
  };

  return (
    <input
      {...inputProps}
      ref={inputRef}
      name={name}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      size={digitLimit}
      maxLength={digitLimit}
      data-testid={testId}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("field-sizing-content", className)}
    />
  );
}
