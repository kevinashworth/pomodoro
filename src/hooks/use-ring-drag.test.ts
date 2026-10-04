import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useRingDrag } from "@/hooks/use-ring-drag";

const CENTER = 106;
const RADIUS = (212 - 5) / 2;
const PHASE_MAX = 600;

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 212, height: 212, right: 212, bottom: 212, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return svg;
}

function makeCircle(svg: SVGSVGElement): SVGCircleElement {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  svg.appendChild(circle);
  Object.assign(circle, { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() });
  return circle;
}

function pointerDown(circle: SVGCircleElement, clientX: number, clientY: number, pointerId = 1) {
  const event = new Event("pointerdown", { bubbles: true }) as unknown as React.PointerEvent<SVGCircleElement>;
  Object.assign(event, { clientX, clientY, pointerId, preventDefault: vi.fn() });
  Object.defineProperty(event, "currentTarget", { value: circle });
  return event;
}

function renderDrag(status: "idle" | "running" = "idle") {
  const setRemainingSeconds = vi.fn();
  const hook = renderHook(() =>
    useRingDrag({ center: CENTER, phaseMaxSeconds: PHASE_MAX, status, setRemainingSeconds }),
  );
  const svg = makeSvg();
  act(() => {
    hook.result.current.svgRef.current = svg;
  });
  return { ...hook, setRemainingSeconds, svg };
}

describe("useRingDrag", () => {
  test("starts not dragging", () => {
    const { result } = renderDrag();
    expect(result.current.isDragging).toBe(false);
  });

  test("onDragStart captures the pointer and sets the remaining time", () => {
    const { result, setRemainingSeconds, svg } = renderDrag();
    const circle = makeCircle(svg);

    act(() => {
      result.current.onDragStart(pointerDown(circle, CENTER, CENTER + RADIUS));
    });

    expect(result.current.isDragging).toBe(true);
    expect(circle.setPointerCapture).toHaveBeenCalled();
    expect(setRemainingSeconds).toHaveBeenCalledWith(300);
  });

  test("onDragMove is ignored before a drag starts", () => {
    const { result, setRemainingSeconds, svg } = renderDrag();
    const circle = makeCircle(svg);

    act(() => {
      result.current.onDragMove(pointerDown(circle, CENTER, CENTER + RADIUS));
    });

    expect(setRemainingSeconds).not.toHaveBeenCalled();
  });

  test("onDragMove updates the remaining time while dragging", () => {
    const { result, setRemainingSeconds, svg } = renderDrag();
    const circle = makeCircle(svg);

    act(() => {
      result.current.onDragStart(pointerDown(circle, CENTER, CENTER + RADIUS));
    });
    setRemainingSeconds.mockClear();

    act(() => {
      result.current.onDragMove(pointerDown(circle, CENTER + RADIUS, CENTER));
    });

    expect(setRemainingSeconds).toHaveBeenCalledWith(150);
  });

  test("onDragEnd releases capture and stops dragging", () => {
    const { result, svg } = renderDrag();
    const circle = makeCircle(svg);

    act(() => {
      result.current.onDragStart(pointerDown(circle, CENTER, CENTER + RADIUS));
    });

    act(() => {
      result.current.onDragEnd(pointerDown(circle, CENTER, CENTER + RADIUS));
    });

    expect(result.current.isDragging).toBe(false);
    expect(circle.releasePointerCapture).toHaveBeenCalled();
  });

  test("clamps to at least one second while running", () => {
    const { result, setRemainingSeconds, svg } = renderDrag("running");
    const circle = makeCircle(svg);

    act(() => {
      result.current.onDragStart(pointerDown(circle, CENTER + 1, CENTER - RADIUS));
    });

    expect(setRemainingSeconds).toHaveBeenCalledWith(1);
  });
});
