"use client";

import Dialog from "@/components/dialog";
import { CloseIcon } from "@/components/icons/close-icon";
import { MAX_MINUTES, MIN_MINUTES, PRESETS } from "@/constants/pomodoro";
import { type AccentPreset } from "@/types/pomodoro";
import cn from "@/utils/cn";

type PomodoroSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workMinutes: number;
  breakMinutes: number;
  onWorkMinutesChange: (minutes: number) => void;
  onBreakMinutesChange: (minutes: number) => void;
  accentPreset: AccentPreset;
  onAccentPresetChange: (preset: AccentPreset) => void;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  notificationsEnabled: boolean;
  onNotificationsEnabledChange: (enabled: boolean) => void | Promise<void>;
};

export function PomodoroSettingsDialog({
  open,
  onOpenChange,
  workMinutes,
  breakMinutes,
  onWorkMinutesChange,
  onBreakMinutesChange,
  accentPreset,
  onAccentPresetChange,
  soundEnabled,
  onSoundEnabledChange,
  notificationsEnabled,
  onNotificationsEnabledChange,
}: PomodoroSettingsDialogProps) {
  return (
    <Dialog
      id="settings-dialog"
      open={open}
      onOpenChange={onOpenChange}
      className="zoom-in rounded-2xl border border-zinc-200 p-3 shadow-lg duration-200 dark:border-zinc-700 dark:bg-zinc-900 starting:scale-95"
      ariaLabelledBy="pomodoro-settings-title"
      ariaDescribedBy="pomodoro-settings-description"
    >
      <section
        id="pomodoro-settings"
        className="w-full rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2 id="pomodoro-settings-title" className="sr-only">
          Timer settings
        </h2>
        <p id="pomodoro-settings-description" className="sr-only">
          Adjust phase durations, accent colors, and alert preferences.
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          <label className="flex flex-col gap-1">
            Work minutes
            <input
              type="number"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              data-testid="work-minutes-input"
              value={workMinutes}
              onChange={(event) =>
                onWorkMinutesChange(Number(event.target.value))
              }
              className="rounded-md border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            Break minutes
            <input
              type="number"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              data-testid="break-minutes-input"
              value={breakMinutes}
              onChange={(event) =>
                onBreakMinutesChange(Number(event.target.value))
              }
              className="rounded-md border border-zinc-300 px-2 py-1 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="mt-3">
          <p className="mb-1 text-xs text-zinc-500 uppercase">Accent preset</p>
          <div className="flex gap-2">
            {Object.entries(PRESETS).map(([preset, colors]) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAccentPresetChange(preset as AccentPreset)}
                className={cn(
                  "rounded-full border px-2 py-1 text-xs uppercase transition",
                  {
                    "text-zinc-900 ring dark:text-zinc-100":
                      accentPreset === preset,
                    "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400":
                      accentPreset !== preset,
                  },
                )}
                style={{
                  color: colors.work,
                }}
                data-testid={`accent-preset-${preset}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              data-testid="sound-toggle"
              checked={soundEnabled}
              onChange={(event) => onSoundEnabledChange(event.target.checked)}
            />
            Sound
          </label>
          <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              data-testid="notifications-toggle"
              checked={notificationsEnabled}
              onChange={(event) => {
                void onNotificationsEnabledChange(event.target.checked);
              }}
            />
            Notifications
          </label>
        </div>
      </section>
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="pointer-events-auto cursor-pointer text-zinc-400 hover:text-zinc-600"
          data-testid="settings-close-button"
          aria-label="Close Settings Dialog"
        >
          <CloseIcon className="size-6" />
        </button>
      </div>
    </Dialog>
  );
}
