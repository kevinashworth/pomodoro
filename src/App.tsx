import { Navigate, Route, Routes } from "react-router-dom";
import { useMenuCommands } from "@/hooks/use-menu-commands";
import HomePage from "@/pages/home";
import PlaygroundPage from "@/pages/playground";
import SettingsPage from "@/pages/settings";

function App() {
  useMenuCommands();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/playground" element={<PlaygroundPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
