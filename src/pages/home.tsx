import { PomodoroTimer } from "@/components/pomodoro-timer";
import Layout from "@/layout/layout";
import WindowFrame from "@/layout/window-frame";

function HomePage() {
  return (
    <Layout>
      <WindowFrame>
        <PomodoroTimer />
      </WindowFrame>
    </Layout>
  );
}

export default HomePage;
