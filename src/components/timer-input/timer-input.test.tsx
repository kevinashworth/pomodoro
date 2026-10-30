import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import TimerInput from "@/components/timer-input/timer-input";

function renderTimerInput(initialSeconds: number) {
  const onRemainingSecondsChange = vi.fn();

  function Harness() {
    const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
    return (
      <TimerInput
        remainingSeconds={remainingSeconds}
        setRemainingSeconds={(seconds) => {
          onRemainingSecondsChange(seconds);
          setRemainingSeconds(seconds);
        }}
      />
    );
  }

  const { container } = render(<Harness />);

  return {
    minutesInput: container.querySelector<HTMLInputElement>('input[name="minutes"]'),
    secondsInput: container.querySelector<HTMLInputElement>('input[name="seconds"]'),
    onRemainingSecondsChange,
  };
}

describe("TimerInput", () => {
  test("renders padded minutes and seconds", () => {
    const { minutesInput, secondsInput } = renderTimerInput(90);

    expect(minutesInput).toHaveValue("01");
    expect(secondsInput).toHaveValue("30");
  });

  test("renders a 60-minute phase without clamping it to 59", () => {
    const { minutesInput, secondsInput } = renderTimerInput(60 * 60);

    expect(minutesInput).toHaveValue("60");
    expect(secondsInput).toHaveValue("00");
  });

  test("commits edited minutes and keeps the current seconds", () => {
    const { minutesInput, onRemainingSecondsChange } = renderTimerInput(90);

    if (!minutesInput) throw new Error("minutes input not found");

    fireEvent.focus(minutesInput);
    fireEvent.change(minutesInput, { target: { value: "02" } });
    fireEvent.blur(minutesInput);

    expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(150);
    expect(minutesInput).toHaveValue("02");
  });

  test("commits edited seconds and keeps the current minutes", () => {
    const { secondsInput, onRemainingSecondsChange } = renderTimerInput(90);

    if (!secondsInput) throw new Error("seconds input not found");

    fireEvent.focus(secondsInput);
    fireEvent.change(secondsInput, { target: { value: "05" } });
    fireEvent.blur(secondsInput);

    expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(65);
    expect(secondsInput).toHaveValue("05");
  });
});
