"use client";

// ─── Home / brand-workspace dashboard (Phase B) ─────────────────
//
// Three states, one page:
//
//   1. NO BRAND YET   → big hero with URL paste, 3 demo templates
//      "Paste your website URL — we'll build your brand in seconds"
//
//   2. BRAND ACTIVE,
//      ZERO CAMPAIGNS → "Welcome to <Brand>. Create your first ad."
//      One CTA, no clutter.
//
//   3. BRAND ACTIVE,
//      HAS CAMPAIGNS → "Continue working" rail (last 3 drafts/in-progress)
//                       + "All campaigns" grid
//                       + persistent "+ New campaign" button
//
// All states use the same shell — no jarring layout shift between them.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sparkles,
  Globe,
  Loader2,
  ArrowRight,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  Pencil,
  Package,
} from "lucide-react";
import {
  useActiveBrand,
  useWorkspaceSwitch,
} from "@/lib/hooks/use-workspace";
import {
  listBrands,
  listCampaignsByBrand,
  createBrand,
  type CampaignRecord,
} from "@/lib/workspace-client";
import type { Brand } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { brand, isLoading: loadingBrand } = useActiveBrand();
  const { switchBrand } = useWorkspaceSwitch();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // On mount: load all brands. If none active but the user has brands, auto-pick most-recent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bs = await listBrands();
        if (cancelled) return;
        setBrands(bs);
        if (!brand && bs.length > 0) {
          switchBrand(bs[0].id);
        }
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When brand changes, load its campaigns.
  useEffect(() => {
    if (!brand) {
      setCampaigns([]);
      return;
    }
    let cancelled = false;
    setLoadingCampaigns(true);
    listCampaignsByBrand(brand.id)
      .then((cs) => { if (!cancelled) setCampaigns(cs); })
      .finally(() => { if (!cancelled) setLoadingCampaigns(false); });
    return () => { cancelled = true; };
  }, [brand]);

  // ── State 1: no brand yet (first run or signed-out journey) ──
  if (!loadingBrand && !loadingBrands && brands.length === 0) {
    return <EmptyStateNoBrand />;
  }

  // ── State 2 & 3: brand active ──
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Hero header */}
        <DashboardHeader brand={brand} campaignCount={campaigns.length} />

        {/* Continue working rail — only when there's something to continue */}
        {campaigns.length > 0 && (
          <ContinueWorkingRail
            campaigns={campaigns.filter((c) => c.status !== "complete").slice(0, 3)}
            onOpen={(id) => router.push(`/creative?c=${encodeURIComponent(id)}`)}
          />
        )}

        {/* Empty state when brand has no campaigns */}
        {!loadingCampaigns && campaigns.length === 0 && brand && (
          <EmptyStateNoCampaigns brand={brand} />
        )}

        {/* All campaigns grid — only when there's more than 3 */}
        {campaigns.length > 0 && (
          <AllCampaignsGrid
            campaigns={campaigns}
            onOpen={(id) => router.push(`/creative?c=${encodeURIComponent(id)}`)}
          />
        )}
      </div>
    </main>
  );
}

// ─── State 1 — No brand yet ─────────────────────────────────────

