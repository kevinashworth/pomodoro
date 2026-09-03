export const STORAGE_KEY = "pomodoro.main.v2";
export const RING_SIZE = 212;
export const STROKE_WIDTH = 5;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
export const CENTER = RING_SIZE / 2;
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
export const COLORS = {
  work: "#4f9ad8",
  break: "#58c7a6",
};
