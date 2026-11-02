import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import MinutesInput from "@/components/numeric-input/minutes-input";
import { MAX_MINUTES, MIN_MINUTES } from "@/constants/pomodoro";
import { isSoundId, NONE_SOUND_VALUE, SOUNDS } from "@/constants/sounds";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { useSounds } from "@/context/sounds";
import Layout from "@/layout/layout";
import WindowFrame from "@/layout/window-frame";
import { checkPermission } from "@/utils/notifications";
import { version } from "@/version.mjs";

import type { SoundId } from "@/constants/sounds";

function SettingsPage() {
  const {
    workMinutes,
    breakMinutes,
    soundEnabled,
    workEndSound,
    breakEndSound,
    notificationsEnabled,
    showTimerInMenuBar,
    setWorkMinutes,
    setBreakMinutes,
    setSoundEnabled,
    setWorkEndSound,
    setBreakEndSound,
    setNotificationsEnabled,
    setShowTimerInMenuBar,
  } = usePomodoroSettings();
  const { playSound, fadeOutActiveSound } = useSounds();

  // Leaving Settings (e.g. "Back to timer") should not let a long preview
  // bleed into the timer page.
  useEffect(() => fadeOutActiveSound, [fadeOutActiveSound]);

  function handlePhaseSoundChange(value: string, apply: (sound: SoundId | null) => void) {
    if (value === NONE_SOUND_VALUE) {
      apply(null);
      fadeOutActiveSound();
      return;
    }
    if (!isSoundId(value)) return;
    apply(value);
    playSound(value);
  }

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
            <p className="text-xs leading-none text-orange-500" data-testid="pomodoro-version">
              version {version}
            </p>
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
                Play Sounds
              </label>
              <label className="flex items-center justify-between gap-2 pl-6 text-zinc-200">
                Work ends
                <select
                  className="rounded border border-zinc-600 bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200"
                  data-testid="work-end-sound-select"
                  value={workEndSound ?? NONE_SOUND_VALUE}
                  onChange={(event) => handlePhaseSoundChange(event.target.value, setWorkEndSound)}
                >
                  <option value={NONE_SOUND_VALUE}>None</option>
                  {SOUNDS.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 pl-6 text-zinc-200">
                Break ends
                <select
                  className="rounded border border-zinc-600 bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200"
                  data-testid="break-end-sound-select"
                  value={breakEndSound ?? NONE_SOUND_VALUE}
                  onChange={(event) => handlePhaseSoundChange(event.target.value, setBreakEndSound)}
                >
                  <option value={NONE_SOUND_VALUE}>None</option>
                  {SOUNDS.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-zinc-200">
                <input
                  type="checkbox"
                  className="size-4 accent-blue-500"
                  data-testid="notifications-toggle"
                  checked={notificationsEnabled}
                  onChange={(event) => handleNotificationsToggleChange(event.target.checked)}
                />
                Show Notifications
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
