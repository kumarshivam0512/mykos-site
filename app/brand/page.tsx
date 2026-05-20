"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import { GOOGLE_FONTS } from "@/lib/types";
import {
  Building2,
  Upload,
  ChevronDown,
  ChevronUp,
  Palette,
  Loader2,
  Zap,
  Globe,
  Trash2,
  Type,
} from "lucide-react";

export default function BrandSetupPage() {
  const router = useRouter();
  const { productInput, setProductInput, setBrandKit, brandKit, setBrief, setPipelineStep, reset, brief } = useAdStore();

  const [showBrandKit, setShowBrandKit] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  // Typed brand palette (Sprint A item 1). Seeded from store if returning user.
  const [primaryColor, setPrimaryColor] = useState(brandKit.primaryColor || brandKit.colors[0] || "#a855f7");
  const [secondaryColor, setSecondaryColor] = useState(brandKit.secondaryColor || brandKit.colors[1] || "#7c3aed");
  const [accentColor, setAccentColor] = useState(brandKit.accentColor || brandKit.colors[2] || "#1e1b4b");
  // Typed brand fonts (Sprint A item 1). Drive captions, end card, opener.
  const [displayFont, setDisplayFont] = useState(brandKit.displayFont || "Inter");
  const [bodyFont, setBodyFont] = useState(brandKit.bodyFont || "Inter");
  const [competitorName, setCompetitorName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [scrapingUrl, setScrapingUrl] = useState(false);

  const hasPreviousSession = !!(brief || productInput.name);

  const handleSubmit = useCallback(async () => {
    if (!productInput.name.trim() || !productInput.description.trim()) {
      setError("Please enter a product name and description");
      return;
    }

    setLoading(true);
    setError("");
    setPipelineStep("generating_brief", "Analyzing your brand...");

    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("type", "logo");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          logoUrl = url;
        }
      }

      if (productImage) {
        const formData = new FormData();
        formData.append("file", productImage);
        formData.append("type", "product");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          setProductInput({ imageUrl: url });
        }
      }

      // Compose typed BrandKit (Sprint A item 1). Legacy `colors`/`fonts`
      // arrays are kept in sync so older code paths keep working.
      const palette = [primaryColor, secondaryColor, accentColor].filter(Boolean);
      const typography = [displayFont, bodyFont].filter(Boolean);
      setBrandKit({
        colors: palette,
        fonts: typography,
        primaryColor,
        secondaryColor,
        accentColor,
        displayFont,
        bodyFont,
        logoUrl,
      });

      const res = await fetch("/api/creative-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productInput.name,
          description: productInput.description,
          brandColors: palette,
          competitorName: competitorName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze brand");
      }

      const brief = await res.json();
      setBrief(brief);

      try {
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productInput,
            brandKit: {
              colors: palette,
              fonts: typography,
              primaryColor,
              secondaryColor,
              accentColor,
              displayFont,
              bodyFont,
              logoUrl,
            },
            brief,
            competitorName: competitorName.trim() || undefined,
          }),
        });
      } catch { /* non-blocking */ }

      setPipelineStep("idle");
      router.push("/brand/audience");
    } catch (err) {
      setError((err as Error).message);
      setPipelineStep("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productInput, logoFile, productImage, primaryColor, secondaryColor, accentColor, displayFont, bodyFont, competitorName, setPipelineStep, setProductInput, setBrandKit, setBrief, router]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
            <Building2 className="w-3 h-3" /> Brand Hub
          </div>
          <h1 className="text-2xl font-bold">Brand Setup</h1>
          <p className="text-muted-foreground text-sm">
            Set up your brand profile. The AI will analyze it and generate audience insights, competitor analysis, and platform strategies.
          </p>
          {hasPreviousSession && (
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/brand/audience")} className="text-sm text-primary hover:text-primary/80">
                View Brand Intel →
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => { reset(); setProductImage(null); setLogoFile(null); setPrimaryColor("#a855f7"); setSecondaryColor("#7c3aed"); setAccentColor("#1e1b4b"); setDisplayFont("Inter"); setBodyFont("Inter"); setCompetitorName(""); setProductUrl(""); setError(""); }}
                className="text-sm text-muted-foreground hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Reset
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Brand / Product Name *</label>
              <input type="text" value={productInput.name} onChange={(e) => setProductInput({ name: e.target.value })}
                placeholder="e.g., Avvatar Whey Protein, Nike Air Max" className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">One-Line Description *</label>
              <textarea value={productInput.description} onChange={(e) => setProductInput({ description: e.target.value })}
                placeholder="e.g., Premium whey protein powder for fitness enthusiasts" rows={2}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Product URL (optional)</label>
              <div className="flex gap-2">
                <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://example.com/product"
                  className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring" />
                {productUrl && (
                  <button onClick={async () => {
                    setScrapingUrl(true);
                    try { const res = await fetch("/api/scrape-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: productUrl }) });
                      if (res.ok) { const data = await res.json(); if (data.name) setProductInput({ name: data.name }); if (data.description) setProductInput({ description: data.description }); }
                    } catch { /* ignore */ } finally { setScrapingUrl(false); }
                  }} disabled={scrapingUrl} className="bg-secondary hover:bg-secondary/80 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
                    {scrapingUrl ? "..." : "Auto-fill"}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Main Competitor (optional)</label>
              <input type="text" value={competitorName} onChange={(e) => setCompetitorName(e.target.value)} placeholder="e.g., MuscleBlaze, ON Gold Standard"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Product Image (optional)</label>
              <label className="flex items-center gap-3 bg-secondary border border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">{productImage ? productImage.name : "Upload product image"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>

          {/* Brand Kit */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button onClick={() => setShowBrandKit(!showBrandKit)} className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Brand Kit</span>
              </div>
              {showBrandKit ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showBrandKit && (
              <div className="p-4 space-y-4 border-t border-border">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Logo</label>
                  <label className="flex items-center gap-3 bg-secondary border border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">{logoFile ? logoFile.name : "Upload logo (PNG, SVG)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Brand Colors</label>
                  <p className="text-xs text-muted-foreground/60 mb-2">Used in overlays, captions, end card, and motion graphics. Never injected into in-scene image generation.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Primary", value: primaryColor, set: setPrimaryColor, hint: "Hero / CTA" },
                      { label: "Secondary", value: secondaryColor, set: setSecondaryColor, hint: "Support" },
                      { label: "Accent", value: accentColor, set: setAccentColor, hint: "Highlights" },
                    ].map((c) => (
                      <div key={c.label} className="space-y-1">
                        <div className="text-xs text-muted-foreground/80">{c.label} <span className="text-muted-foreground/50">· {c.hint}</span></div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={c.value}
                            onChange={(e) => c.set(e.target.value)}
                            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={c.value}
                            onChange={(e) => c.set(e.target.value)}
                            className="flex-1 bg-secondary border border-border rounded-lg px-2 py-2 text-xs font-mono text-muted-foreground"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" /> Display Font
                    </label>
                    <p className="text-xs text-muted-foreground/60 mb-2">Headings, end card, opener title.</p>
                    <select
                      value={displayFont}
                      onChange={(e) => setDisplayFont(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {GOOGLE_FONTS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label} · {f.category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" /> Body Font
                    </label>
                    <p className="text-xs text-muted-foreground/60 mb-2">Captions, body copy, lower-thirds.</p>
                    <select
                      value={bodyFont}
                      onChange={(e) => setBodyFont(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {GOOGLE_FONTS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label} · {f.category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing brand...</> : <><Zap className="w-5 h-5" /> Analyze Brand</>}
          </button>
        </div>
      </div>
    </main>
  );
}
