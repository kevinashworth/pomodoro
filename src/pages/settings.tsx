import { invoke, isTauri } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";

import MinutesInput from "@/components/numeric-input/minutes-input";
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
        <div className="flex h-full flex-col p-4">
          <div>
            <h1 className="leading-none text-orange-500">Pomodoro</h1>
            <div className="my-1 h-px bg-orange-500"></div>
          </div>

          <div className="grow">
            <h2 className="font-bold text-zinc-200">Timer settings</h2>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-zinc-200">
                Work minutes
                <MinutesInput
                  max={MAX_MINUTES}
                  min={MIN_MINUTES}
                  name="work-minutes-input"
                  onChange={setWorkMinutes}
                  testId="work-minutes-input"
                  value={workMinutes}
                />
              </label>
              <label className="flex flex-col gap-1 text-zinc-200">
                Break minutes
                <MinutesInput
                  max={MAX_MINUTES}
                  min={MIN_MINUTES}
                  name="break-minutes-input"
                  onChange={setBreakMinutes}
                  testId="break-minutes-input"
                  value={breakMinutes}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-col text-sm">
              <label className="flex items-center gap-2 text-zinc-200">
                <input
                  type="checkbox"
                  className="size-4 accent-blue-500"
                  data-testid="sound-toggle"
                  checked={soundEnabled}
                  onChange={(event) => setSoundEnabled(event.target.checked)}
                />
                Sound
              </label>
              <label className="flex items-center gap-2 text-zinc-200">
                <input
                  type="checkbox"
                  className="size-4 accent-blue-500"
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
                    className="size-4 accent-blue-500"
                    data-testid="menu-bar-timer-toggle"
                    checked={showTimerInMenuBar}
                    onChange={(event) => setShowTimerInMenuBar(event.target.checked)}
                  />
                  Show timer in menu bar
                </label>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <div>
                {isTauri() && (
                  <button
                    type="button"
                    data-testid="quit-button"
                    onClick={() => void invoke("quit")}
                    className="text-sm text-zinc-200 underline decoration-zinc-300/20 hover:text-red-400 hover:decoration-red-400/20"
                  >
                    Quit
                  </button>
                )}
              </div>
              <div>
                <Link
                  to="/"
                  className="text-sm text-zinc-200 underline decoration-zinc-300/20 hover:text-zinc-100 hover:decoration-zinc-300/80"
                >
                  Back to timer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </WindowFrame>
    </Layout>
  );
}

export default SettingsPage;
