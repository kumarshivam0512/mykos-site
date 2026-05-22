"use client";

// ─── Workspace Switcher (Workspace UX sprint) ────────────────────
//
// Two-row picker that sits at the top of the sidebar:
//   ┌ Brand ▾    Nike            ⚙ ┐
//   ┌ Campaign ▾ Air Max release   ┐
//
// Behavior:
//   • Brand picker lists all of the user's brands + "+ New brand"
//   • Campaign picker is scoped to the active brand + "+ New campaign"
//   • Picking a brand strips the URL `?c=` (no active campaign in new brand)
//   • Picking a campaign updates `?c=` — useActiveCampaign re-fetches
//   • "Saving…" / "Saved 2s ago" indicator surfaces useCampaignMutation status
//
// When the sidebar is collapsed, this component collapses to two icons that
// show the picker as a popover on click.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Plus,
  Package,
  Check,
  Loader2,
  CloudUpload,
  CloudOff,
  AlertCircle,
} from "lucide-react";
import {
  useActiveBrand,
  useActiveCampaign,
  useWorkspaceSwitch,
  type SaveStatus,
} from "@/lib/hooks/use-workspace";
import {
  listBrands,
  listCampaignsByBrand,
  createBrand,
} from "@/lib/workspace-client";
import type { Brand } from "@/lib/types";
import type { CampaignRecord } from "@/lib/workspace-client";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
  /** Save status surfaced from useCampaignMutation by the parent page. Optional. */
  saveStatus?: SaveStatus;
  lastSavedAt?: number | null;
}

