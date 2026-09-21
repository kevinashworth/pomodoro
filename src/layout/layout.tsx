import type { ReactNode } from "react";

function Layout({ children }: { children: ReactNode }) {
  return <div className="flex h-screen w-full items-center justify-center overflow-hidden bg-zinc-900">{children}</div>;
}

export default Layout;
