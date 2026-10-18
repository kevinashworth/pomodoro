import { ChangeEvent, ChangeEventHandler, useState } from "react";

import cn from "@/utils/cn";

/* Here's a "TIP": the `type`, `input`, and `pattern` attributes are the key to making
this be a different kind of numeric `input`. Other functions in this component
are digital-clock, timer thingies. */

type NumericInputTwoDigitsProps = {
  className?: string;
  max?: number;
  min?: number;
  onChange?: ChangeEventHandler<HTMLInputElement, HTMLInputElement>;
  value?: number;
};

function toTwoDigitString(num: number) {
  return num.toString().padStart(2, "0");
}

function fromTwoDigitString(str: string) {
  return Number(str);
}

// function toMinutesAndSeconds(totalSeconds: number) {
//   const minutes = Math.floor(totalSeconds / 60);
//   const seconds = totalSeconds % 60;
//   return { minutes, seconds };
// }

// function fromMinutesAndSeconds(minutes: number, seconds: number) {
//   return minutes * 60 + seconds;
// }

function NumericInputTwoDigits({ className, max = 59, min = 0, onChange, value }: NumericInputTwoDigitsProps) {
  const [displayValue, setDisplayValue] = useState(toTwoDigitString(value ?? 0) || "00");

  console.log({ displayValue });

  function handleChange(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    const v = e.target.value;
    const num = fromTwoDigitString(v);
    const boundedNum = num > max ? max : num < min ? min : num;
    const boundedStr = toTwoDigitString(boundedNum);
    console.log({ v, num, boundedNum, boundedStr });
    setDisplayValue(boundedStr);
    onChange?.(e);
  }

  return (
    <div className="text-[60px] font-light text-zinc-100 tabular-nums">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9][0-9]"
        maxLength={2}
        value={displayValue}
        onChange={handleChange}
        className={cn(className)}
      />
    </div>
  );
}

export default NumericInputTwoDigits;
