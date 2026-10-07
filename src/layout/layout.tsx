import type { ReactNode } from "react";

function Layout({ children }: { children: ReactNode }) {
  return <div className="flex h-screen w-full items-center justify-center overflow-hidden">{children}</div>;
}

export default Layout;
