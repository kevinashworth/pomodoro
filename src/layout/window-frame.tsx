import type { ReactNode } from "react";
import { WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants/window";

function WindowFrame({ children }: { children: ReactNode }) {
  return (
    <main
      className="relative overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-900"
      style={{
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
      }}
    >
      {children}
    </main>
  );
}

export default WindowFrame;
