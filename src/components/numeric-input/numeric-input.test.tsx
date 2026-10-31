import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import MinutesInput from "@/components/numeric-input/minutes-input";
import NumericInput, { type NumericInputProps } from "@/components/numeric-input/numeric-input";
import TwoDigitInput from "@/components/numeric-input/two-digit-input";

type ControlledProps = Omit<NumericInputProps, "onChange" | "value"> & { initial?: number };

function renderControlled({ initial = 0, ...props }: ControlledProps) {
  const onChange = vi.fn();

  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <NumericInput
        {...props}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }

  render(<Harness />);
  return { onChange };
}

describe("NumericInput", () => {
  test("pads the displayed value when padTo is set", () => {
    renderControlled({ padTo: 2, initial: 5, testId: "input" });

    expect(screen.getByTestId("input")).toHaveValue("05");
  });

  test("does not pad the displayed value by default", () => {
    renderControlled({ initial: 5, testId: "input" });

    expect(screen.getByTestId("input")).toHaveValue("5");
  });

  test("clamps below the minimum on blur", () => {
    const { onChange } = renderControlled({ initial: 5, min: 1, max: 60, testId: "input" });
    const input = screen.getByTestId("input");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue("1");
  });

  test("clamps above the maximum on blur", () => {
    const { onChange } = renderControlled({ initial: 5, min: 1, max: 60, testId: "input" });
    const input = screen.getByTestId("input");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(60);
    expect(input).toHaveValue("60");
  });

  test("commits the minimum when the field is cleared", () => {
    const { onChange } = renderControlled({ initial: 5, min: 3, max: 60, testId: "input" });
    const input = screen.getByTestId("input");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(input).toHaveValue("3");
  });

  test("arrows step the value, clamp, and keep padding", () => {
    const { onChange } = renderControlled({ initial: 5, padTo: 2, max: 6, testId: "input" });
    const input = screen.getByTestId("input");

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowUp" });

    expect(onChange).toHaveBeenLastCalledWith(6);
    expect(input).toHaveValue("06");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(6);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(input).toHaveValue("05");
  });

  test("limits input to the maximum number of digits", () => {
    const { onChange } = renderControlled({ initial: 0, max: 999, maxDigits: 3, testId: "input" });
    const input = screen.getByTestId("input");

    expect(input).toHaveAttribute("maxLength", "3");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(123);
    expect(input).toHaveValue("123");
  });

  test("exposes the input name and test id independently", () => {
    renderControlled({ name: "minutes-field", testId: "minutes-input", initial: 1 });

    const input = screen.getByTestId("minutes-input");
    expect(input).toHaveAttribute("name", "minutes-field");
  });

  test("forwards native input attributes and handlers", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    renderControlled({
      "aria-label": "Minutes",
      autoComplete: "off",
      id: "minutes-field",
      initial: 1,
      onBlur,
      onFocus,
      readOnly: true,
      testId: "input",
    });

    const input = screen.getByTestId("input");
    expect(input).toHaveAttribute("aria-label", "Minutes");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("id", "minutes-field");
    expect(input).toHaveAttribute("readonly");

    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe("variants", () => {
  function renderTwoDigit(initial: number) {
    const onChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState(initial);
      return (
        <TwoDigitInput
          testId="two-digit"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Harness />);
    return { onChange };
  }

  function renderMinutes(initial: number) {
    const onChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState(initial);
      return (
        <MinutesInput
          testId="minutes"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Harness />);
    return { onChange };
  }

  test("TwoDigitInput pads and defaults to the 0-59 range", () => {
    const { onChange } = renderTwoDigit(5);
    const input = screen.getByTestId("two-digit");

    expect(input).toHaveValue("05");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "60" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(59);
    expect(input).toHaveValue("59");
  });

  test("MinutesInput does not pad and defaults to the 1-60 range", () => {
    const { onChange } = renderMinutes(5);
    const input = screen.getByTestId("minutes");

    expect(input).toHaveValue("5");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue("1");
  });
});