export function WorkspaceSwitcher({ collapsed, saveStatus, lastSavedAt }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { brand: activeBrand } = useActiveBrand();
  const { campaign: activeCampaign } = useActiveCampaign();
  const { switchCampaign, switchBrand } = useWorkspaceSwitch();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);

  // Close on outside click
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!brandsOpen && !campaignsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setBrandsOpen(false);
        setCampaignsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [brandsOpen, campaignsOpen]);

  // Fetch brands on open
  const ensureBrandsLoaded = async () => {
    if (brands.length > 0 || loadingBrands) return;
    setLoadingBrands(true);
    try { setBrands(await listBrands()); }
    finally { setLoadingBrands(false); }
  };

  // Fetch campaigns when active brand changes
  useEffect(() => {
    if (!activeBrand) {
      setCampaigns([]);
      return;
    }
    let cancelled = false;
    setLoadingCampaigns(true);
    listCampaignsByBrand(activeBrand.id)
      .then((cs) => { if (!cancelled) setCampaigns(cs); })
      .catch(() => { /* swallow — surfaced via empty state */ })
      .finally(() => { if (!cancelled) setLoadingCampaigns(false); });
    return () => { cancelled = true; };
  }, [activeBrand]);

  // Refetch brands list after a new brand is created elsewhere (Brand Hub)
  // Achieved by polling on open, not on every render — cheap.
  const handleOpenBrands = async () => {
    setBrandsOpen((v) => !v);
    setCampaignsOpen(false);
    if (!brandsOpen) {
      setLoadingBrands(true);
      try { setBrands(await listBrands()); }
      finally { setLoadingBrands(false); }
    }
  };

  const handleCreateBrand = async () => {
    setCreatingBrand(true);
    try {
      const fresh = await createBrand({ name: "Untitled Brand" });
      setBrands((bs) => [fresh, ...bs]);
      switchBrand(fresh.id);
      setBrandsOpen(false);
      // Send the user to Brand Hub to fill in details
      router.push(`/brand?brandId=${encodeURIComponent(fresh.id)}`);
    } catch {
      // No-op — keep dropdown open so the user can retry
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!activeBrand) return;
    // Send to Brand Hub with brand pre-selected, in "new campaign for this brand" mode
    router.push(`/brand?brandId=${encodeURIComponent(activeBrand.id)}&newCampaign=1`);
    setCampaignsOpen(false);
  };

  // Collapsed sidebar: just an icon row. Clicking still opens the dropdowns.
  if (collapsed) {
    return (
      <div ref={containerRef} className="p-2 border-b border-border space-y-1 relative">
        <button
          onClick={handleOpenBrands}
          title={activeBrand?.name ?? "Pick brand"}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <span className="w-6 h-6 rounded-md border border-border flex items-center justify-center"
            style={{ background: activeBrand?.kit.primaryColor ?? "transparent" }}>
            <Building2 className="w-3.5 h-3.5 text-white mix-blend-difference" />
          </span>
        </button>
        <button
          onClick={() => { setCampaignsOpen((v) => !v); setBrandsOpen(false); }}
          title={activeCampaign?.productInput.name ?? "Pick campaign"}
          disabled={!activeBrand}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-40"
        >
          <Package className="w-4 h-4 text-muted-foreground" />
        </button>
        {(brandsOpen || campaignsOpen) && (
          <div className="absolute left-full top-0 ml-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
            {brandsOpen && <BrandList brands={brands} activeId={activeBrand?.id ?? null} loading={loadingBrands} onPick={(id) => { switchBrand(id); setBrandsOpen(false); }} onCreate={handleCreateBrand} creating={creatingBrand} />}
            {campaignsOpen && <CampaignList campaigns={campaigns} activeId={activeCampaign?.id ?? null} loading={loadingCampaigns} onPick={(id) => { switchCampaign(id); setCampaignsOpen(false); }} onCreate={handleCreateCampaign} disabled={!activeBrand} />}
          </div>
        )}
      </div>
    );
  }

  // Expanded sidebar
  return (
    <div ref={containerRef} className="p-2 border-b border-border space-y-1 relative">
      {/* Brand row */}
      <button
        onClick={handleOpenBrands}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary transition-colors group"
      >
        <span className="w-6 h-6 rounded-md border border-border flex items-center justify-center shrink-0"
          style={{ background: activeBrand?.kit.primaryColor ?? "transparent" }}>
          <Building2 className="w-3.5 h-3.5 text-white mix-blend-difference" />
        </span>
        <span className="flex-1 text-left min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Brand</span>
          <span className="block text-xs font-medium truncate">{activeBrand?.name ?? "Pick a brand"}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${brandsOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Campaign row */}
      <button
        onClick={() => { setCampaignsOpen((v) => !v); setBrandsOpen(false); }}
        disabled={!activeBrand}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaign</span>
          <span className="block text-xs font-medium truncate">{activeCampaign?.productInput.name ?? (activeBrand ? "Pick a campaign" : "—")}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${campaignsOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Save status row (only when a campaign is active) */}
      {activeCampaign && saveStatus && (
        <div className="px-2 py-1 flex items-center gap-1.5 text-[10px]">
          <SaveStatusIcon status={saveStatus} />
          <span className="text-muted-foreground">
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && (lastSavedAt ? `Saved ${formatRelative(lastSavedAt)}` : "Saved")}
            {saveStatus === "error" && "Save failed"}
            {saveStatus === "idle" && (lastSavedAt ? `Saved ${formatRelative(lastSavedAt)}` : "Synced")}
          </span>
        </div>
      )}

      {/* Dropdowns */}
      {brandsOpen && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <BrandList brands={brands} activeId={activeBrand?.id ?? null} loading={loadingBrands} onPick={(id) => { switchBrand(id); setBrandsOpen(false); }} onCreate={handleCreateBrand} creating={creatingBrand} />
        </div>
      )}
      {campaignsOpen && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <CampaignList campaigns={campaigns} activeId={activeCampaign?.id ?? null} loading={loadingCampaigns} onPick={(id) => { switchCampaign(id); setCampaignsOpen(false); }} onCreate={handleCreateCampaign} disabled={!activeBrand} />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function BrandList({
  brands, activeId, loading, onPick, onCreate, creating,
}: {
  brands: Brand[];
  activeId: string | null;
  loading: boolean;
  onPick: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="max-h-72 overflow-y-auto">
      {loading && <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading brands…</div>}
      {!loading && brands.length === 0 && (
        <div className="p-3 text-xs text-muted-foreground">No brands yet.</div>
      )}
      {!loading && brands.map((b) => (
        <button
          key={b.id}
          onClick={() => onPick(b.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary transition-colors ${
            activeId === b.id ? "bg-primary/10 text-primary" : ""
          }`}
        >
          <span className="w-4 h-4 rounded border border-border shrink-0" style={{ background: b.kit.primaryColor ?? "#888" }} />
          <span className="flex-1 truncate">{b.name}</span>
          {activeId === b.id && <Check className="w-3.5 h-3.5" />}
        </button>
      ))}
      <button
        onClick={onCreate}
        disabled={creating}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-primary hover:bg-secondary transition-colors border-t border-border disabled:opacity-50"
      >
        {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        New brand
      </button>
    </div>
  );
}

function CampaignList({
  campaigns, activeId, loading, onPick, onCreate, disabled,
}: {
  campaigns: CampaignRecord[];
  activeId: string | null;
  loading: boolean;
  onPick: (id: string) => void;
  onCreate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="max-h-72 overflow-y-auto">
      {loading && <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading campaigns…</div>}
      {!loading && campaigns.length === 0 && (
        <div className="p-3 text-xs text-muted-foreground">No campaigns under this brand yet.</div>
      )}
      {!loading && campaigns.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary transition-colors ${
            activeId === c.id ? "bg-primary/10 text-primary" : ""
          }`}
        >
          <span className="flex-1 min-w-0">
            <span className="block truncate">{c.productInput.name || "Untitled"}</span>
            <span className="text-[10px] text-muted-foreground">
              {c.status ?? "draft"} · {c.preferences?.aspectRatio ?? "16:9"} · {c.preferences?.tier ?? "premium"}
            </span>
          </span>
          {activeId === c.id && <Check className="w-3.5 h-3.5 shrink-0" />}
        </button>
      ))}
      <button
        onClick={onCreate}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-primary hover:bg-secondary transition-colors border-t border-border disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" />
        New campaign
      </button>
    </div>
  );
}

function SaveStatusIcon({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saving": return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
    case "saved":  return <Check className="w-3 h-3 text-green-500" />;
    case "error":  return <AlertCircle className="w-3 h-3 text-red-500" />;
    case "idle":
    default:       return <CloudUpload className="w-3 h-3 text-muted-foreground/50" />;
  }
}

function formatRelative(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(ts).toLocaleTimeString();
}
