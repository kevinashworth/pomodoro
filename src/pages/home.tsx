import { Link } from "react-router-dom";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { MINI_WINDOW_HEIGHT, MINI_WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants/window";
import { usePomodoroSettings } from "@/context/pomodoro-settings";

function HomePage() {
  const { mini } = usePomodoroSettings();

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden">
      <main
        className="rounded-2xl border border-zinc-300 bg-amber-50 dark:bg-zinc-800"
        style={{
          width: mini ? MINI_WINDOW_WIDTH : WINDOW_WIDTH,
          height: mini ? MINI_WINDOW_HEIGHT : WINDOW_HEIGHT,
        }}
      >
        <PomodoroTimer />
      </main>
      {import.meta.env.DEV && (
        <Link
          to="/playground"
          className="absolute right-4 bottom-4 text-xs tracking-wide text-zinc-500/65 underline decoration-zinc-500/30 underline-offset-2 transition-colors hover:text-zinc-700/85 dark:text-zinc-400/55 dark:hover:text-zinc-200/70"
        >
          playground
        </Link>
      )}
    </div>
  );
}

export default HomePage;
