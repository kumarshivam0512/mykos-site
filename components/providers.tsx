"use client";

import { SessionProvider } from "next-auth/react";
import { BrandAccentProvider } from "@/components/brand-accent-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BrandAccentProvider>{children}</BrandAccentProvider>
    </SessionProvider>
  );
}