function EmptyStateNoBrand() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const handleStart = async () => {
    setCreating(true);
    try {
      // For now, create a placeholder brand and route to Brand Hub with URL
      // pre-filled. Phase G upgrades the scraper to extract logo/colors/fonts
      // and pre-populate everything before this redirect lands.
      const fresh = await createBrand({
        name: deriveNameFromUrl(url) || "Untitled Brand",
        websiteUrl: url || undefined,
      });
      const qs = new URLSearchParams({ brandId: fresh.id });
      if (url) qs.set("url", url);
      router.push(`/brand?${qs.toString()}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-medium">
            <Sparkles className="w-3 h-3" /> Welcome to Mykos
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Your AI creative director, in 60 seconds.
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Paste your website. We&apos;ll extract your brand, write the strategy,
            generate scenes, and produce a finished ad — all in one place.
          </p>
        </div>

        {/* URL paste hero */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xl">
          <label className="block text-sm font-medium">Start with your website</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-3">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
                placeholder="suraj-skincare.com"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={creating}
              className="bg-brand hover:opacity-90 text-white font-semibold px-6 rounded-xl flex items-center gap-2 transition-opacity disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {creating ? "Setting up…" : "Start"}
            </button>
          </div>
          <button
            onClick={() => router.push("/brand")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Or set up your brand manually →
          </button>
        </div>

        {/* Demo template cards */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            Or try a sample brand
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_BRANDS.map((b) => (
              <button
                key={b.name}
                onClick={async () => {
                  setCreating(true);
                  try {
                    const fresh = await createBrand({
                      name: b.name,
                      description: b.tagline,
                      kit: {
                        primaryColor: b.primary,
                        secondaryColor: b.secondary,
                        accentColor: b.accent,
                        displayFont: b.font,
                        bodyFont: b.font,
                      },
                      tagline: b.tagline,
                    });
                    router.push(`/brand?brandId=${encodeURIComponent(fresh.id)}`);
                  } finally {
                    setCreating(false);
                  }
                }}
                className="bg-card border border-border hover:border-brand/40 rounded-xl p-4 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-md" style={{ background: b.primary }} />
                  <span className="text-sm font-semibold">{b.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{b.tagline}</p>
                <div className="mt-3 text-[10px] text-muted-foreground/60 group-hover:text-brand transition-colors flex items-center gap-1">
                  Try this brand <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

const SAMPLE_BRANDS = [
  { name: "Suraj Skincare", tagline: "Clean-beauty D2C from Bengaluru", primary: "#d4a574", secondary: "#8b5e3c", accent: "#3a2a1a", font: "Cormorant Garamond" },
  { name: "Vault Athletics", tagline: "Performance gym wear for the everyday athlete", primary: "#10b981", secondary: "#059669", accent: "#0a0a0a", font: "Space Grotesk" },
  { name: "Saanjh Coffee", tagline: "Single-origin Indian specialty coffee", primary: "#7c2d12", secondary: "#dc2626", accent: "#fef3c7", font: "Playfair Display" },
];

// ─── Dashboard header ───────────────────────────────────────────

function DashboardHeader({ brand, campaignCount }: { brand: Brand | null; campaignCount: number }) {
  const router = useRouter();
  if (!brand) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome back.</h1>
        <p className="text-muted-foreground">Pick a brand to continue, or create a new one.</p>
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl border border-border shadow-sm" style={{ background: brand.kit.primaryColor ?? "#888" }} />
          <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {campaignCount === 0
            ? "No campaigns yet — let's make your first ad."
            : `${campaignCount} campaign${campaignCount === 1 ? "" : "s"} · ready when you are.`}
        </p>
      </div>
      <button
        onClick={() => router.push(`/brand?brandId=${encodeURIComponent(brand.id)}&newCampaign=1`)}
        className="bg-brand hover:opacity-90 text-white font-semibold px-5 py-3 rounded-xl flex items-center gap-2 transition-opacity"
      >
        <Plus className="w-4 h-4" /> New campaign
      </button>
    </div>
  );
}

// ─── Continue working rail ──────────────────────────────────────

function ContinueWorkingRail({
  campaigns,
  onOpen,
}: {
  campaigns: CampaignRecord[];
  onOpen: (id: string) => void;
}) {
  if (campaigns.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Continue working</h2>
          <p className="text-sm text-muted-foreground/70">Your latest drafts and in-progress campaigns.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} prominent onOpen={() => onOpen(c.id)} />
        ))}
      </div>
    </section>
  );
}

// ─── All campaigns grid ─────────────────────────────────────────

function AllCampaignsGrid({
  campaigns,
  onOpen,
}: {
  campaigns: CampaignRecord[];
  onOpen: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">All campaigns</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} onOpen={() => onOpen(c.id)} />
        ))}
      </div>
    </section>
  );
}

// ─── Campaign card (prominent + compact variants) ───────────────

function CampaignCard({
  campaign,
  prominent,
  onOpen,
}: {
  campaign: CampaignRecord;
  prominent?: boolean;
  onOpen: () => void;
}) {
  const thumb = campaign.assets?.images?.[0] ?? campaign.assets?.videoUrl ?? null;
  const status = campaign.status ?? "draft";
  const updated = friendlyRelative(campaign.updatedAt);

  return (
    <button
      onClick={onOpen}
      className="group bg-card border border-border hover:border-brand/40 rounded-2xl overflow-hidden text-left transition-all hover:shadow-lg"
    >
      <div className={`relative bg-secondary/40 ${prominent ? "aspect-video" : "aspect-[4/3]"}`}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={campaign.productInput.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <ImageIcon className={prominent ? "w-10 h-10" : "w-6 h-6"} />
          </div>
        )}
        <span className={`absolute top-2 left-2 ${statusBadgeClasses(status)}`}>
          {statusIcon(status)} {statusLabel(status)}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <div className={`font-semibold truncate ${prominent ? "text-base" : "text-sm"}`}>
          {campaign.productInput.name || "Untitled campaign"}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
          <Clock className="w-3 h-3" /> {updated}
          <span className="text-muted-foreground/40">·</span>
          <span>{campaign.preferences?.aspectRatio ?? "16:9"}</span>
        </div>
      </div>
    </button>
  );
}

function statusBadgeClasses(status: string): string {
  const base = "text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1";
  switch (status) {
    case "complete": return `${base} bg-emerald-500/15 text-emerald-400`;
    case "in_progress": return `${base} bg-amber-500/15 text-amber-400`;
    case "archived": return `${base} bg-zinc-500/20 text-zinc-400`;
    case "draft":
    default: return `${base} bg-zinc-500/15 text-zinc-300`;
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "complete": return <CheckCircle2 className="w-2.5 h-2.5" />;
    case "in_progress": return <Loader2 className="w-2.5 h-2.5" />;
    case "draft":
    default: return <Pencil className="w-2.5 h-2.5" />;
  }
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In progress";
  if (status === "complete") return "Complete";
  if (status === "archived") return "Archived";
  return "Draft";
}

function friendlyRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "—";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Empty state: brand has no campaigns ────────────────────────

function EmptyStateNoCampaigns({ brand }: { brand: Brand }) {
  const router = useRouter();
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-4">
      <div className="w-12 h-12 mx-auto bg-brand/10 rounded-2xl flex items-center justify-center">
        <Package className="w-6 h-6 text-brand" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Make your first ad for {brand.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a template, describe the product, choose your format — we&apos;ll do the rest.
        </p>
      </div>
      <button
        onClick={() => router.push(`/brand?brandId=${encodeURIComponent(brand.id)}&newCampaign=1`)}
        className="bg-brand hover:opacity-90 text-white font-semibold px-5 py-3 rounded-xl inline-flex items-center gap-2 transition-opacity"
      >
        <Sparkles className="w-4 h-4" /> Create your first campaign
      </button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function deriveNameFromUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const root = host.split(".")[0];
    return root.charAt(0).toUpperCase() + root.slice(1).replace(/-/g, " ");
  } catch {
    return "";
  }
}
