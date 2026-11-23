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

  test("typing seconds at 60 minutes stays at 60:00", () => {
    const { secondsInput, onRemainingSecondsChange } = renderTimerInput(60 * 60);

    if (!secondsInput) throw new Error("seconds input not found");

    fireEvent.focus(secondsInput);
    fireEvent.change(secondsInput, { target: { value: "45" } });
    fireEvent.blur(secondsInput);

    expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(60 * 60);
    expect(secondsInput).toHaveValue("00");
  });

  test("raising minutes past 60:00 stops at 60:00", () => {
    const { minutesInput, secondsInput, onRemainingSecondsChange } = renderTimerInput(59 * 60 + 30);

    if (!minutesInput || !secondsInput) throw new Error("inputs not found");

    fireEvent.focus(minutesInput);
    fireEvent.keyDown(minutesInput, { key: "ArrowUp" });

    expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(60 * 60);
    expect(secondsInput).toHaveValue("00");
  });

  describe("seconds arrow keys", () => {
    function setup(initialSeconds: number) {
      const result = renderTimerInput(initialSeconds);
      const { minutesInput, secondsInput } = result;
      if (!minutesInput || !secondsInput) throw new Error("inputs not found");
      fireEvent.focus(secondsInput);
      return { ...result, minutesInput, secondsInput };
    }

    test("ArrowUp at 59 rolls into the next minute", () => {
      const { minutesInput, secondsInput, onRemainingSecondsChange } = setup(119);

      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });

      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(120);
      expect(minutesInput).toHaveValue("02");
      expect(secondsInput).toHaveValue("00");
    });

    test("ArrowDown at 00 rolls into the previous minute", () => {
      const { minutesInput, secondsInput, onRemainingSecondsChange } = setup(120);

      fireEvent.keyDown(secondsInput, { key: "ArrowDown" });

      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(119);
      expect(minutesInput).toHaveValue("01");
      expect(secondsInput).toHaveValue("59");
    });

    test("steps within a minute without touching the minutes", () => {
      const { minutesInput, secondsInput, onRemainingSecondsChange } = setup(90);

      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });
      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });
      fireEvent.keyDown(secondsInput, { key: "ArrowDown" });

      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(91);
      expect(minutesInput).toHaveValue("01");
      expect(secondsInput).toHaveValue("31");
    });

    test("ArrowDown at 00:00 stays at zero", () => {
      const { secondsInput, onRemainingSecondsChange } = setup(0);

      fireEvent.keyDown(secondsInput, { key: "ArrowDown" });

      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(0);
      expect(secondsInput).toHaveValue("00");
    });

    test("ArrowUp at 59:59 rolls up to 60:00 and stops there", () => {
      const { minutesInput, secondsInput, onRemainingSecondsChange } = setup(59 * 60 + 59);

      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });
      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(60 * 60);

      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });
      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(60 * 60);
      expect(minutesInput).toHaveValue("60");
      expect(secondsInput).toHaveValue("00");
    });

    test("steps from a typed, uncommitted seconds value", () => {
      const { minutesInput, secondsInput, onRemainingSecondsChange } = setup(90);

      fireEvent.change(secondsInput, { target: { value: "59" } });
      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });

      expect(onRemainingSecondsChange).toHaveBeenLastCalledWith(120);
      expect(minutesInput).toHaveValue("02");
      expect(secondsInput).toHaveValue("00");
    });
  });
});
