import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import HomePage from "@/pages/home";
import PlaygroundPage from "@/pages/playground";
import SettingsPage from "@/pages/settings";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === ",") {
        event.preventDefault();
        navigate("/settings");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

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
