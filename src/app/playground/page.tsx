"use client";

import Link from "next/link";
import PlaygroundDialog from "@/components/playground-dialog";

export default function PlaygroundPage() {
  return (
    <main className="relative mx-auto flex min-h-screen items-center justify-center w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
        Playground
      </h1>
      <PlaygroundDialog />
      <Link
        href="/"
        className="absolute right-4 bottom-4 text-xs tracking-wide text-zinc-500/65 underline decoration-zinc-500/30 underline-offset-2 transition-colors hover:text-zinc-700/85 dark:text-zinc-400/55 dark:hover:text-zinc-200/70"
      >
        back to main
      </Link>
    </main>
  );
}
