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
  appMode: AppMode;
  setAppMode: (appMode: AppMode) => void;
};

const AppModeContext = createContext<AppModeContextValue>({
  appMode: APP_MODE.desktop,
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
  const [currentAppMode, setCurrentAppMode] = useState<AppMode>(APP_MODE.desktop);
  const [requestedAppMode, setRequestedAppMode] = useState<AppMode | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    const unlisteners: Array<(() => void) | undefined> = [];

    void invoke<AppMode>("get_app_mode")
      .then((value) => {
        if (!disposed && isAppMode(value)) setCurrentAppMode(value);
      })
      .catch(() => {
        console.log("Failed to read app mode");
      });

    void listen<AppMode>(APP_MODE_CHANGED_EVENT, (event) => {
      if (!disposed && isAppMode(event.payload)) setCurrentAppMode(event.payload);
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisteners.push(fn);
      })
      .catch(() => {
        console.log("Failed to listen to app mode changes", APP_MODE_CHANGED_EVENT);
      });

    // Native tray actions ask the frontend to switch app mode, so we can navigate
    // home before the desktop window is revealed.
    void listen<AppMode>(APP_MODE_REQUEST_EVENT, (event) => {
      if (!disposed && isAppMode(event.payload)) setRequestedAppMode(event.payload);
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
      if (!isTauri() || next === currentAppMode) return;
      setRequestedAppMode(next);
    },
    [currentAppMode],
  );

  // Apply a requested app mode only after the timer route has rendered. This keeps
  // Settings from flashing on screen during an app mode transition.
  useEffect(() => {
    if (!requestedAppMode) return;

    if (location.pathname !== "/") {
      navigate("/", { replace: true });
      return;
    }

    const next = requestedAppMode;
    void invoke("set_app_mode", { appMode: next })
      .then(() => setCurrentAppMode(next))
      .catch((error) => {
        console.log("Failed to set app mode", error);
      })
      .finally(() => setRequestedAppMode((current) => (current === next ? null : current)));
  }, [location.pathname, navigate, requestedAppMode]);

  return <AppModeContext value={{ appMode: currentAppMode, setAppMode }}>{children}</AppModeContext>;
}

export function useAppMode(): AppModeContextValue {
  return use(AppModeContext);
}
