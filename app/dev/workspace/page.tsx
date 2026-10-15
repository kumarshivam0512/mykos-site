"use client";

// ─── /dev/workspace — plumbing diagnostic page ──────────────────
//
// Manual smoke-test surface for the Workspace UX hooks. NOT linked from the
// sidebar — visit it directly to verify:
//   1. Brands can be created/listed/patched/archived
//   2. Campaigns can be created/switched/auto-saved
//   3. The "Saved 2s ago" affordance reflects reality
//   4. URL `?c=` survives reloads
//   5. Two campaigns under the same brand keep their state separately
//
// Remove or gate behind NODE_ENV in production. Kept zero-styling intentional
// so it doesn't look like product UI.

import { useEffect, useState, Suspense } from "react";
import {
  useActiveCampaign,
  useActiveBrand,
  useCampaignMutation,
  useWorkspaceSwitch,
} from "@/lib/hooks/use-workspace";
import {
  listBrands,
  createBrand,
  patchBrand,
  archiveBrand,
  listMyCampaigns,
  createCampaign,
  type CampaignRecord,
} from "@/lib/workspace-client";
import type { Brand } from "@/lib/types";

// Diagnostic page reads `?c=` via useSearchParams and fetches live workspace
// data, so it can't be statically prerendered — render it on demand and wrap
// the search-param consumers in a Suspense boundary.
export const dynamic = "force-dynamic";

export default function WorkspaceProbePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceProbeInner />
    </Suspense>
  );
}

