import { invoke, isTauri } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { MAX_MINUTES, MIN_MINUTES } from "@/constants/pomodoro";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import Layout from "@/layout/layout";
import WindowFrame from "@/layout/window-frame";
import { checkPermission } from "@/utils/notifications";

function SettingsPage() {
  const {
    workMinutes,
    breakMinutes,
    soundEnabled,
    notificationsEnabled,
    showTimerInMenuBar,
    setWorkMinutes,
    setBreakMinutes,
    setSoundEnabled,
    setNotificationsEnabled,
    setShowTimerInMenuBar,
  } = usePomodoroSettings();

  function handleNotificationsToggleChange(checked: boolean) {
    // when turning on notifications, check if permission is granted, if not, request permission
    if (checked) {
      checkPermission().then((granted) => {
        if (!granted) {
          setNotificationsEnabled(false);
          return;
        }
        setNotificationsEnabled(true);
      });
    }
    // if turning off notifications, just set the state
    setNotificationsEnabled(checked);
  }

  return (
    <Layout>
      <WindowFrame>
        <div className="relative h-full p-4">
          <h2 id="pomodoro-settings-title" className="text-zinc-200">
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
                className="rounded-md bg-zinc-200 px-2 py-1 text-zinc-900 outline-none"
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
                className="rounded-md bg-zinc-200 px-2 py-1 text-zinc-900 outline-none"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-col text-sm">
            <label className="flex items-center gap-2 text-zinc-200">
              <input
                type="checkbox"
                data-testid="sound-toggle"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
              />
              Sound
            </label>
            <label className="flex items-center gap-2 text-zinc-200">
              <input
                type="checkbox"
                data-testid="notifications-toggle"
                checked={notificationsEnabled}
                onChange={(event) => handleNotificationsToggleChange(event.target.checked)}
              />
              Notifications
            </label>
            {isTauri() && (
              <label className="flex items-center gap-2 text-zinc-200">
                <input
                  type="checkbox"
                  data-testid="menu-bar-timer-toggle"
                  checked={showTimerInMenuBar}
                  onChange={(event) => setShowTimerInMenuBar(event.target.checked)}
                />
                Show timer in menu bar
              </label>
            )}
          </div>

          {isTauri() && (
            <button
              type="button"
              data-testid="quit-button"
              onClick={() => void invoke("quit")}
              className="absolute bottom-4 left-4 text-sm text-zinc-200 underline decoration-zinc-300/20 hover:text-red-400 hover:decoration-red-400/20"
            >
              Quit
            </button>
          )}

          <Link
            to="/"
            className="absolute right-4 bottom-4 text-sm text-zinc-200 underline decoration-zinc-300/20 hover:text-zinc-100 hover:decoration-zinc-300/80"
          >
            Back to timer
          </Link>
        </div>
      </WindowFrame>
    </Layout>
  );
}

export default SettingsPage;
