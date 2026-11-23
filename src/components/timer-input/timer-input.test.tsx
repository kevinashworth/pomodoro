import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import TimerInput from "@/components/timer-input/timer-input";

function renderTimerInput(initialSeconds: number, limits: { minSeconds?: number; maxSeconds?: number } = {}) {
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
        {...limits}
      />
    );
  }

  const { container } = render(<Harness />);

  return {
    display: container.querySelector<HTMLElement>('[data-testid="timer-input"]'),
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

  describe("limits", () => {
    const max = 25 * 60;

    function inputs(result: ReturnType<typeof renderTimerInput>) {
      const { display, minutesInput, secondsInput } = result;
      if (!display || !minutesInput || !secondsInput) throw new Error("elements not found");
      return { display, minutesInput, secondsInput };
    }

    test("ArrowUp on seconds at the max is refused and stays put", () => {
      const result = renderTimerInput(max, { maxSeconds: max });
      const { display, secondsInput } = inputs(result);

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
      expect(result.onRemainingSecondsChange).toHaveBeenLastCalledWith(max);
    });

    test("ArrowDown on seconds at the min is refused", () => {
      const result = renderTimerInput(1, { minSeconds: 1, maxSeconds: max });
      const { display, secondsInput } = inputs(result);

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowDown" });

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
      expect(result.onRemainingSecondsChange).toHaveBeenLastCalledWith(1);
    });

    test("ArrowUp on minutes past the max clamps to the max", () => {
      const result = renderTimerInput(24 * 60 + 30, { maxSeconds: max });
      const { display, minutesInput, secondsInput } = inputs(result);

      fireEvent.focus(minutesInput);
      fireEvent.keyDown(minutesInput, { key: "ArrowUp" });

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
      expect(minutesInput).toHaveValue("25");
      expect(secondsInput).toHaveValue("00");
    });

    test("ArrowDown on minutes below zero clamps to zero", () => {
      const result = renderTimerInput(30, { maxSeconds: max });
      const { display, minutesInput, secondsInput } = inputs(result);

      fireEvent.focus(minutesInput);
      fireEvent.keyDown(minutesInput, { key: "ArrowDown" });

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
      expect(result.onRemainingSecondsChange).toHaveBeenLastCalledWith(0);
      expect(secondsInput).toHaveValue("00");
    });

    test("typing minutes past the max clamps on blur", () => {
      const result = renderTimerInput(10 * 60, { maxSeconds: max });
      const { display, minutesInput } = inputs(result);

      fireEvent.focus(minutesInput);
      fireEvent.change(minutesInput, { target: { value: "99" } });
      fireEvent.blur(minutesInput);

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
      expect(result.onRemainingSecondsChange).toHaveBeenLastCalledWith(max);
      expect(minutesInput).toHaveValue("25");
    });
  });

  describe("limit feedback", () => {
    const max = 20 * 60;

    function setup(initialSeconds: number) {
      const result = renderTimerInput(initialSeconds, { maxSeconds: max });
      const { display, minutesInput, secondsInput } = result;
      if (!display || !minutesInput || !secondsInput) throw new Error("elements not found");
      return { ...result, display, minutesInput, secondsInput };
    }

    test("flashes when an arrow step lands on the max", () => {
      const { display, secondsInput } = setup(19 * 60 + 59);

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });

      expect(display).toHaveAttribute("data-limit-feedback", "reached");
      expect(display).toHaveClass("animate-limit-reached");
    });

    test("shakes when an arrow step tries to go past the max", () => {
      const { display, secondsInput } = setup(max);

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
      expect(display).toHaveClass("motion-safe:animate-limit-beyond", "motion-reduce:animate-limit-beyond-still");
    });

    test("shakes when an edit tries to go below the min", () => {
      const { display, secondsInput } = setup(0);

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowDown" });

      expect(display).toHaveAttribute("data-limit-feedback", "beyond");
    });

    test("flashes when a typed value lands on the max", () => {
      const { display, minutesInput } = setup(19 * 60);

      fireEvent.focus(minutesInput);
      fireEvent.change(minutesInput, { target: { value: "20" } });
      fireEvent.blur(minutesInput);

      expect(display).toHaveAttribute("data-limit-feedback", "reached");
    });

    test("clears the feedback when its animation ends", () => {
      const { display, secondsInput } = setup(max);

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowUp" });
      // jsdom has no AnimationEvent, so React listens for the prefixed name there.
      // Browsers fire the standard `animationend`.
      fireEvent(display, new Event("webkitAnimationEnd", { bubbles: true }));

      expect(display).not.toHaveAttribute("data-limit-feedback");
    });

    test("shows no feedback for edits inside the limits or an unchanged max", () => {
      const { display, minutesInput, secondsInput } = setup(max);

      fireEvent.focus(minutesInput);
      fireEvent.blur(minutesInput);
      expect(display).not.toHaveAttribute("data-limit-feedback");

      fireEvent.focus(secondsInput);
      fireEvent.keyDown(secondsInput, { key: "ArrowDown" });
      expect(display).not.toHaveAttribute("data-limit-feedback");
    });
  });
});
