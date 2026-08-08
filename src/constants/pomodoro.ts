import type { AccentColors, AccentPreset } from "@/types/pomodoro";

export const STORAGE_KEY = "pomodoro.main.v1";
export const RING_SIZE = 212;
export const STROKE_WIDTH = 5;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const PRESETS: Record<AccentPreset, AccentColors> = {
  classic: {
    work: "#f8847f",
    break: "#6dd0b7",
    glow: "rgba(248, 132, 127, 0.23)",
  },
  sunset: {
    work: "#f06f50",
    break: "#50ba8b",
    glow: "rgba(240, 111, 80, 0.24)",
  },
  ocean: {
    work: "#4f9ad8",
    break: "#58c7a6",
    glow: "rgba(79, 154, 216, 0.25)",
  },
};
