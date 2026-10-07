import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { IS_PLAYGROUND_ENABLED } from "@/constants/env";
import { useMenuCommands } from "@/hooks/use-menu-commands";
import { useWindowFade } from "@/hooks/use-window-fade";
import HomePage from "@/pages/home";
import SettingsPage from "@/pages/settings";

const PlaygroundPage = lazy(() => import("@/pages/playground"));

function App() {
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
