"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Providers from "@/components/providers";
import Sidebar from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Keep the public research site independent of workspace state and API calls.
  if (pathname === "/") return children;

  return (
    <Providers>
      <Suspense fallback={null}>
        <TopBar />
      </Suspense>
      <div className="flex-1 flex min-h-0">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </Providers>
  );
}
