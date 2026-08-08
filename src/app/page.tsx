import Link from "next/link";
import { PomodoroTimer } from "@/components/pomodoro-timer";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_12%,rgba(255,187,170,0.34),transparent_45%),radial-gradient(circle_at_82%_88%,rgba(165,225,210,0.28),transparent_42%),linear-gradient(140deg,#f8f6f1_0%,#f2efea_54%,#ebe7df_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_20%_12%,rgba(205,102,96,0.21),transparent_45%),radial-gradient(circle_at_82%_88%,rgba(81,154,137,0.24),transparent_42%),linear-gradient(140deg,#1a1a1a_0%,#141414_54%,#101010_100%)]">
      <main className="w-full max-w-md">
        <PomodoroTimer />
      </main>
      <Link
        href="/playground"
        className="absolute right-4 bottom-4 text-xs tracking-wide text-zinc-500/65 underline decoration-zinc-500/30 underline-offset-2 transition-colors hover:text-zinc-700/85 dark:text-zinc-400/55 dark:hover:text-zinc-200/70"
      >
        playground
      </Link>
    </div>
  );
}