function WorkspaceProbeInner() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [newBrandName, setNewBrandName] = useState("Test Brand");
  const [newCampaignName, setNewCampaignName] = useState("Test Campaign");

  const { campaign, brand, isLoading, error, refresh } = useActiveCampaign();
  const { brand: activeBrand } = useActiveBrand();
  const { switchCampaign, switchBrand, clear } = useWorkspaceSwitch();
  const mutation = useCampaignMutation({ debounceMs: 800 });

  const append = (msg: string) => setLog((l) => [`${new Date().toISOString().slice(11, 19)} · ${msg}`, ...l].slice(0, 30));

  const refreshAll = async () => {
    try {
      const [bs, cs] = await Promise.all([listBrands(), listMyCampaigns()]);
      setBrands(bs);
      setCampaigns(cs);
      append(`refreshed: ${bs.length} brand(s), ${cs.length} campaign(s)`);
    } catch (e) {
      append(`refresh error: ${(e as Error).message}`);
    }
  };

  useEffect(() => { refreshAll(); }, []);

  const handleCreateBrand = async () => {
    try {
      const b = await createBrand({
        name: newBrandName,
        kit: {
          primaryColor: "#a855f7",
          secondaryColor: "#7c3aed",
          accentColor: "#1e1b4b",
          displayFont: "Inter",
          bodyFont: "Inter",
        },
      });
      append(`created brand: ${b.id}`);
      setBrands((bs) => [b, ...bs]);
      switchBrand(b.id);
    } catch (e) {
      append(`create brand error: ${(e as Error).message}`);
    }
  };

  const handleCreateCampaign = async () => {
    if (!activeBrand) {
      append("create campaign error: pick a brand first");
      return;
    }
    try {
      const c = await createCampaign({
        productInput: { name: newCampaignName, description: `${activeBrand.name} — ${newCampaignName}` },
        brandKit: activeBrand.kit,
        brandId: activeBrand.id,
        brief: {
          productCategory: "test",
          targetAudience: { ageRange: "25-34", gender: "all", platforms: [], psychographics: [] },
          personas: [],
          platformBriefs: [],
          adFormat: "cinematic_lifestyle",
          sceneBackdrop: "studio",
          characterSheet: "model",
          duration: 15,
          scenes: [],
          voiceoverScript: "test",
          musicDirection: "cinematic",
          cameraSettings: { focalLength: "50mm", aperture: "f/2.8", colorGrade: "cinematic" },
          endCard: { tagline: "test", ctaText: "Shop now" },
        },
        status: "draft",
      });
      append(`created campaign: ${c.id}`);
      setCampaigns((cs) => [c, ...cs]);
      switchCampaign(c.id);
    } catch (e) {
      append(`create campaign error: ${(e as Error).message}`);
    }
  };

  const handleProbePatch = () => {
    mutation.save({
      preferences: { tier: "ultra", aspectRatio: "9:16" },
    });
    append("scheduled patch: tier=ultra aspect=9:16");
  };

  const handleRotateColor = async () => {
    if (!activeBrand) return;
    const rotated = ["#a855f7", "#10b981", "#f59e0b", "#ec4899"];
    const next = rotated[(rotated.indexOf(activeBrand.kit.primaryColor ?? "") + 1) % rotated.length];
    try {
      const updated = await patchBrand(activeBrand.id, { kit: { ...activeBrand.kit, primaryColor: next } });
      append(`brand color → ${next}`);
      setBrands((bs) => bs.map((b) => b.id === updated.id ? updated : b));
    } catch (e) {
      append(`patch brand error: ${(e as Error).message}`);
    }
  };

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6 text-sm font-mono">
      <header>
        <h1 className="text-lg font-bold">Workspace Plumbing Probe</h1>
        <p className="text-muted-foreground text-xs">URL drives state. Open this page in two tabs, switch campaigns, watch state stay in sync.</p>
      </header>

      <section className="border border-border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold">Active</h2>
        <div>brand: {brand?.name ?? activeBrand?.name ?? <em className="text-muted-foreground">none</em>} {brand && <span className="text-muted-foreground">({brand.id})</span>}</div>
        <div>campaign: {campaign?.productInput.name ?? <em className="text-muted-foreground">none</em>} {campaign && <span className="text-muted-foreground">({campaign.id})</span>}</div>
        <div>load state: {isLoading ? "loading…" : error ? `error: ${error}` : "idle"}</div>
        <div>save state: <span className={mutation.status === "saved" ? "text-green-500" : mutation.status === "error" ? "text-red-500" : "text-muted-foreground"}>{mutation.status}</span> {mutation.lastSavedAt && <span className="text-muted-foreground">(last {Math.round((Date.now() - mutation.lastSavedAt) / 1000)}s ago)</span>}</div>
        {mutation.error && <div className="text-red-500">mutation error: {mutation.error}</div>}
        <div className="flex gap-2 pt-2">
          <button onClick={refresh} className="px-3 py-1 bg-secondary rounded">refresh</button>
          <button onClick={handleProbePatch} disabled={!campaign} className="px-3 py-1 bg-secondary rounded disabled:opacity-40">patch (test debounce)</button>
          <button onClick={handleRotateColor} disabled={!activeBrand} className="px-3 py-1 bg-secondary rounded disabled:opacity-40">rotate brand color</button>
          <button onClick={clear} className="px-3 py-1 bg-secondary rounded">clear active</button>
        </div>
      </section>

      <section className="border border-border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold">Brands ({brands.length})</h2>
        <div className="flex gap-2">
          <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} className="border border-border rounded px-2 py-1 flex-1 bg-secondary" />
          <button onClick={handleCreateBrand} className="px-3 py-1 bg-primary text-primary-foreground rounded">+ create</button>
        </div>
        <ul className="space-y-1">
          {brands.map((b) => (
            <li key={b.id} className={`flex items-center gap-2 ${activeBrand?.id === b.id ? "text-primary" : ""}`}>
              <button onClick={() => switchBrand(b.id)} className="text-left flex-1 hover:underline">{b.name} <span className="text-muted-foreground text-xs">{b.id}</span></button>
              <span className="w-4 h-4 rounded-full border border-border" style={{ background: b.kit.primaryColor ?? "#888" }} />
              <button onClick={async () => { await archiveBrand(b.id); refreshAll(); }} className="text-red-500 text-xs">archive</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold">Campaigns ({campaigns.length})</h2>
        <div className="flex gap-2">
          <input value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} className="border border-border rounded px-2 py-1 flex-1 bg-secondary" />
          <button onClick={handleCreateCampaign} disabled={!activeBrand} className="px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-40">+ create under active brand</button>
        </div>
        <ul className="space-y-1">
          {campaigns.map((c) => (
            <li key={c.id} className={`flex items-center gap-2 ${campaign?.id === c.id ? "text-primary" : ""}`}>
              <button onClick={() => switchCampaign(c.id)} className="text-left flex-1 hover:underline">
                {c.productInput.name} <span className="text-muted-foreground text-xs">brand:{c.brandId?.slice(-6) ?? "—"}</span>
              </button>
              <span className="text-muted-foreground text-xs">{c.preferences?.tier ?? "—"} · {c.preferences?.aspectRatio ?? "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Log (latest 30)</h2>
        <pre className="text-xs whitespace-pre-wrap max-h-64 overflow-auto">{log.join("\n")}</pre>
      </section>
    </main>
  );
}
