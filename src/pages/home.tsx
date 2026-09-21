import { Link } from "react-router-dom";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import Layout from "@/layout/layout";
import WindowFrame from "@/layout/window-frame";

function HomePage() {
  return (
    <Layout>
      <WindowFrame>
        <PomodoroTimer />
      </WindowFrame>
      {import.meta.env.DEV && (
        <Link className="absolute right-4 bottom-4 text-xs" to="/playground">
          playground
        </Link>
      )}
    </Layout>
  );
}

export default HomePage;
