import type { Phase, Status } from "@/types/pomodoro";

type AccentColor = "blue" | "dark" | "green" | "orange";
type PrimaryActionVariant = Exclude<AccentColor, "dark">;

const svgAccentClasses: Record<AccentColor, string> = {
  blue: "text-blue-500 dark:text-blue-600 focus:outline-blue-600",
  dark: "text-zinc-700 dark:text-zinc-800",
  green: "text-green-500 dark:text-green-600",
  orange: "text-orange-500 dark:text-orange-600 focus-visible:outline-orange-600",
};

const phaseLabels: Record<Phase, string> = {
  work: "Focused Work",
  break: "Break",
};

const phaseColors: Record<Phase, PrimaryActionVariant> = {
  work: "orange",
  break: "blue",
};

const primaryLabels: Record<Status, "Start" | "Pause" | "Resume"> = {
  idle: "Start",
  running: "Pause",
  paused: "Resume",
};

type SecondaryAction = {
  command: "reset" | "skip";
  label: "Reset" | "Skip";
  icon: "skip-backward" | "skip-forward";
  iconPlacement: "before" | "after";
  isEnabled: boolean;
};

export type ResolvedTimerPresentation = {
  phaseLabel: string;
  primaryAction: { label: "Start" | "Pause" | "Resume"; variant: PrimaryActionVariant };
  secondaryAction: SecondaryAction;
  svgAccentClassName: string;
};

const reset = (isEnabled: boolean): SecondaryAction => ({
  command: "reset",
  label: "Reset",
  icon: "skip-backward",
  iconPlacement: "before",
  isEnabled,
});

const skip = (isEnabled: boolean): SecondaryAction => ({
  command: "skip",
  label: "Skip",
  icon: "skip-forward",
  iconPlacement: "after",
  isEnabled,
});

// The phase color marks an active session: the ring and the Pause button use it
// while running or paused. An idle timer shows a dark ring and offers Skip. Once
// started, the secondary action is Reset in the first half and Skip in the
// second, and it is available only while paused.
export function resolveTimerPresentation({
  phase,
  status,
  remainingSeconds,
  phaseMaxSeconds,
}: {
  phase: Phase;
  status: Status;
  remainingSeconds: number;
  phaseMaxSeconds: number;
}): ResolvedTimerPresentation {
  const phaseColor = phaseColors[phase];
  const secondaryAction =
    status === "idle"
      ? skip(true)
      : remainingSeconds < phaseMaxSeconds / 2
        ? skip(status === "paused")
        : reset(status === "paused");

  return {
    phaseLabel: phaseLabels[phase],
    primaryAction: { label: primaryLabels[status], variant: status === "running" ? phaseColor : "green" },
    secondaryAction,
    svgAccentClassName: svgAccentClasses[status === "idle" ? "dark" : phaseColor],
  };
}
