import type { ReactNode } from "react";

import cn from "@/utils/cn";
import { IS_WEB } from "@/constants/env";

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("flex h-screen w-full items-center justify-center overflow-hidden", IS_WEB && "bg-zinc-900")}>
      {children}
    </div>
  );
}

export default Layout;
