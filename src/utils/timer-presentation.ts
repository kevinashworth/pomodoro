import type { Mode, Status } from "@/types/pomodoro";

type PrimaryActionVariant = "green" | "orange";
type PrimaryActionLabel = "Start" | "Pause" | "Resume";
type SecondaryActionLabel = "Reset" | "Skip";
type SecondaryActionCommand = "reset" | "skip";
type SecondaryActionIcon = "skip-backward" | "skip-forward";

type SecondaryActionPresentation = {
  command: SecondaryActionCommand;
  icon: SecondaryActionIcon;
  iconPlacement: "before" | "after";
  isEnabled: boolean;
  label: SecondaryActionLabel;
};

type SecondaryActionSelection =
  | { kind: "fixed"; action: SecondaryActionPresentation }
  | { kind: "halfway"; beforeHalfway: SecondaryActionPresentation; afterHalfway: SecondaryActionPresentation };

type TimerPresentationState = {
  primaryAction: { label: PrimaryActionLabel; variant: PrimaryActionVariant };
  secondaryAction: SecondaryActionSelection;
};

export type ResolvedTimerPresentation = {
  modeLabel: string;
  primaryAction: { label: PrimaryActionLabel; variant: PrimaryActionVariant };
  secondaryAction: SecondaryActionPresentation;
  svgAccentClassName: "text-green-500" | "text-orange-500";
};

const modeLabels: Record<Mode, string> = {
  work: "Focused Work",
  break: "Break",
};

const createResetAction = (isEnabled: boolean): SecondaryActionPresentation => ({
  command: "reset",
  icon: "skip-backward",
  iconPlacement: "before",
  isEnabled,
  label: "Reset",
});

const createSkipAction = (isEnabled: boolean): SecondaryActionPresentation => ({
  command: "skip",
  icon: "skip-forward",
  iconPlacement: "after",
  isEnabled,
  label: "Skip",
});

const presentationByModeAndStatus: Record<Mode, Record<Status, TimerPresentationState>> = {
  work: {
    idle: {
      primaryAction: { label: "Start", variant: "green" },
      secondaryAction: { kind: "fixed", action: createSkipAction(true) },
    },
    running: {
      primaryAction: { label: "Pause", variant: "orange" },
      secondaryAction: {
        kind: "halfway",
        beforeHalfway: createResetAction(false),
        afterHalfway: createSkipAction(false),
      },
    },
    paused: {
      primaryAction: { label: "Resume", variant: "green" },
      secondaryAction: {
        kind: "halfway",
        beforeHalfway: createResetAction(true),
        afterHalfway: createSkipAction(true),
      },
    },
  },
  break: {
    idle: {
      primaryAction: { label: "Start", variant: "green" },
      secondaryAction: { kind: "fixed", action: createSkipAction(true) },
    },
    running: {
      primaryAction: { label: "Pause", variant: "orange" },
      secondaryAction: {
        kind: "halfway",
        beforeHalfway: createResetAction(false),
        afterHalfway: createSkipAction(false),
      },
    },
    paused: {
      primaryAction: { label: "Resume", variant: "green" },
      secondaryAction: {
        kind: "halfway",
        beforeHalfway: createResetAction(true),
        afterHalfway: createSkipAction(true),
      },
    },
  },
};

const svgAccentClasses: Record<PrimaryActionVariant, ResolvedTimerPresentation["svgAccentClassName"]> = {
  green: "text-green-500",
  orange: "text-orange-500",
};

export function resolveTimerPresentation({
  mode,
  status,
  remainingSeconds,
  phaseMaxSeconds,
}: {
  mode: Mode;
  status: Status;
  remainingSeconds: number;
  phaseMaxSeconds: number;
}): ResolvedTimerPresentation {
  const state = presentationByModeAndStatus[mode][status];
  const secondaryAction =
    state.secondaryAction.kind === "fixed"
      ? state.secondaryAction.action
      : remainingSeconds < phaseMaxSeconds / 2
        ? state.secondaryAction.afterHalfway
        : state.secondaryAction.beforeHalfway;

  return {
    modeLabel: modeLabels[mode],
    primaryAction: state.primaryAction,
    secondaryAction,
    svgAccentClassName: svgAccentClasses[state.primaryAction.variant],
  };
}
