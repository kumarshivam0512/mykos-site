"use client";

import { useState } from "react";
import { useAdStore } from "@/store/use-ad-store";
import { QualityTierSelector } from "@/components/quality-tier-selector";
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
  Wand2,
  Upload,
  Plus,
  X,
} from "lucide-react";
import { estimatePreflightCost, formatDuration } from "@/lib/providers/tier-selector";
import { ASPECT_RATIO_CLASS } from "@/lib/types";

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

/**
 * Allowed clip durations per quality tier. Reflects the underlying model
 * constraints so the UI doesn't lie:
 *   - Budget (Wan 2.2): any duration 1–12s
 *   - Premium (Kling v2.5 Turbo Pro): only 5s or 10s — anything else snaps
 *   - Ultra (Seedance 2.0): 5–12s (Wan 2.7 ref path caps at 10s)
 */
const TIER_DURATION_OPTIONS: Record<"budget" | "premium" | "ultra", number[]> = {
  budget: [3, 5, 8, 10, 12],
  premium: [5, 10],
  ultra: [5, 8, 10, 12],
};

interface SceneMotion {
  cameraMove: string;
  motionPrompt: string;
  duration: number; // per-scene duration
}

export default function VideoStudioPage() {
  const { assets, brief, brandKit, productInput, setAssets, selectedTier, setTier, selectedAspectRatio } = useAdStore();
  const scenes = assets.images || [];
  const sourceUrls = assets.sourceUrls || [];

  // Per-scene motion settings
  const [sceneMotions, setSceneMotions] = useState<SceneMotion[]>(
    () => scenes.map(() => ({ cameraMove: "push in", motionPrompt: "", duration: 5 }))
  );
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

  // Voiceover state
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(assets.voiceoverUrl || null);

  // Caption state (Sprint 2). Default: burn ON for vertical/square, OFF for landscape.
  const [burnCaptions, setBurnCaptions] = useState<boolean>(selectedAspectRatio !== "16:9");
  const [captionStyle, setCaptionStyle] = useState<"modern" | "tiktok" | "cinematic">("modern");
  const [srtUrl, setSrtUrl] = useState<string | null>(null);

  const [error, setError] = useState("");

  // AI-fill loading state for the per-scene motion descriptions.
  const [motionsLoading, setMotionsLoading] = useState(false);

  /**
   * Auto-fill every scene's motion description (the optional textarea under
   * each scene card) in one call. Uses the chosen camera move, scene duration,
   * the brief's per-scene voiceover line (so motion paces with VO), and the
   * brand context — so motion direction stays on-brand and per-scene specific.
   */
  const handleFillMotions = async () => {
    if (!scenes.length) {
      setError("Generate scene images first before AI-filling motion.");
      return;
    }
    setMotionsLoading(true);
    setError("");
    try {
      const segments = brief?.voiceoverSegments || [];
      const payloadScenes = sceneMotions.map((m, i) => ({
        index: i,
        cameraMove: m.cameraMove,
        duration: m.duration,
        voiceoverText: segments.find((s) => s.sceneIndex === i)?.text,
        // For grounding — Scene Builder writes setting+characterAction into the
        // brief.scenes only when generated via the brief flow. For the idea-to-
        // scenes flow, we approximate by re-using the scene index + camera move
        // (the orchestrator already wrote scene-specific text into the prompt).
        sceneContext: brief?.scenes?.[i]?.visualPrompt,
      }));

      const res = await fetch("/api/motion-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: payloadScenes,
          brandName: productInput.name,
          productDescription: productInput.description,
          sceneBackdrop: brief?.sceneBackdrop,
          characterSheet: brief?.characterSheet,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fill motion descriptions");
      }
      const data = await res.json() as { motions: { sceneIndex: number; motionPrompt: string }[] };
      setSceneMotions((prev) => prev.map((m, i) => {
        const filled = data.motions.find((x) => x.sceneIndex === i);
        return filled ? { ...m, motionPrompt: filled.motionPrompt } : m;
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMotionsLoading(false);
    }
  };

  // ── Upload existing scene images ─────────────────────────────────
  // Lets the user bypass the Scene Builder image-gen step and bring their
  // own images straight into Video Studio for animation.
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleUploadSceneImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setError("");
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("type", `scene_${i}`);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Failed to upload ${files[i].name}`);
        const { url } = await res.json();
        uploadedUrls.push(url);
      }
      // Merge with any existing scenes (append, don't replace) so the user
      // can mix Scene-Builder-generated + uploaded images if they want.
      const mergedImages = [...scenes, ...uploadedUrls];
      setAssets({
        images: mergedImages,
        // Reset source URLs — we don't have provider URLs for uploads, so
        // image-to-video will use the public /uploads path (resolver handles it).
        sourceUrls: [...(assets.sourceUrls || []), ...uploadedUrls.map(() => "")],
      });
      // Initialise motion slots for the newly added scenes.
      setSceneMotions((prev) => [
        ...prev,
        ...uploadedUrls.map(() => ({ cameraMove: "push in", motionPrompt: "", duration: 5 })),
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveScene = (idx: number) => {
    const newImages = scenes.filter((_, i) => i !== idx);
    setAssets({
      images: newImages,
      sourceUrls: (assets.sourceUrls || []).filter((_, i) => i !== idx),
      videoClips: (assets.videoClips || []).filter((_, i) => i !== idx),
    });
    setSceneMotions((prev) => prev.filter((_, i) => i !== idx));
    setGeneratedClips((prev) => prev.filter((_, i) => i !== idx));
  };

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
          tier: selectedTier,
          aspectRatio: selectedAspectRatio,
          duration: Math.max(...sceneMotions.map((m) => m.duration)),
          cameraSettings: brief?.cameraSettings,
          adFormat: brief?.adFormat,
          sceneBackdrop: brief?.sceneBackdrop,
          characterSheet: brief?.characterSheet,
          realism: assets.realism || undefined,
          // Hero Frame Chaining: use hero frame's source image for all clips
          heroFrameIdx: heroFrameIdx,
          // Reference images for character/product/logo consistency
          productAngleUrls: assets.productAngleUrls,
          logoUrl: brandKit.logoUrl,
          // Per-scene character refs (from Scene Builder @character mentions or uploads)
          characterRefUrls: assets.characterRefUrls,
          // Resume: pass any clips we already have so the server skips them and we
          // only pay for the ones that still need to be generated.
          existingClips: generatedClips.length ? generatedClips : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate video clips");
      }

      const data = await res.json();
      // Server may return nulls for failed clips (partial result) — keep them as nulls
      // so the user can see which scenes still need to be regenerated.
      const clips = (data.clips as (string | null)[]) || [];
      const finalClips = clips.map((c, i) => c || generatedClips[i] || null).filter((c): c is string => !!c);
      setGeneratedClips(finalClips);
      setAssets({ videoClips: finalClips });
      setClipProgress({ current: finalClips.length, total: clips.length });

      if (data.partial && Array.isArray(data.errors) && data.errors.length > 0) {
        const failedIndexes = (data.errors as { index: number; message: string }[]).map((e) => e.index + 1);
        const firstMsg = (data.errors as { index: number; message: string }[])[0].message;
        setError(`Partial result — clip(s) ${failedIndexes.join(", ")} failed (${firstMsg}). Click Generate again to resume only the failed clips.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingClips(false);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!brief?.voiceoverScript) {
      setError("No voiceover script found in the brief. Generate one in the Brand Hub first.");
      return;
    }
    setGeneratingVoiceover(true);
    setError("");
    try {
      // If the brief carries per-scene segments (from idea-to-scenes), use them
      // so each line is paced to its scene's duration. Otherwise fall back to
      // the single-blob script (legacy path).
      const useSegments = brief.voiceoverSegments && brief.voiceoverSegments.length > 0;
      const body = useSegments
        ? {
            segments: brief.voiceoverSegments,
            musicDirection: brief.musicDirection || "professional",
          }
        : {
            script: brief.voiceoverScript,
            musicDirection: brief.musicDirection || "professional",
          };

      const res = await fetch("/api/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate voiceover");
      }
      const data = await res.json() as { voiceoverUrl: string; segments?: { sceneIndex: number; url: string }[] };
      setVoiceoverUrl(data.voiceoverUrl);
      setAssets({
        voiceoverUrl: data.voiceoverUrl,
        voiceoverSegments: data.segments,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingVoiceover(false);
    }
  };

  const handleAssemble = async () => {
    setAssembling(true);
    setError("");

    try {
      // Sprint 1 fix: use the unified /api/finalize-video endpoint that
      // probes real clip durations FIRST, then generates voiceover paced to
      // those exact durations, then assembles. Eliminates VO drift.
      const res = await fetch("/api/finalize-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoClips: generatedClips,
          plannedDurations: sceneMotions.map((m) => m.duration),
          // Pass segments (if available from idea-to-scenes) so each scene's
          // VO is paced to its CLIP's actual duration, not the planned one.
          voiceoverSegments: brief?.voiceoverSegments,
          voiceoverScript: brief?.voiceoverScript,
          musicDirection: brief?.musicDirection || "professional",
          tier: selectedTier,
          adFormat: brief?.adFormat,
          useNativeAudio: selectedTier === "premium",
          aspectRatio: selectedAspectRatio,
          burnedCaptions: burnCaptions,
          captionStyle,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to finalize video");
      }

      const data = await res.json() as {
        videoUrl: string;
        voiceoverUrl?: string;
        srtUrl?: string;
        captionsBurned?: boolean;
        segments?: { sceneIndex: number; url: string }[];
      };
      setFinalVideo(data.videoUrl);
      if (data.voiceoverUrl) setVoiceoverUrl(data.voiceoverUrl);
      if (data.srtUrl) setSrtUrl(data.srtUrl);
      setAssets({
        videoUrl: data.videoUrl,
        voiceoverUrl: data.voiceoverUrl,
        voiceoverSegments: data.segments,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssembling(false);
    }
  };

  // ─── Empty state — offer upload of existing images ─────────────
  if (scenes.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6 pt-12">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Video Studio</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Animate your scenes into a video ad. Use existing images you already have, or generate fresh ones in the Scene Builder.
            </p>
          </div>

          {/* Upload existing images */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Use my existing scene images</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Drop in PNG or JPG files — each one becomes a scene you can animate. You can reorder, add more, or remove any scene after uploading.
            </p>
            <label className="block">
              <div className="border-2 border-dashed border-primary/40 rounded-xl px-4 py-8 text-center cursor-pointer hover:bg-primary/5 transition-colors">
                {uploadingImages ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-primary mx-auto mb-2" />
                    <div className="text-sm font-medium">Click to choose images</div>
                    <div className="text-[11px] text-muted-foreground mt-1">PNG, JPG, WEBP — multiple files supported</div>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImages}
                onChange={(e) => { handleUploadSceneImages(e.target.files); e.target.value = ""; }}
                className="hidden"
              />
            </label>
          </div>

          {/* Or generate in Scene Builder */}
          <div className="text-center text-xs text-muted-foreground">
            <span className="mr-2">or</span>
            <a href="/creative" className="text-primary hover:underline">generate scenes in the Scene Builder →</a>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}
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

        {/* ─── Quality Tier ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <QualityTierSelector value={selectedTier} onChange={setTier} title="Quality Tier" />
        </div>

        {/* ─── Global Settings ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Film className="w-4 h-4" /> Video Settings
          </h3>

          {/* ── AI Auto-Fill Motion Descriptions ───────────────── */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs font-medium flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                Auto-fill motion descriptions
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                AI writes per-scene motion direction based on each scene&apos;s camera move, duration, and voiceover line. You can edit any line after.
              </p>
            </div>
            <button
              onClick={handleFillMotions}
              disabled={motionsLoading || scenes.length === 0}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs whitespace-nowrap"
            >
              {motionsLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Filling…</> : <><Sparkles className="w-3.5 h-3.5" /> Fill with AI</>}
            </button>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Default Clip Duration
              <span className="text-muted-foreground/60 ml-1">
                (allowed for {selectedTier.toUpperCase()} tier)
              </span>
            </label>
            <div className="flex gap-2">
              {TIER_DURATION_OPTIONS[selectedTier].map((d) => (
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
            {selectedTier === "premium" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Kling v2.5 Turbo Pro only accepts 5s or 10s clips.
              </p>
            )}
          </div>

          {/* Hero Frame for Character Consistency */}
          {scenes.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border">
              <label className="block text-xs text-muted-foreground mb-1.5">
                Hero Frame <span className="text-primary/60">(character consistency across clips)</span>
              </label>
              <p className="text-[10px] text-muted-foreground mb-2">
                Each clip still animates its own scene. The hero frame is passed as an additional identity reference so the same character / product stays consistent across all clips.
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
                {/* Header — div+role=button so we can nest a delete <button> inside */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedScene(isExpanded ? null : idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedScene(isExpanded ? null : idx);
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <img src={img} alt={`Scene ${idx + 1}`} className="w-16 h-10 object-cover rounded-lg border border-border" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Scene {idx + 1}</div>
                      <div className="text-xs text-muted-foreground">{moveLabel} · {motion.duration}s</div>
                    </div>
                    {clip && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Clip ready</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {scenes.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveScene(idx); }}
                        className="text-muted-foreground hover:text-red-400 p-1"
                        title="Remove this scene"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {/* Source image preview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl overflow-hidden border border-border">
                        <img src={img} alt={`Scene ${idx + 1}`} className={`w-full ${ASPECT_RATIO_CLASS[selectedAspectRatio]} object-cover`} />
                        <div className="px-3 py-1.5 text-xs text-muted-foreground bg-secondary/50">Source frame</div>
                      </div>
                      {clip ? (
                        <div className="rounded-xl overflow-hidden border border-border">
                          <video src={clip} className={`w-full ${ASPECT_RATIO_CLASS[selectedAspectRatio]} object-cover`} controls muted />
                          <div className="px-3 py-1.5 text-xs text-green-400 bg-secondary/50 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Generated clip
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-xl border border-dashed border-border flex items-center justify-center ${ASPECT_RATIO_CLASS[selectedAspectRatio]}`}>
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
                          {TIER_DURATION_OPTIONS[selectedTier].map((d) => (
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

          {/* Add more scene images by upload */}
          <label className="block">
            <div className="w-full border border-dashed border-border rounded-2xl py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 cursor-pointer">
              {uploadingImages
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                : <><Plus className="w-4 h-4" /> Add scene image(s) from upload</>}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingImages}
              onChange={(e) => { handleUploadSceneImages(e.target.files); e.target.value = ""; }}
              className="hidden"
            />
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Cost preview — exact $ and ETA before user clicks Generate Clips */}
        {(() => {
          const hasRefs = !!brandKit.logoUrl || !!(assets.productAngleUrls?.length) || !!(assets.characterRefUrls?.some(Boolean));
          const preflight = estimatePreflightCost({
            tier: selectedTier,
            imageSceneCount: 0, // images already exist when on this page
            hasRefs,
            videoDurations: sceneMotions.map((m) => m.duration),
          });
          return (
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Estimated cost:</span>
                  <span className="font-semibold text-foreground">${preflight.totalUsd.toFixed(2)}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground">~{formatDuration(preflight.estimatedSeconds)}</span>
                </div>
                {preflight.lines[0] && (
                  <div className="text-[10px] text-muted-foreground/80">{preflight.lines.join("  ·  ")}</div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                tier: <span className="text-primary/80 uppercase">{selectedTier}</span>
              </div>
            </div>
          );
        })()}

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

          {/* Voiceover preview — generated inline during assembly (Sprint 1 fix).
              No standalone "Generate" button — finalize-video does it with
              frame-perfect duration matching. This panel just previews the
              script + latest VO audio if assembly has been run. */}
          {generatedClips.length > 0 && brief?.voiceoverScript && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Voiceover</h3>
                  <p className="text-xs text-muted-foreground">
                    {brief.voiceoverSegments?.length
                      ? `${brief.voiceoverSegments.length} per-scene segments, paced to each clip's actual duration. Generated automatically on Assemble.`
                      : `Single-line script · generated automatically on Assemble.`}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 italic">&quot;{brief.voiceoverScript.slice(0, 120)}{brief.voiceoverScript.length > 120 ? "…" : ""}&quot;</p>
                </div>
                {voiceoverUrl && (
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full whitespace-nowrap">Latest ready</span>
                )}
              </div>
              {voiceoverUrl && (
                <audio src={voiceoverUrl} controls className="w-full h-8" />
              )}
            </div>
          )}

          {/* Captions (Sprint 2) — appears once clips are generated */}
          {generatedClips.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" /> Captions
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Captioned video gets ~80% more watch-time on mobile feeds. A .srt sidecar is always written; turn on burn-in for TikTok / Reels / Stories where platforms don&apos;t show caption tracks.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={burnCaptions}
                    onChange={(e) => setBurnCaptions(e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-xs">Burn in</span>
                </label>
              </div>

              {burnCaptions && (
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1.5">Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "modern", label: "Modern", desc: "White + black outline" },
                      { id: "tiktok", label: "TikTok", desc: "Yellow bold, centered" },
                      { id: "cinematic", label: "Cinematic", desc: "Italic, lower-third bg" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCaptionStyle(opt.id)}
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                          captionStyle === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {srtUrl && (
                <a
                  href={srtUrl}
                  download
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download .srt
                </a>
              )}
            </div>
          )}

          {/* Assemble */}
          {generatedClips.length > 0 && (
            <button onClick={handleAssemble} disabled={assembling || generatingClips}
              className="w-full bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2">
              {assembling ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Assembling final video...</>
              ) : (
                <><Film className="w-5 h-5" /> Assemble Final Video ({generatedClips.length} clips{voiceoverUrl ? " + voiceover" : ""}{burnCaptions ? " + captions" : ""})</>
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
            {/* For vertical/square formats, cap the width so the player fits on screen.
                Native <video> respects the file's intrinsic aspect — we just bound it. */}
            <div
              className="rounded-xl overflow-hidden border border-border mx-auto"
              style={{
                maxWidth:
                  selectedAspectRatio === "9:16" ? 360 :
                  selectedAspectRatio === "4:5" ? 480 :
                  selectedAspectRatio === "1:1" ? 540 :
                  "100%",
              }}
            >
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
