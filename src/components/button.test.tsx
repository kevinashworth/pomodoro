import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import Button from "@/components/button";

describe("Button", () => {
  test.each([
    ["black", "bg-zinc-950"],
    ["blue", "bg-blue-500"],
    ["dark", "bg-zinc-900"],
    ["green", "bg-green-500"],
    ["light", "bg-zinc-200"],
    ["orange", "bg-orange-500"],
    ["red", "bg-red-500"],
    ["white", "bg-white"],
    ["yellow", "bg-yellow-500"],
  ] as const)("renders the %s variant", (variant, expectedClass) => {
    render(<Button variant={variant}>Action</Button>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(expectedClass);
  });

  test("renders one native button with children and merged classes", () => {
    render(
      <Button className="custom-class" data-testid="action-button">
        Save changes
      </Button>,
    );

    const button = screen.getByTestId("action-button");
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(button).toHaveTextContent("Save changes");
    expect(button).toHaveClass(
      "custom-class",
      "bg-blue-500",
      "rounded-full",
      "whitespace-nowrap",
      "px-5",
      "py-1",
      "text-xs",
    );
    expect(button).toHaveAttribute("data-testid", "action-button");
  });

  test.each([
    ["xs", "px-5", "py-1", "text-xs"],
    ["sm", "px-6", "py-1.5", "text-sm"],
    ["md", "px-7", "py-2", "text-base"],
    ["lg", "px-8", "py-2.5", "text-lg"],
    ["xl", "px-10", "py-3", "text-xl"],
  ] as const)("renders the %s size", (size, horizontalPadding, verticalPadding, fontSize) => {
    render(<Button size={size}>Action</Button>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(horizontalPadding, verticalPadding, fontSize);
  });

  test.each(["button", "submit", "reset"] as const)("passes through type=%s", (type) => {
    render(<Button type={type}>Action</Button>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute("type", type);
  });

  test("supports disabled state and click handlers", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick} aria-label="Disabled action">
        Action
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Disabled action" });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("forwards accessibility attributes and refs", () => {
    const buttonRef = createRef<HTMLButtonElement>();
    render(
      <Button ref={buttonRef} aria-describedby="action-help">
        Action
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Action" });
    expect(button).toHaveAttribute("aria-describedby", "action-help");
    expect(buttonRef.current).toBe(button);
  });
});
