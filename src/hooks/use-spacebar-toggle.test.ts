import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useSpacebarToggle } from "@/hooks/use-spacebar-toggle";

function pressKey(options: KeyboardEventInit, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

function withTag(tagName: string): HTMLElement {
  const element = document.createElement(tagName.toLowerCase());
  document.body.appendChild(element);
  return element;
}

describe("useSpacebarToggle", () => {
  test("calls onToggle on Space", () => {
    const onToggle = vi.fn();
    renderHook(() => useSpacebarToggle(onToggle));

    act(() => {
      pressKey({ code: "Space" });
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("ignores non-Space keys", () => {
    const onToggle = vi.fn();
    renderHook(() => useSpacebarToggle(onToggle));

    act(() => {
      pressKey({ code: "Enter" });
    });

    expect(onToggle).not.toHaveBeenCalled();
  });

  test.each(["INPUT", "TEXTAREA", "SELECT"])("ignores Space from a %s", (tag) => {
    const onToggle = vi.fn();
    renderHook(() => useSpacebarToggle(onToggle));
    const element = withTag(tag);

    act(() => {
      pressKey({ code: "Space" }, element);
    });

    expect(onToggle).not.toHaveBeenCalled();
    element.remove();
  });

  test("prevents default on handled Space and removes the listener on unmount", () => {
    const onToggle = vi.fn();
    const { unmount } = renderHook(() => useSpacebarToggle(onToggle));

    let event!: KeyboardEvent;
    act(() => {
      event = pressKey({ code: "Space" });
    });
    expect(event.defaultPrevented).toBe(true);

    unmount();
    act(() => {
      pressKey({ code: "Space" });
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("uses the latest callback without re-subscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onToggle }) => useSpacebarToggle(onToggle), {
      initialProps: { onToggle: first },
    });

    rerender({ onToggle: second });

    act(() => {
      pressKey({ code: "Space" });
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
