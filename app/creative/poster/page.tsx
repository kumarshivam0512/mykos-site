"use client";

import { useState, useEffect } from "react";
import { useAdStore } from "@/store/use-ad-store";
import {
  Image as ImageIcon,
  Download,
  Type,
  Loader2,
  ArrowLeft,
  Check,
} from "lucide-react";

interface TextOverlay {
  text: string;
  position: "top" | "center" | "bottom";
  size: "small" | "medium" | "large";
}

const ASPECT_RATIOS = [
  { id: "16:9", label: "Landscape (16:9)", w: 1920, h: 1080 },
  { id: "9:16", label: "Portrait (9:16)", w: 1080, h: 1920 },
  { id: "1:1", label: "Square (1:1)", w: 1080, h: 1080 },
  { id: "4:5", label: "Instagram (4:5)", w: 1080, h: 1350 },
];

export default function PosterStudioPage() {
  const { assets, productInput } = useAdStore();
  const [selectedScene, setSelectedScene] = useState<number>(0);
  const [overlay, setOverlay] = useState<TextOverlay>({ text: "", position: "bottom", size: "medium" });
  const [selectedRatio, setSelectedRatio] = useState("16:9");
  const [exporting, setExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  const scenes = assets.images || [];

  if (scenes.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Generate scenes first in the Scene Builder.</p>
          <a href="/creative" className="bg-primary text-primary-foreground px-6 py-2 rounded-xl inline-block">
            Go to Scene Builder
          </a>
        </div>
      </main>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const ratio = ASPECT_RATIOS.find((r) => r.id === selectedRatio) || ASPECT_RATIOS[0];
      const res = await fetch("/api/poster-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: scenes[selectedScene],
          overlay: overlay.text ? overlay : undefined,
          width: ratio.w,
          height: ratio.h,
          aspectRatio: ratio.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExportedUrl(data.url);
      }
    } catch { /* ignore */ }
    setExporting(false);
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <a href="/creative" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Scene Builder
          </a>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-primary" /> Poster Studio
          </h1>
          <p className="text-muted-foreground text-sm">
            Select a scene, add text overlays, and export as a poster in multiple formats.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Scene Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Select Scene</h3>
            <div className="space-y-2">
              {scenes.map((img, i) => (
                <button key={i} onClick={() => { setSelectedScene(i); setExportedUrl(null); }}
                  className={`w-full rounded-xl overflow-hidden border-2 transition-colors ${
                    selectedScene === i ? "border-primary" : "border-border hover:border-primary/30"
                  }`}>
                  <img src={img} alt={`Scene ${i + 1}`} className="w-full aspect-video object-cover" />
                  <div className="px-3 py-1.5 text-xs text-left flex items-center justify-between">
                    <span>Scene {i + 1}</span>
                    {selectedScene === i && <Check className="w-3 h-3 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Preview */}
          <div className="lg:col-span-2 space-y-4">
            {/* Preview */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <img src={exportedUrl || scenes[selectedScene]} alt="Poster preview"
                  className="w-full object-contain max-h-[500px]" />
                {overlay.text && !exportedUrl && (
                  <div className={`absolute left-0 right-0 px-6 py-3 text-center ${
                    overlay.position === "top" ? "top-4" : overlay.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-4"
                  }`}>
                    <span className={`bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm inline-block ${
                      overlay.size === "small" ? "text-sm" : overlay.size === "large" ? "text-2xl font-bold" : "text-lg font-semibold"
                    }`}>
                      {overlay.text}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              {/* Text Overlay */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4" /> Text Overlay
                </h3>
                <input value={overlay.text} onChange={(e) => setOverlay({ ...overlay, text: e.target.value })}
                  placeholder="e.g., Fuel Your Ambition, Shop Now, 20% Off"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                <div className="flex gap-2 mt-2">
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <button key={pos} onClick={() => setOverlay({ ...overlay, position: pos })}
                      className={`px-3 py-1.5 rounded-lg text-xs capitalize ${
                        overlay.position === pos ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>{pos}</button>
                  ))}
                  <div className="w-px bg-border" />
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button key={size} onClick={() => setOverlay({ ...overlay, size })}
                      className={`px-3 py-1.5 rounded-lg text-xs capitalize ${
                        overlay.size === size ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>{size}</button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Export Format</h3>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button key={ratio.id} onClick={() => { setSelectedRatio(ratio.id); setExportedUrl(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs ${
                        selectedRatio === ratio.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>{ratio.label}</button>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex gap-3">
                <button onClick={handleExport} disabled={exporting}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Export Poster
                </button>
                {exportedUrl && (
                  <a href={exportedUrl} download={`${productInput.name || "poster"}_${selectedRatio.replace(":", "x")}.png`}
                    className="bg-secondary hover:bg-secondary/80 text-foreground font-medium px-6 py-3 rounded-xl flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
