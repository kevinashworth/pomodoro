import { useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { formatClock } from "@/utils/time";

const TOMATO = "🍅";

export function useTrayTitle(enabled: boolean, remainingSeconds: number, suspended = false) {
  const title = enabled ? `${formatClock(remainingSeconds)}  ${TOMATO}` : TOMATO;

  useEffect(() => {
    if (!isTauri()) return;
    // While the native scheduler owns the tray title (running timer in the menu
    // bar), leave it alone so the two don't fight over the same string.
    if (suspended) return;
    void invoke("set_tray_title", { title });
  }, [title, suspended]);
}
