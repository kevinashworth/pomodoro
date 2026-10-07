import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** Keep in sync with FADE_OUT_MS in src-tauri/src/lib.rs; (FADE_IN_MS is frontend-only.) */
const FADE_IN_MS = 100;
const FADE_OUT_MS = 220;

export function useWindowFade() {
  const [visible, setVisible] = useState(!isTauri());

  // the mount effect
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root || !isTauri()) return;

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
    root.style.transition = "opacity " + (visible ? `${FADE_IN_MS}ms ease-in` : `${FADE_OUT_MS}ms ease-out`);
    root.style.opacity = visible ? "1" : "0";
  }, [visible]);
}
