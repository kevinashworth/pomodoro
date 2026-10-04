import { describe, expect, test } from "vitest";

import {
  getKnobPosition,
  getProgressOffset,
  getRemainingFraction,
  getRemainingSecondsFromPointer,
  getRingGeometry,
} from "@/utils/ring";

describe("getRingGeometry", () => {
  test("derives radius, center, and circumference", () => {
    const { radius, center, circumference } = getRingGeometry(212);
    expect(center).toBe(106);
    expect(radius).toBe((212 - 5) / 2);
    expect(circumference).toBeCloseTo(2 * Math.PI * radius);
  });
});

describe("getRemainingFraction", () => {
  test("clamps above 1", () => {
    expect(getRemainingFraction(1200, 600)).toBe(1);
  });

  test("clamps below 0", () => {
    expect(getRemainingFraction(-10, 600)).toBe(0);
  });

  test("returns 0 for a non-positive phase max", () => {
    expect(getRemainingFraction(100, 0)).toBe(0);
  });

  test("returns the ratio otherwise", () => {
    expect(getRemainingFraction(300, 600)).toBe(0.5);
  });
});

describe("getProgressOffset", () => {
  test("is full circumference at 0 remaining", () => {
    expect(getProgressOffset(100, 0)).toBe(100);
  });

  test("is zero at full remaining", () => {
    expect(getProgressOffset(100, 1)).toBe(0);
  });
});

describe("getKnobPosition", () => {
  test("sits at the top at full remaining", () => {
    const { x, y } = getKnobPosition(100, 50, 1);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(50);
  });

  test("sits at the bottom at half remaining", () => {
    const { x, y } = getKnobPosition(100, 50, 0.5);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(150);
  });
});

describe("getRemainingSecondsFromPointer", () => {
  const rect = { left: 0, top: 0 };
  const center = 106;
  const radius = (212 - 5) / 2;
  const phaseMax = 600;

  test("returns the full phase at the top", () => {
    expect(getRemainingSecondsFromPointer(center, center - radius, rect, center, phaseMax)).toBe(600);
  });

  test("returns half the phase at the bottom", () => {
    expect(getRemainingSecondsFromPointer(center, center + radius, rect, center, phaseMax)).toBe(300);
  });

  test("returns a quarter of the phase at the right", () => {
    expect(getRemainingSecondsFromPointer(center + radius, center, rect, center, phaseMax)).toBe(150);
  });

  test("accounts for the element offset", () => {
    const offsetRect = { left: 40, top: 25 };
    expect(getRemainingSecondsFromPointer(40 + center, 25 + center + radius, offsetRect, center, phaseMax)).toBe(300);
  });
});
