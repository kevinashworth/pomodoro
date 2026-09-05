export const POMODORO_STORAGE_KEY = "pomodoro.main.v2"; // pomodoro timer state (version 2)
export const SETTINGS_STORAGE_KEY = "pomodoro.settings.v1"; // user preferences (version 1)

export const STROKE_WIDTH = 5;
export const DEFAULT_RING_SIZE = 212;
export const MINI_RING_SIZE = 140;

export function ringGeometry(ringSize: number) {
  const radius = (ringSize - STROKE_WIDTH) / 2;
  const center = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  return { radius, center, circumference };
}

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const COLORS = {
  work: "#4f9ad8",
  break: "#58c7a6",
};
