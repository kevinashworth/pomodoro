import { useEffect, useEffectEvent } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { APP_MENU_EVENT, type AppMenuCommand } from "@/constants/menu";

export function useAppMenuEvent(onCommand: (command: AppMenuCommand) => void): void {
  const onCommandEvent = useEffectEvent(onCommand);

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<AppMenuCommand>(APP_MENU_EVENT, (event) => {
      if (!disposed) onCommandEvent(event.payload);
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => {
        console.log("Failed to listen to app menu event", APP_MENU_EVENT);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
