"use client";

// ─── Post Studio (Sprint A item 7) ──────────────────────────────
//
// Split-view page for editing branded chrome AFTER scene clips are generated,
// without re-rendering the clips themselves. Left pane = bare assembled video
// (the version without chrome). Right pane = chrome editor (opener / end card
// / per-scene text). "Re-render with overlays" hits /api/finalize-video with
// `skipClipRegen: true` style flow — actually just a new finalize call that
// reuses the cached video clips.
//
// Architecture decision: Post Studio doesn't fork the data model. It reads
// the same `assets.videoClips` and `assets.videoUrl` from the Zustand store,
// edits a local copy of chrome params, and on "Re-render" sends them to
// /api/finalize-video using the existing flow. This means everything Post
// Studio can do, Video Studio could also do — Post Studio just gives a
// cleaner editing surface focused only on chrome.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import {
  ArrowLeft,
  Loader2,
  Download,
  Sparkles,
  Film,
  Play,
  Type,
} from "lucide-react";

export default function PostStudioPage() {
  const router = useRouter();
  const {
    assets,
    brief,
    brandKit,
    productInput,
    selectedTier,
    selectedAspectRatio,
    setAssets,
  } = useAdStore();

  const sceneClips = assets.videoClips || [];
  const bareVideoUrl = assets.videoUrl;

  // ── Chrome editor state ────────────────────────────────────
  const [useBrandedChrome, setUseBrandedChrome] = useState(true);
  const [openerStyle, setOpenerStyle] = useState<"minimal" | "scale" | "particle">("minimal");
  const [openerDur, setOpenerDur] = useState(1.5);
  const [endCardDur, setEndCardDur] = useState(2);
  const [endCardBg, setEndCardBg] = useState<"solid" | "dark" | "light">("dark");
  const [tagline, setTagline] = useState(brief?.endCard?.tagline || "");
  const [ctaText, setCtaText] = useState(brief?.endCard?.ctaText || "");

  // Per-scene overlay text (Sprint A item 6d) — initialised from any cached value
  const [overlays, setOverlays] = useState<{ text: string; position: "top" | "center" | "lower-third" | "bottom"; withBar: boolean }[]>(
    () => sceneClips.map(() => ({ text: "", position: "lower-third", withBar: false }))
  );

  const [rerendering, setRerendering] = useState(false);
  const [error, setError] = useState("");
  const [finalUrl, setFinalUrl] = useState<string | null>(bareVideoUrl || null);

  const handleRerender = async () => {
    if (!sceneClips.length) {
      setError("No scene clips found. Generate them in Video Studio first.");
      return;
    }
    setRerendering(true);
    setError("");
    try {
      const sceneOverlays = overlays
        .map((o, i) => o.text.trim()
          ? { sceneIndex: i, text: o.text.trim(), position: o.position, showLowerThirdBar: o.withBar }
          : null)
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const res = await fetch("/api/finalize-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoClips: sceneClips,
          // Re-use the original VO segment text — pacing recalibrates to
          // probed clip durations, identical to Video Studio.
          voiceoverSegments: brief?.voiceoverSegments,
          voiceoverScript: brief?.voiceoverScript,
          musicDirection: brief?.musicDirection || "professional",
          tier: selectedTier,
          adFormat: brief?.adFormat,
          aspectRatio: selectedAspectRatio,
          captionFont: brandKit.bodyFont,
          // Branded chrome — the whole point of Post Studio.
          useBrandedChrome,
          brandKit,
          productName: productInput.name,
          tagline,
          ctaText,
          openerStyle,
          openerDurationSec: openerDur,
          endCardDurationSec: endCardDur,
          endCardBackground: endCardBg,
          sceneOverlays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Re-render failed");
      }
      const data = await res.json() as { videoUrl: string };
      setFinalUrl(data.videoUrl);
      setAssets({ videoUrl: data.videoUrl });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRerendering(false);
    }
  };

  if (!sceneClips.length) {
    return (
      <main className="flex-1 p-6 max-w-5xl mx-auto">
        <button onClick={() => router.push("/creative/video")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Video Studio
        </button>
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
          <Film className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-semibold">No scene clips yet</h2>
          <p className="text-sm text-muted-foreground">Generate your scene clips in Video Studio first. Post Studio is for layering branded chrome on top of finished clips.</p>
          <button onClick={() => router.push("/creative/video")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 py-2.5 rounded-xl">Open Video Studio</button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.push("/creative/video")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Video Studio
            </button>
            <h1 className="text-2xl font-bold">Post Studio</h1>
            <p className="text-sm text-muted-foreground">Edit opener, end card and per-scene overlays without re-rendering AI clips. Skip this step entirely if you&apos;re happy with the Video Studio output.</p>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/50 border border-border rounded-lg px-3 py-2">
            {sceneClips.length} scene clip{sceneClips.length === 1 ? "" : "s"} · tier <span className="text-primary uppercase">{selectedTier}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── LEFT: video preview ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" /> Current assembly
              </h3>
              {finalUrl ? (
                <div className="rounded-xl overflow-hidden border border-border mx-auto"
                  style={{
                    maxWidth:
                      selectedAspectRatio === "9:16" ? 320 :
                      selectedAspectRatio === "4:5" ? 420 :
                      selectedAspectRatio === "1:1" ? 480 :
                      "100%",
                  }}>
                  <video src={finalUrl} controls className="w-full" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Click <span className="text-foreground font-medium">Re-render with chrome</span> to produce a preview here.
                </div>
              )}
            </div>

            {/* Scene strip — quick reference */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-medium mb-3">Scenes</h3>
              <div className="grid grid-cols-3 gap-2">
                {sceneClips.map((clip, i) => (
                  <div key={i} className="space-y-1">
                    <video src={clip} muted loop className="w-full rounded-lg border border-border" />
                    <div className="text-[10px] text-muted-foreground">Scene {i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: chrome editor ────────────────────────────── */}
          <div className="space-y-4">
            {/* Chrome toggle */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Branded Chrome
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Production-grade opener + end card from your Brand Hub. Turn off to export the bare video.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useBrandedChrome} onChange={(e) => setUseBrandedChrome(e.target.checked)} className="accent-primary" />
                  <span className="text-xs">On</span>
                </label>
              </div>
            </div>

            {/* Opener style */}
            {useBrandedChrome && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-medium">Opener</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "minimal",  label: "Minimal" },
                    { id: "scale",    label: "Scale" },
                    { id: "particle", label: "Particle" },
                  ] as const).map((opt) => (
                    <button key={opt.id} onClick={() => setOpenerStyle(opt.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                        openerStyle === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 flex items-center justify-between">
                    <span>Duration</span><span className="font-mono">{openerDur.toFixed(1)}s</span>
                  </label>
                  <input type="range" min={0.5} max={3} step={0.1} value={openerDur} onChange={(e) => setOpenerDur(parseFloat(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
            )}

            {/* End card */}
            {useBrandedChrome && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-medium">End Card</h3>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Tagline</label>
                  <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
                    placeholder='e.g. "Performance, Refined."'
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">CTA text</label>
                  <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                    placeholder='e.g. "Shop the Continental"'
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1 flex items-center justify-between">
                      <span>Duration</span><span className="font-mono">{endCardDur.toFixed(1)}s</span>
                    </label>
                    <input type="range" min={1} max={4} step={0.1} value={endCardDur} onChange={(e) => setEndCardDur(parseFloat(e.target.value))} className="w-full accent-primary" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Background</label>
                    <select value={endCardBg} onChange={(e) => setEndCardBg(e.target.value as "solid" | "dark" | "light")}
                      className="w-full bg-secondary border border-border rounded-lg px-2 py-2 text-xs">
                      <option value="dark">Dark</option>
                      <option value="solid">Solid · brand</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Per-scene overlays */}
            {useBrandedChrome && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" /> Per-scene text overlays
                </h3>
                <p className="text-[11px] text-muted-foreground">Empty rows are skipped. Overlays composite on top of clips — no re-render of the AI clip needed.</p>
                <div className="space-y-2">
                  {overlays.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-12 shrink-0">Scene {i + 1}</span>
                      <input type="text" value={o.text}
                        onChange={(e) => setOverlays((prev) => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                        placeholder="(no overlay)"
                        className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                      <select value={o.position}
                        onChange={(e) => setOverlays((prev) => prev.map((x, j) => j === i ? { ...x, position: e.target.value as "top" | "center" | "lower-third" | "bottom" } : x))}
                        className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-[10px]">
                        <option value="top">Top</option>
                        <option value="center">Center</option>
                        <option value="lower-third">Lower</option>
                        <option value="bottom">Bottom</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={o.withBar}
                          onChange={(e) => setOverlays((prev) => prev.map((x, j) => j === i ? { ...x, withBar: e.target.checked } : x))}
                          className="accent-primary" />
                        Bar
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

            <div className="space-y-2">
              <button onClick={handleRerender} disabled={rerendering}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                {rerendering ? <><Loader2 className="w-4 h-4 animate-spin" /> Re-rendering…</> : <><Sparkles className="w-4 h-4" /> Re-render with chrome</>}
              </button>
              {finalUrl && (
                <a href={finalUrl} download={`${productInput.name || "mykos"}_final_${Date.now()}.mp4`}
                  className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                  <Download className="w-4 h-4" /> Download final
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
