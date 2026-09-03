import { Link } from "react-router-dom";
import { MAX_MINUTES, MIN_MINUTES } from "@/constants/pomodoro";
import { usePomodoroSettings } from "@/context/pomodoro-settings";

function SettingsPage() {
  const {
    workMinutes,
    breakMinutes,
    soundEnabled,
    notificationsEnabled,
    mini,
    setWorkMinutes,
    setBreakMinutes,
    setSoundEnabled,
    setNotificationsEnabled,
    setMini,
  } = usePomodoroSettings();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-amber-50 px-4 py-8 dark:bg-zinc-950">
      <main className="flex max-w-md flex-col gap-3 p-3 text-sm text-zinc-700 dark:text-zinc-200">
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
              onChange={(event) => setWorkMinutes(Number(event.target.value))}
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
              onChange={(event) => setBreakMinutes(Number(event.target.value))}
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
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Sound
          </label>
          <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              data-testid="notifications-toggle"
              checked={notificationsEnabled}
              onChange={(event) =>
                setNotificationsEnabled(event.target.checked)
              }
            />
            Notifications
          </label>
          <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              data-testid="mini-mode-toggle"
              checked={mini}
              onChange={(event) => setMini(event.target.checked)}
            />
            Mini mode
          </label>
        </div>

        <Link
          to="/"
          className="absolute right-4 bottom-4 text-xs tracking-wide text-zinc-500/65 underline decoration-zinc-500/30 underline-offset-2 transition-colors hover:text-zinc-700/85 dark:text-zinc-400/55 dark:hover:text-zinc-200/70"
        >
          back to timer
        </Link>
      </main>
    </div>
  );
}

export default SettingsPage;
