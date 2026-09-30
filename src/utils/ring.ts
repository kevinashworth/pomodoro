import { STROKE_WIDTH } from "@/constants/pomodoro";

export type RingGeometry = {
  radius: number;
  center: number;
  circumference: number;
};

export default function ringGeometry(ringSize: number): RingGeometry {
  const radius = (ringSize - STROKE_WIDTH) / 2;
  const center = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  return { radius, center, circumference };
}
