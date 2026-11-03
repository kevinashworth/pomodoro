import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { APP_MODE } from "@/constants/app-mode";
import { useAppMode } from "@/context/app-mode";

/** Keep in sync with FADE_OUT_MS in src-tauri/src/lib.rs; (FADE_IN_MS is frontend-only.) */
const FADE_IN_MS = 100;
const FADE_OUT_MS = 220;

export function useWindowFade() {
  const { mode } = useAppMode();
  const [visible, setVisible] = useState(true);

  // the mount effect
  useEffect(() => {
    if (!isTauri()) return;

    const unlistenShown = listen("window:shown", () => setVisible(true));
    const unlistenHide = listen("window:hide-requested", () => setVisible(false));

    return () => {
      void unlistenShown.then((fn) => fn());
      void unlistenHide.then((fn) => fn());
    };
  }, []);

  // the visibility effect
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root || !isTauri()) return;

    // The desktop window is a normal always-visible window. Fading is only
    // meaningful for the menu-bar popup.
    if (mode !== APP_MODE.menuBar) {
      root.style.transition = "";
      root.style.opacity = "1";
      return;
    }

    root.style.transition = "opacity " + (visible ? `${FADE_IN_MS}ms ease-in` : `${FADE_OUT_MS}ms ease-out`);
    root.style.opacity = visible ? "1" : "0";
  }, [mode, visible]);
}
