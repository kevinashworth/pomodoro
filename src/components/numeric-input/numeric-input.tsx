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
  // When true (the default), each arrow-key step calls `onChange` immediately.
  // When false, steps only update the draft, which commits on blur like typing.
  commitOnStep?: boolean;
  max?: number;
  min?: number;
  name?: string;
  onChange: (value: number) => void;
  // Lets the parent own arrow-key steps, for example to carry seconds into
  // minutes. It receives the field's current value (including an uncommitted
  // draft) and the direction, and the field then shows the parent's new
  // `value`. Replaces both `onChange` and `commitOnStep` for arrow keys.
  onStep?: (current: number, direction: 1 | -1) => void;
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
  commitOnStep = true,
  max = DEFAULT_MAX,
  min = DEFAULT_MIN,
  name,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  onStep,
  padTo,
  testId,
  value = 0,
  ...inputProps
}: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const padWidth = padTo !== undefined && padTo > 0 ? padTo : undefined;
  const digitLimit = padWidth ?? Math.max(1, digitCount(max));

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
    const direction = event.key === "ArrowUp" ? 1 : -1;

    if (onStep) {
      // Drop the draft so the field follows the value the parent commits.
      setDraft(null);
      onStep(current, direction);
      return;
    }

    const next = clamp(current + direction, min, max);

    setDraft(format(next));
    if (commitOnStep) {
      onChange(next);
    }
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
