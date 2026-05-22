"use client";

// ─── BrandAccentProvider (Phase A1) ─────────────────────────────
//
// Reads the active brand's primary/secondary colors and binds them to CSS
// custom properties `--brand-primary` and `--brand-secondary` on <html>.
// Any component using the `.bg-brand` / `.text-brand` / `.border-brand`
// utilities (defined in globals.css) automatically re-skins when the user
// switches brands. Falls back to Mykos defaults when no brand is active.
//
// Why a separate provider (not just inline styles on every page):
//   • One source of truth — every page picks up brand color identically
//   • Affordance is global — buttons, focus rings, gradients all match
//   • Switching brands doesn't require a re-render of every component

import { useEffect } from "react";
import { useActiveBrand } from "@/lib/hooks/use-workspace";

const MYKOS_PRIMARY = "#a855f7";
const MYKOS_SECONDARY = "#7c3aed";

export function BrandAccentProvider({ children }: { children: React.ReactNode }) {
  const { brand } = useActiveBrand();

  useEffect(() => {
    const root = document.documentElement;
    const primary = brand?.kit.primaryColor || MYKOS_PRIMARY;
    const secondary = brand?.kit.secondaryColor || brand?.kit.accentColor || MYKOS_SECONDARY;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-secondary", secondary);
  }, [brand]);

  return <>{children}</>;
}
