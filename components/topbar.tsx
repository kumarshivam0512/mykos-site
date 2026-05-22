"use client";

// ─── TopBar (Phase A2) ──────────────────────────────────────────
//
// Persistent global chrome that lives above every page. Contains:
//   • Mykos logo (links home)
//   • Workspace picker: Brand ▾ · Campaign ▾   (Linear-style compact)
//   • Breadcrumbs (Brand › Campaign › current page)
//   • Save indicator (driven by global Zustand state — any page can save)
//   • + New menu (campaign, brand, character, location)
//   • Help & profile menu (right side)
//
// Design philosophy:
//   • Always visible, never noisy — 56px tall
//   • Compact picker pills, not full-width dropdowns
//   • Brand-aware: when a brand is active, the picker shows its color swatch
//
// Mobile: collapses to logo + workspace picker + profile (rest hidden in menu).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Zap,
  ChevronDown,
  Plus,
  Check,
  Loader2,
  Building2,
  Package,
  ChevronRight,
  HelpCircle,
  LogOut,
  LogIn,
  User as UserIcon,
  Sparkles,
  Cloud,
  CloudOff,
  AlertCircle,
  Cog,
} from "lucide-react";
import {
  useActiveBrand,
  useActiveCampaign,
  useWorkspaceSwitch,
} from "@/lib/hooks/use-workspace";
import {
  listBrands,
  listCampaignsByBrand,
  createBrand,
  type CampaignRecord,
} from "@/lib/workspace-client";
import type { Brand } from "@/lib/types";
import { useAdStore } from "@/store/use-ad-store";

// Top-level path → human label for breadcrumbs.
const PATH_LABELS: Record<string, string> = {
  "": "Home",
  "brand": "Brand",
  "creative": "Creative",
  "performance": "Performance",
  "campaigns": "Campaigns",
  "characters": "Characters",
  "locations": "Locations",
  "video": "Video",
  "poster": "Poster",
  "post": "Post studio",
  "audience": "Audience",
  "competitors": "Competitors",
  "platforms": "Platforms",
  "analytics": "Analytics",
  "recommendations": "Recommendations",
  "c": "Campaign",
  "new": "New",
  "settings": "Settings",
  "library": "Library",
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { brand } = useActiveBrand();
  const { campaign } = useActiveCampaign();
  const { switchBrand, switchCampaign } = useWorkspaceSwitch();
  const saveStatus = useAdStore((s) => s.saveStatus);
  const lastSavedAt = useAdStore((s) => s.lastSavedAt);

  // Hide topbar on the auth page where it would distract.
  if (pathname === "/login") return null;

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-40">
      <div className="h-full px-3 flex items-center gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary transition-colors shrink-0">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:inline font-bold text-sm tracking-tight">Mykos</span>
        </Link>

        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

        {/* Workspace picker */}
        <WorkspacePicker
          brand={brand}
          campaign={campaign}
          onPickBrand={switchBrand}
          onPickCampaign={switchCampaign}
        />

        {/* Breadcrumbs — desktop only, after the picker */}
        <Breadcrumbs pathname={pathname} brand={brand} campaign={campaign} />

        <div className="flex-1" />

        {/* Save indicator */}
        {campaign && (
          <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
        )}

        {/* + New */}
        <NewMenu brandId={brand?.id} onCreateBrand={async () => {
          const fresh = await createBrand({ name: "Untitled Brand" });
          router.push(`/brand?brandId=${encodeURIComponent(fresh.id)}`);
        }} />

        {/* Help */}
        <button title="Help" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Profile */}
        <ProfileMenu session={session ?? null} />
      </div>
    </header>
  );
}

// ─── Workspace picker (brand + campaign, compact) ───────────────

