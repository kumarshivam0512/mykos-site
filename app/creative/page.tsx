"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import {
  Sparkles,
  Upload,
  ChevronDown,
  ChevronUp,
  Palette,
  Loader2,
  Zap,
  Trash2,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { productInput, setProductInput, setBrandKit, setBrief, setPipelineStep, reset, brief } =
    useAdStore();

  const [showBrandKit, setShowBrandKit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [colorInputs, setColorInputs] = useState(["#a855f7", "#7c3aed", "#1e1b4b"]);
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
    setPipelineStep("generating_brief", "Analyzing your product...");

    try {
      // Upload logo if provided
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

      // Upload product image if provided
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

      // Save brand kit
      setBrandKit({ colors: colorInputs.filter(Boolean), logoUrl });

      // Generate brief via AI Creative Director
      const res = await fetch("/api/creative-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productInput.name,
          description: productInput.description,
          brandColors: colorInputs.filter(Boolean),
          competitorName: competitorName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate brief");
      }

      const brief = await res.json();
      setBrief(brief);

      // Auto-save campaign to Cosmos DB
      try {
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productInput,
            brandKit: { colors: colorInputs.filter(Boolean), logoUrl },
            brief,
            competitorName: competitorName.trim() || undefined,
          }),
        });
      } catch {
        // Non-blocking — campaign saves in background
      }

      setPipelineStep("idle");
      router.push("/creative/brief");
    } catch (err) {
      setError((err as Error).message);
      setPipelineStep("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productInput, logoFile, productImage, colorInputs, competitorName, setPipelineStep, setProductInput, setBrandKit, setBrief, router]);

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
            <Zap className="w-4 h-4" />
            AI Creative Director
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Mykos AI
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Enter your product — the AI handles the creative strategy, ad generation, and everything in between.
          </p>
          {hasPreviousSession && (
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => router.push("/campaigns")}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                My Campaigns
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => {
                  reset();
                  setProductImage(null);
                  setLogoFile(null);
                  setColorInputs(["#a855f7", "#7c3aed", "#1e1b4b"]);
                  setCompetitorName("");
                  setProductUrl("");
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Start Fresh
              </button>
            </div>
          )}
        </div>

        {/* Product Input Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                value={productInput.name}
                onChange={(e) => setProductInput({ name: e.target.value })}
                placeholder="e.g., Nike Air Max, Notion, Rolex Submariner"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                One-Line Description *
              </label>
              <textarea
                value={productInput.description}
                onChange={(e) => setProductInput({ description: e.target.value })}
                placeholder="e.g., Iconic running shoe with revolutionary air cushioning technology"
                rows={2}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Product Image (optional)
              </label>
              <label className="flex items-center gap-3 bg-secondary border border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {productImage ? productImage.name : "Drop an image or click to upload"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            {/* Product URL (optional) */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Product URL (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {productUrl && (
                  <button
                    onClick={async () => {
                      setScrapingUrl(true);
                      try {
                        const res = await fetch("/api/scrape-url", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: productUrl }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.name) setProductInput({ name: data.name });
                          if (data.description) setProductInput({ description: data.description });
                        }
                      } catch { /* ignore */ } finally { setScrapingUrl(false); }
                    }}
                    disabled={scrapingUrl}
                    className="bg-secondary hover:bg-secondary/80 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {scrapingUrl ? "..." : "Auto-fill"}
                  </button>
                )}
              </div>
            </div>

            {/* Competitor (optional) */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Main Competitor (optional)
              </label>
              <input
                type="text"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="e.g., ON Running, Asana, Omega"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Brand Kit (Collapsible) */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowBrandKit(!showBrandKit)}
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Brand Kit (optional)</span>
              </div>
              {showBrandKit ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showBrandKit && (
              <div className="p-4 space-y-4 border-t border-border">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Logo</label>
                  <label className="flex items-center gap-3 bg-secondary border border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      {logoFile ? logoFile.name : "Upload logo (PNG, SVG)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Brand Colors
                  </label>
                  <div className="flex gap-3">
                    {colorInputs.map((color, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const updated = [...colorInputs];
                            updated[i] = e.target.value;
                            setColorInputs(updated);
                          }}
                          className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => {
                            const updated = [...colorInputs];
                            updated[i] = e.target.value;
                            setColorInputs(updated);
                          }}
                          className="w-24 bg-secondary border border-border rounded-lg px-2 py-1 text-xs font-mono text-muted-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fonts */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">
                    Font Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Inter, Helvetica Neue"
                    onChange={(e) =>
                      setBrandKit({ fonts: e.target.value ? [e.target.value] : [] })
                    }
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI is analyzing your product...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                AI Fill Brief
              </>
            )}
          </button>
        </div>

        {/* Example Products */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-3">Try an example:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { name: "Nike Air Max", desc: "Iconic running shoe with air cushioning" },
              { name: "Notion", desc: "All-in-one workspace for notes and projects" },
              { name: "Rolex Submariner", desc: "Luxury dive watch" },
              { name: "Stripe", desc: "Payment infrastructure for the internet" },
              { name: "Chanel No. 5", desc: "Iconic luxury perfume" },
            ].map((ex) => (
              <button
                key={ex.name}
                onClick={() => setProductInput({ name: ex.name, description: ex.desc })}
                className="bg-secondary hover:bg-secondary/80 border border-border rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
