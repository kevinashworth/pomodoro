import { useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { formatClock } from "@/utils/time";

const TOMATO = "🍅";

export function useTrayTitle(enabled: boolean, remainingSeconds: number) {
  const title = enabled ? `${formatClock(remainingSeconds)}  ${TOMATO}` : TOMATO;

  useEffect(() => {
    if (!isTauri()) return;
    void invoke("set_tray_title", { title });
  }, [title]);
}
