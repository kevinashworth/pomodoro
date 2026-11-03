import type { ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";

import { APP_MODE } from "@/constants/app-mode";
import { IS_WEB } from "@/constants/env";
import { useAppMode } from "@/context/app-mode";
import cn from "@/utils/cn";

function Layout({ children }: { children: ReactNode }) {
  const { appMode } = useAppMode();
  const opaque = IS_WEB || (isTauri() && appMode === APP_MODE.desktop);

  return (
    <div className={cn("flex h-screen w-full items-center justify-center overflow-hidden", opaque && "bg-zinc-900")}>
      {children}
    </div>
  );
}

export default Layout;
