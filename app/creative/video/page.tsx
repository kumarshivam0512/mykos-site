"use client";

import { useState } from "react";
import { useAdStore } from "@/store/use-ad-store";
import {
  Video,
  ArrowLeft,
  Loader2,
  Play,
  Download,
  Check,
  Clapperboard,
  Film,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Camera moves the user can choose per scene (maps to prompt engine NAMED_MOVES)
const CAMERA_MOVES = [
  { id: "static", label: "Static (hold)", desc: "Camera fixed, ambient motion only" },
  { id: "push in", label: "Push In", desc: "Slow push toward subject" },
  { id: "dolly out", label: "Pull Back", desc: "Reveal by pulling away" },
  { id: "orbit", label: "Orbit / Arc", desc: "Slow orbit around subject" },
  { id: "pan left", label: "Pan Left", desc: "Horizontal pan left" },
  { id: "pan right", label: "Pan Right", desc: "Horizontal pan right" },
  { id: "crane up", label: "Crane Up", desc: "Vertical rise, reveal from above" },
  { id: "crane down", label: "Crane Down", desc: "Top-down descending" },
  { id: "handheld", label: "Handheld", desc: "Organic handheld feel" },
  { id: "drone", label: "FPV / Drone", desc: "Aerial flythrough" },
];

const VIDEO_MODELS = [
  { id: "auto", label: "Auto (cheapest)", tier: "Smart" },
  { id: "kling-2.1-standard", label: "Kling 2.1 Standard", tier: "Good" },
  { id: "kling-2.1-pro", label: "Kling 2.1 Pro", tier: "Better" },
  { id: "seedance-pro", label: "Seedance Pro", tier: "Best" },
  { id: "wan-2.2", label: "Wan 2.2 Fast", tier: "Budget" },
];

interface SceneMotion {
  cameraMove: string;
  motionPrompt: string;
  duration: number; // per-scene duration
}

export default function VideoStudioPage() {
  const { assets, brief, brandKit, productInput, setAssets } = useAdStore();
  const scenes = assets.images || [];
  const sourceUrls = assets.sourceUrls || [];

  // Per-scene motion settings
  const [sceneMotions, setSceneMotions] = useState<SceneMotion[]>(
    () => scenes.map(() => ({ cameraMove: "push in", motionPrompt: "", duration: 5 }))
  );
  const [selectedModel, setSelectedModel] = useState("kling-2.1-pro");
  const [duration, setDuration] = useState(5);
  const [expandedScene, setExpandedScene] = useState<number | null>(0);
  // Hero Frame: index of the scene whose image anchors character identity across all clips
  const [heroFrameIdx, setHeroFrameIdx] = useState<number | null>(null);

  // Generation state
  const [generatingClips, setGeneratingClips] = useState(false);
  const [clipProgress, setClipProgress] = useState<{ current: number; total: number } | null>(null);
  const [generatedClips, setGeneratedClips] = useState<string[]>(assets.videoClips || []);

  // Assembly state
  const [assembling, setAssembling] = useState(false);
  const [finalVideo, setFinalVideo] = useState<string | null>(assets.videoUrl || null);

  const [error, setError] = useState("");

  const updateSceneMotion = (idx: number, updates: Partial<SceneMotion>) => {
    setSceneMotions((prev) => prev.map((m, i) => (i === idx ? { ...m, ...updates } : m)));
  };

  // Ensure sceneMotions array matches scenes length
  if (sceneMotions.length !== scenes.length && scenes.length > 0) {
    setSceneMotions(scenes.map((_, i) => sceneMotions[i] || { cameraMove: "push in", motionPrompt: "", duration: 5 }));
  }

  const handleGenerateClips = async () => {
    setGeneratingClips(true);
    setError("");
    setClipProgress({ current: 0, total: scenes.length });

    try {
      // Build Scene objects for the API
      const apiScenes = scenes.map((_, i) => {
        const motion = sceneMotions[i] || { cameraMove: "push in", motionPrompt: "", duration: 5 };
        return {
          index: i,
          visualPrompt: motion.motionPrompt || brief?.scenes?.[i]?.visualPrompt || "Product showcased in scene",
          cameraAngle: brief?.cameraSettings?.focalLength || "85mm",
          motion: motion.cameraMove,
          lighting: "stable from source frame",
          duration: motion.duration,
        };
      });

      const res = await fetch("/api/generate-video-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: scenes,
          scenes: apiScenes,
          sourceUrls: sourceUrls.length ? sourceUrls : undefined,
          model: selectedModel,
          aspectRatio: "16:9",
          duration: Math.max(...sceneMotions.map((m) => m.duration)),
          hasProductImage: !!(assets.productAngleUrls?.length),
          cameraSettings: brief?.cameraSettings,
          adFormat: brief?.adFormat,
          sceneBackdrop: brief?.sceneBackdrop,
          characterSheet: brief?.characterSheet,
          realism: assets.realism || undefined,
          // Hero Frame Chaining: use hero frame's source image for all clips
          // This ensures the same character face appears across all video clips
          heroFrameIdx: heroFrameIdx,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate video clips");
      }

      const data = await res.json();
      setGeneratedClips(data.clips);
      setAssets({ videoClips: data.clips });
      setClipProgress({ current: data.scenesGenerated, total: data.scenesGenerated });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingClips(false);
    }
  };

  const handleAssemble = async () => {
    setAssembling(true);
    setError("");

    try {
      const res = await fetch("/api/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoClips: generatedClips,
          durations: sceneMotions.map((m) => m.duration),
          voiceoverUrl: assets.voiceoverUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assemble video");
      }

      const data = await res.json();
      setFinalVideo(data.videoUrl);
      setAssets({ videoUrl: data.videoUrl });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssembling(false);
    }
  };

  // ─── Empty state ──────────────────────────────────────────────
  if (scenes.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
            <Video className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Video Studio</h1>
          <p className="text-muted-foreground max-w-md">
            Generate scenes in the Scene Builder first, then come here to animate them into video.
          </p>
          <a href="/creative" className="bg-primary text-primary-foreground px-6 py-2 rounded-xl inline-block">
            Go to Scene Builder
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <a href="/creative" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Scene Builder
          </a>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clapperboard className="w-6 h-6 text-primary" /> Video Studio
          </h1>
          <p className="text-muted-foreground text-sm">
            Set camera motion per scene, generate AI video clips, and assemble your final ad.
          </p>
        </div>

        {/* ─── Global Settings ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Film className="w-4 h-4" /> Video Settings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Model */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">AI Model</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {VIDEO_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} ({m.tier})</option>
                ))}
              </select>
            </div>

            {/* Default Duration */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Default Clip Duration</label>
              <div className="flex gap-2">
                {[3, 5, 8, 10, 12].map((d) => (
                  <button key={d} onClick={() => {
                    setDuration(d);
                    setSceneMotions((prev) => prev.map((m) => ({ ...m, duration: d })));
                  }}
                    className={`flex-1 rounded-xl border px-2 py-2 text-sm ${
                      duration === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Frame for Character Consistency */}
          {scenes.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border">
              <label className="block text-xs text-muted-foreground mb-1.5">
                Hero Frame <span className="text-primary/60">(character consistency across clips)</span>
              </label>
              <p className="text-[10px] text-muted-foreground mb-2">
                All clips will use the hero frame as the source image for video generation, preserving the same character face across scenes.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setHeroFrameIdx(null)}
                  className={`rounded-xl border px-3 py-1.5 text-xs ${
                    heroFrameIdx === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}>
                  Off (each scene independent)
                </button>
                {scenes.map((img, i) => (
                  <button key={i} onClick={() => setHeroFrameIdx(i)}
                    className={`rounded-xl border overflow-hidden flex items-center gap-1.5 pr-2 ${
                      heroFrameIdx === i ? "border-primary bg-primary/10" : "border-border"
                    }`}>
                    <img src={img} alt={`S${i + 1}`} className="w-8 h-5 object-cover" />
                    <span className="text-xs">S{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Per-Scene Motion Editor ─────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Scene Motion ({scenes.length} scenes)</h3>

          {scenes.map((img, idx) => {
            const isExpanded = expandedScene === idx;
            const motion = sceneMotions[idx] || { cameraMove: "push in", motionPrompt: "" };
            const clip = generatedClips[idx];
            const moveLabel = CAMERA_MOVES.find((m) => m.id === motion.cameraMove)?.label || motion.cameraMove;

            return (
              <div key={idx} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <button onClick={() => setExpandedScene(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <img src={img} alt={`Scene ${idx + 1}`} className="w-16 h-10 object-cover rounded-lg border border-border" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Scene {idx + 1}</div>
                      <div className="text-xs text-muted-foreground">{moveLabel} · {motion.duration}s</div>
                    </div>
                    {clip && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Clip ready</span>}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {/* Source image preview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl overflow-hidden border border-border">
                        <img src={img} alt={`Scene ${idx + 1}`} className="w-full aspect-video object-cover" />
                        <div className="px-3 py-1.5 text-xs text-muted-foreground bg-secondary/50">Source frame</div>
                      </div>
                      {clip ? (
                        <div className="rounded-xl overflow-hidden border border-border">
                          <video src={clip} className="w-full aspect-video object-cover" controls muted />
                          <div className="px-3 py-1.5 text-xs text-green-400 bg-secondary/50 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Generated clip
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border flex items-center justify-center aspect-video">
                          <span className="text-xs text-muted-foreground">Clip will appear here</span>
                        </div>
                      )}
                    </div>

                    {/* Camera Move Selector */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Camera Move</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {CAMERA_MOVES.map((move) => (
                          <button key={move.id}
                            onClick={() => updateSceneMotion(idx, { cameraMove: move.id })}
                            className={`rounded-lg border px-2 py-1.5 text-left transition-colors ${
                              motion.cameraMove === move.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/30"
                            }`}>
                            <div className="text-[11px] font-medium truncate">{move.label}</div>
                            <div className="text-[9px] text-muted-foreground truncate">{move.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional motion prompt */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">
                          Motion Description <span className="text-muted-foreground/60">(optional)</span>
                        </label>
                        <textarea value={motion.motionPrompt}
                          onChange={(e) => updateSceneMotion(idx, { motionPrompt: e.target.value })}
                          placeholder="e.g., Subject lifts product slowly, gentle hair movement from left breeze"
                          rows={2}
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                      </div>
                      <div className="w-28 shrink-0">
                        <label className="block text-xs text-muted-foreground mb-1">Duration</label>
                        <div className="flex flex-col gap-1">
                          {[3, 5, 8, 10, 12].map((d) => (
                            <button key={d} onClick={() => updateSceneMotion(idx, { duration: d })}
                              className={`rounded-lg border px-2 py-1.5 text-xs ${
                                motion.duration === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                              }`}>{d}s</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {/* ─── Action Buttons ──────────────────────────────────── */}
        <div className="space-y-3">
          {/* Generate Clips */}
          <button onClick={handleGenerateClips} disabled={generatingClips || assembling}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg">
            {generatingClips ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating clips{clipProgress ? ` (${clipProgress.current}/${clipProgress.total})` : ""}...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {generatedClips.length ? "Regenerate" : "Generate"} Video Clips ({scenes.length} scenes)
              </>
            )}
          </button>

          {/* Assemble */}
          {generatedClips.length > 0 && (
            <button onClick={handleAssemble} disabled={assembling || generatingClips}
              className="w-full bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2">
              {assembling ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Assembling final video...</>
              ) : (
                <><Film className="w-5 h-5" /> Assemble Final Video ({generatedClips.length} clips)</>
              )}
            </button>
          )}
        </div>

        {/* ─── Final Video Preview ─────────────────────────────── */}
        {finalVideo && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" /> Final Video
            </h3>
            <div className="rounded-xl overflow-hidden border border-border">
              <video src={finalVideo} controls className="w-full" />
            </div>
            <a href={finalVideo}
              download={`${productInput.name || "mykos"}_video_${Date.now()}.mp4`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 rounded-xl">
              <Download className="w-4 h-4" /> Download Video
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
