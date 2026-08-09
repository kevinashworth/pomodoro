import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "@/pages/home";
import PlaygroundPage from "@/pages/playground";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/playground" element={<PlaygroundPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
