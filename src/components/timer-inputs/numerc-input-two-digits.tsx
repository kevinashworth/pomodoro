import { ChangeEvent, ChangeEventHandler, useState } from "react";

import cn from "@/utils/cn";

/* Here's a "TIPS": the `type`, `input`, `pattern`, `size` attributes are key. Other stuff in this component
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
  const [displayString, setDisplayString] = useState<string>(toTwoDigitString(value ?? 0) || "00");

  const displayNumber = fromTwoDigitString(displayString);

  console.log({ displayNumber, displayString });

  function handleBlur(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    console.log(e.target.value, e);
    const v = e.target.value;
    const num = fromTwoDigitString(v);
    const boundedNum = num > max ? max : num < min ? min : num;
    const boundedStr = toTwoDigitString(boundedNum);
    setDisplayString(boundedStr);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    const v = e.target.value;
    const num = fromTwoDigitString(v);
    const boundedNum = num > max ? max : num < min ? min : num;
    const boundedStr = boundedNum.toString();
    setDisplayString(boundedStr);
    onChange?.(e);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const num = fromTwoDigitString(displayString);
    const boundedNum = num > max ? max : num < min ? min : num;
    // const boundedStr = toTwoDigitString(boundedNum);
    // console.log({ num, boundedNum, boundedStr });

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        setDisplayString(toTwoDigitString(boundedNum + 1));
        break;
      case "ArrowDown":
        e.preventDefault();
        setDisplayString(toTwoDigitString(boundedNum - 1));
        break;
      default:
        return;
    }
  };

  return (
    <div className="min-w-[76px]">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        size={2}
        maxLength={2}
        minLength={2}
        value={displayString}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn("field-sizing-content outline-0 outline-none", className)}
      />
    </div>
  );
}

export default NumericInputTwoDigits;
