import Dialog from "@/components/dialog";
import { MAX_MINUTES, MIN_MINUTES } from "@/constants/pomodoro";

type PomodoroSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workMinutes: number;
  breakMinutes: number;
  onWorkMinutesChange: (minutes: number) => void;
  onBreakMinutesChange: (minutes: number) => void;
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
      ariaLabelledBy="pomodoro-settings-title"
    >
      <section
        id="pomodoro-settings"
        className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-200"
      >
        <h2
          id="pomodoro-settings-title"
          className="text-base font-medium text-zinc-900 dark:text-zinc-100"
        >
          Timer settings
        </h2>

        <div className="grid grid-cols-2 gap-2">
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

        <div className="mt-3 flex flex-col text-sm">
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 hover:border-zinc-500 dark:border-zinc-600 dark:hover:border-zinc-300"
            data-testid="settings-close-button"
            aria-label="Close Settings Dialog"
          >
            Done
          </button>
        </div>
      </section>
    </Dialog>
  );
}
