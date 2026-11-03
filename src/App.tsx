import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { IS_PLAYGROUND_ENABLED } from "@/constants/env";
import { isAppMenuCommand, MENU_COMMAND, TRAY_SHOW_REQUEST_EVENT, type AppMenuCommand } from "@/constants/menu";
import { useMenuCommands } from "@/hooks/use-menu-commands";
import { useWindowFade } from "@/hooks/use-window-fade";
import HomePage from "@/pages/home";
import SettingsPage from "@/pages/settings";

const PlaygroundPage = lazy(() => import("@/pages/playground"));

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showRequest, setShowRequest] = useState<AppMenuCommand | null>(null);

  // Tray menu actions ask the frontend to navigate first; the window is only
  // shown after the requested route has rendered.
  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<AppMenuCommand>(TRAY_SHOW_REQUEST_EVENT, (event) => {
      if (!disposed && isAppMenuCommand(event.payload)) setShowRequest(event.payload);
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => {
        console.log("Failed to listen to tray show requests", TRAY_SHOW_REQUEST_EVENT);
      });

    return () => {
      disposed = true;
      try {
        void Promise.resolve(unlisten?.()).catch(() => {
          // Some non-Tauri test environments provide an incomplete event mock.
        });
      } catch {
        // Ignore synchronous cleanup failures from non-Tauri test environments.
      }
    };
  }, []);

  useEffect(() => {
    if (!showRequest) return;

    const request = showRequest;
    const target = request === MENU_COMMAND.settings ? "/settings" : "/";
    if (location.pathname !== target) {
      navigate(target, { replace: true });
      return;
    }

    void invoke("show_main_window")
      .catch((error) => {
        console.log("Failed to show window", error);
      })
      .finally(() => setShowRequest((current) => (current === request ? null : current)));
  }, [location.pathname, navigate, showRequest]);

  useMenuCommands();
  useWindowFade();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {IS_PLAYGROUND_ENABLED && (
        <Route
          path="/playground"
          element={
            <Suspense fallback={null}>
              <PlaygroundPage />
            </Suspense>
          }
        />
      )}
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
