import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Button from "@/components/button";
import ButtonGroup from "@/components/button-group";

describe("ButtonGroup", () => {
  test("creates equal intrinsic-width columns for horizontal buttons", () => {
    render(
      <ButtonGroup data-testid="button-group">
        <Button>Short</Button>
        <Button>Much longer label</Button>
      </ButtonGroup>,
    );

    const group = screen.getByTestId("button-group");
    expect(group).toHaveClass("inline-grid", "grid-flow-col", "auto-cols-fr", "w-max");
    expect(group).toHaveClass("[&>button]:w-full");
    expect(group.querySelectorAll("button")).toHaveLength(2);
  });

  test("creates equal intrinsic-height rows for vertical buttons", () => {
    render(
      <ButtonGroup orientation="vertical" data-testid="button-group">
        <Button>First</Button>
        <Button>Second button</Button>
        <Button>Third</Button>
      </ButtonGroup>,
    );

    const group = screen.getByTestId("button-group");
    expect(group).toHaveClass("inline-grid", "grid-flow-row", "auto-rows-[minmax(max-content,1fr)]");
    expect(group).toHaveClass("[&>button]:w-full");
    expect(group.querySelectorAll("button")).toHaveLength(3);
  });
});
