import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLocation, useNavigate } from "react-router-dom";

import {
  APP_MODE,
  APP_MODE_CHANGED_EVENT,
  APP_MODE_REQUEST_EVENT,
  isAppMode,
  type AppMode,
} from "@/constants/app-mode";

type AppModeContextValue = {
  mode: AppMode;
  setAppMode: (mode: AppMode) => void;
};

const AppModeContext = createContext<AppModeContextValue>({
  mode: APP_MODE.desktop,
  setAppMode: () => {},
});

function disposeListeners(listeners: Array<(() => void) | undefined>) {
  for (const unlisten of listeners) {
    try {
      void Promise.resolve(unlisten?.()).catch(() => {
        // Some non-Tauri test environments provide an incomplete event mock.
      });
    } catch {
      // Ignore synchronous cleanup failures from non-Tauri test environments.
    }
  }
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(APP_MODE.desktop);
  const [requestedMode, setRequestedMode] = useState<AppMode | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    const unlisteners: Array<(() => void) | undefined> = [];

    void invoke<AppMode>("get_app_mode")
      .then((value) => {
        if (!disposed && isAppMode(value)) setMode(value);
      })
      .catch(() => {
        console.log("Failed to read app mode");
      });

    void listen<AppMode>(APP_MODE_CHANGED_EVENT, (event) => {
      if (!disposed && isAppMode(event.payload)) setMode(event.payload);
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisteners.push(fn);
      })
      .catch(() => {
        console.log("Failed to listen to app mode changes", APP_MODE_CHANGED_EVENT);
      });

    // Native tray actions ask the frontend to switch mode, so we can navigate
    // home before the desktop window is revealed.
    void listen<AppMode>(APP_MODE_REQUEST_EVENT, (event) => {
      if (!disposed && isAppMode(event.payload)) setRequestedMode(event.payload);
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisteners.push(fn);
      })
      .catch(() => {
        console.log("Failed to listen to app mode requests", APP_MODE_REQUEST_EVENT);
      });

    return () => {
      disposed = true;
      disposeListeners(unlisteners);
    };
  }, []);

  const setAppMode = useCallback(
    (next: AppMode) => {
      if (!isTauri() || next === mode) return;
      setRequestedMode(next);
    },
    [mode],
  );

  // Apply a requested mode only after the timer route has rendered. This keeps
  // Settings from flashing on screen during a mode transition.
  useEffect(() => {
    if (!requestedMode) return;

    if (location.pathname !== "/") {
      navigate("/", { replace: true });
      return;
    }

    const next = requestedMode;
    void invoke("set_app_mode", { mode: next })
      .then(() => setMode(next))
      .catch((error) => {
        console.log("Failed to set app mode", error);
      })
      .finally(() => setRequestedMode((current) => (current === next ? null : current)));
  }, [location.pathname, navigate, requestedMode]);

  return <AppModeContext value={{ mode, setAppMode }}>{children}</AppModeContext>;
}

export function useAppMode(): AppModeContextValue {
  return use(AppModeContext);
}