function WorkspacePicker({
  brand,
  campaign,
  onPickBrand,
  onPickCampaign,
}: {
  brand: Brand | null;
  campaign: CampaignRecord | null;
  onPickBrand: (id: string) => void;
  onPickCampaign: (id: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"brand" | "campaign" | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const openBrands = async () => {
    setOpen(open === "brand" ? null : "brand");
    if (open !== "brand" && brands.length === 0) {
      setLoadingBrands(true);
      try { setBrands(await listBrands()); }
      finally { setLoadingBrands(false); }
    }
  };

  const openCampaigns = async () => {
    if (!brand) return;
    setOpen(open === "campaign" ? null : "campaign");
    if (open !== "campaign") {
      setLoadingCampaigns(true);
      try { setCampaigns(await listCampaignsByBrand(brand.id)); }
      finally { setLoadingCampaigns(false); }
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {/* Brand pill */}
      <button
        onClick={openBrands}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors text-sm group"
      >
        <span
          className="w-4 h-4 rounded border border-border shrink-0"
          style={{ background: brand?.kit.primaryColor ?? "transparent" }}
        />
        <span className={`truncate max-w-[140px] ${brand ? "" : "text-muted-foreground"}`}>
          {brand?.name ?? "Pick a brand"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {/* Separator + campaign pill */}
      {brand && (
        <>
          <span className="text-muted-foreground/40">/</span>
          <button
            onClick={openCampaigns}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors text-sm group max-w-[200px]"
          >
            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className={`truncate ${campaign ? "" : "text-muted-foreground"}`}>
              {campaign?.productInput.name ?? "Pick a campaign"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </>
      )}

      {/* Dropdowns */}
      {open === "brand" && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Your brands
          </div>
          <PickerList
            loading={loadingBrands}
            emptyText="No brands yet"
            items={brands.map((b) => ({
              id: b.id,
              primary: b.name,
              secondary: b.tagline,
              swatch: b.kit.primaryColor,
              active: brand?.id === b.id,
              onPick: () => { onPickBrand(b.id); setOpen(null); },
            }))}
          />
          <button
            onClick={async () => {
              const fresh = await createBrand({ name: "Untitled Brand" });
              router.push(`/brand?brandId=${encodeURIComponent(fresh.id)}`);
              setOpen(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-brand hover:bg-secondary transition-colors border-t border-border"
          >
            <Plus className="w-4 h-4" /> New brand
          </button>
          {brand && (
            <button
              onClick={() => { router.push(`/brand?brandId=${encodeURIComponent(brand.id)}`); setOpen(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-t border-border"
            >
              <Cog className="w-3.5 h-3.5" /> Edit {brand.name}
            </button>
          )}
        </div>
      )}

      {open === "campaign" && brand && (
        <div className="absolute left-0 sm:left-[calc(180px+1rem)] top-full mt-1 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Campaigns in {brand.name}
            </span>
          </div>
          <PickerList
            loading={loadingCampaigns}
            emptyText="No campaigns yet"
            items={campaigns.map((c) => ({
              id: c.id,
              primary: c.productInput.name || "Untitled",
              secondary: `${c.status ?? "draft"} · ${c.preferences?.aspectRatio ?? "16:9"}`,
              active: campaign?.id === c.id,
              onPick: () => { onPickCampaign(c.id); setOpen(null); },
            }))}
          />
          <button
            onClick={() => { router.push(`/brand?brandId=${encodeURIComponent(brand.id)}&newCampaign=1`); setOpen(null); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-brand hover:bg-secondary transition-colors border-t border-border"
          >
            <Plus className="w-4 h-4" /> New campaign
          </button>
        </div>
      )}
    </div>
  );
}

interface PickerItem {
  id: string;
  primary: string;
  secondary?: string;
  swatch?: string;
  active?: boolean;
  onPick: () => void;
}

function PickerList({
  loading,
  emptyText,
  items,
}: {
  loading: boolean;
  emptyText: string;
  items: PickerItem[];
}) {
  if (loading) {
    return (
      <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
      </div>
    );
  }
  if (items.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="max-h-72 overflow-y-auto py-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onPick}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors ${
            item.active ? "bg-brand/10" : ""
          }`}
        >
          {item.swatch !== undefined && (
            <span className="w-4 h-4 rounded border border-border shrink-0" style={{ background: item.swatch ?? "#888" }} />
          )}
          <span className="flex-1 min-w-0">
            <span className={`block text-sm truncate ${item.active ? "text-brand font-medium" : ""}`}>
              {item.primary}
            </span>
            {item.secondary && (
              <span className="block text-[10px] text-muted-foreground truncate">{item.secondary}</span>
            )}
          </span>
          {item.active && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ─── Breadcrumbs ────────────────────────────────────────────────

function Breadcrumbs({
  pathname,
  brand,
  campaign,
}: {
  pathname: string;
  brand: Brand | null;
  campaign: CampaignRecord | null;
}) {
  const crumbs = useMemo(() => {
    // For the home page we show nothing.
    if (pathname === "/") return [];
    // For /c/[id]/* and /brand/* routes, the workspace picker already shows
    // brand+campaign, so we add only the trailing page label.
    const segments = pathname.split("/").filter(Boolean);
    const interesting: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      // skip ids (long random strings)
      if (s.length > 12 && /[a-z0-9]/.test(s)) continue;
      const label = PATH_LABELS[s] ?? capitalize(s.replace(/-/g, " "));
      interesting.push(label);
    }
    return interesting;
  }, [pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1 text-xs text-muted-foreground ml-2">
      <ChevronRight className="w-3 h-3 opacity-50" />
      {crumbs.map((label, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
          <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>{label}</span>
        </span>
      ))}
    </nav>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Save indicator (reads global Zustand state) ────────────────

function SaveIndicator({ status, lastSavedAt }: { status: string; lastSavedAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  if (status === "idle" && !lastSavedAt) return null;

  const label = (() => {
    if (status === "saving") return "Saving…";
    if (status === "error") return "Save failed";
    if (lastSavedAt) {
      const s = Math.round((now - lastSavedAt) / 1000);
      if (s < 5) return "Saved just now";
      if (s < 60) return `Saved ${s}s ago`;
      const m = Math.round(s / 60);
      if (m < 60) return `Saved ${m}m ago`;
      return "Saved";
    }
    return "Synced";
  })();

  const icon = (() => {
    if (status === "saving") return <Loader2 className="w-3 h-3 animate-spin" />;
    if (status === "error") return <AlertCircle className="w-3 h-3 text-red-400" />;
    if (status === "saved") return <Cloud className="w-3 h-3 text-emerald-400" />;
    return <CloudOff className="w-3 h-3 opacity-50" />;
  })();

  return (
    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-1 rounded-md">
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ─── + New menu ─────────────────────────────────────────────────

function NewMenu({ brandId, onCreateBrand }: { brandId?: string; onCreateBrand: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-brand hover:opacity-90 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">New</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          {brandId ? (
            <button
              onClick={() => { router.push(`/brand?brandId=${encodeURIComponent(brandId)}&newCampaign=1`); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
            >
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="flex-1">New campaign</span>
              <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">N</kbd>
            </button>
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">Pick a brand first to create a campaign</div>
          )}
          <button
            onClick={() => { onCreateBrand(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
          >
            <Building2 className="w-4 h-4 text-muted-foreground" />
            New brand
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => { router.push("/creative/characters"); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors text-muted-foreground"
          >
            <UserIcon className="w-4 h-4" />
            New character
          </button>
          <button
            onClick={() => { router.push("/creative/locations"); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors text-muted-foreground"
          >
            <Building2 className="w-4 h-4" />
            New location
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Profile menu ───────────────────────────────────────────────

function ProfileMenu({ session }: { session: { user?: { email?: string | null; name?: string | null } } | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initials = (session?.user?.name ?? session?.user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center text-xs font-medium"
        title={session?.user?.email ?? "Account"}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          {session?.user ? (
            <>
              <div className="px-3 py-2 border-b border-border">
                <div className="text-sm font-medium truncate">{session.user.name ?? "Account"}</div>
                <div className="text-[11px] text-muted-foreground truncate">{session.user.email}</div>
              </div>
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors text-muted-foreground"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => { router.push("/login"); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
}
