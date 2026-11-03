import type { ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";

import { APP_MODE } from "@/constants/app-mode";
import { WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants/window";
import { useAppMode } from "@/context/app-mode";
import cn from "@/utils/cn";

function WindowFrame({ children }: { children: ReactNode }) {
  const { appMode } = useAppMode();
  const isDesktop = isTauri() && appMode === APP_MODE.desktop;

  return (
    <main
      className={cn(
        "relative flex flex-col overflow-hidden bg-zinc-900",
        !isDesktop && "rounded-2xl border border-zinc-600",
      )}
      style={{
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
      }}
    >
      <div className="relative min-h-0 flex-1">{children}</div>
    </main>
  );
}

export default WindowFrame;
