import { STROKE_WIDTH } from "@/constants/pomodoro";

export type RingGeometry = {
  radius: number;
  center: number;
  circumference: number;
};

export type RingPoint = {
  x: number;
  y: number;
};

export function getRingGeometry(ringSize: number): RingGeometry {
  const radius = (ringSize - STROKE_WIDTH) / 2;
  const center = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  return { radius, center, circumference };
}

export function getRemainingFraction(remainingSeconds: number, phaseMaxSeconds: number): number {
  const fraction = phaseMaxSeconds > 0 ? remainingSeconds / phaseMaxSeconds : 0;
  return Math.max(0, Math.min(1, fraction));
}

export function getProgressOffset(circumference: number, remainingFraction: number): number {
  return circumference * (1 - remainingFraction);
}

export function getKnobPosition(center: number, radius: number, remainingFraction: number): RingPoint {
  const elapsedFraction = 1 - remainingFraction;
  const angle = -elapsedFraction * Math.PI * 2 - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

export type PointerRect = {
  left: number;
  top: number;
};

export function getRemainingSecondsFromPointer(
  clientX: number,
  clientY: number,
  rect: PointerRect,
  center: number,
  phaseMaxSeconds: number,
): number {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const dx = x - center;
  const dy = y - center;

  const raw = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Match drag direction to the anchor/ring orientation (top -> left -> bottom -> right).
  const counterClockwiseFromTop = (270 - raw + 360) % 360;

  const elapsedFraction = counterClockwiseFromTop / 360;
  const nextRemaining = (1 - elapsedFraction) * phaseMaxSeconds;
  return Math.round(nextRemaining);
}
