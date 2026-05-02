"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import type { PipelineStep, VideoMode } from "@/lib/types";
import { VIDEO_MODELS, type VideoModel } from "@/lib/providers/fal-video";
import {
  ArrowLeft,
  Check,
  Download,
  Image as ImageIcon,
  Film,
  Mic,
  Loader2,
  RefreshCw,
  Play,
  Zap,
  DollarSign,
  FlaskConical,
} from "lucide-react";

interface PipelineStepInfo {
  key: PipelineStep;
  label: string;
  icon: React.ReactNode;
  aiVideoOnly?: boolean;
}

const PIPELINE_STEPS: PipelineStepInfo[] = [
  { key: "generating_images", label: "Generating Images", icon: <ImageIcon className="w-4 h-4" /> },
  { key: "animating_scenes", label: "Animating Scenes", icon: <Film className="w-4 h-4" />, aiVideoOnly: true },
  { key: "generating_voiceover", label: "Generating Voiceover", icon: <Mic className="w-4 h-4" /> },
  { key: "assembling_video", label: "Assembling Video", icon: <Film className="w-4 h-4" /> },
];

export default function GeneratePage() {
  const router = useRouter();
  const {
    brief,
    brandKit,
    assets,
    setAssets,
    pipeline,
    setPipelineStep,
    setPipelineProgress,
    setPipelineError,
    selectedAspectRatio,
    setAspectRatio,
    videoMode,
    setVideoMode,
  } = useAdStore();

  const [isRunning, setIsRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<PipelineStep>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideoKey, setHasVideoKey] = useState(false);
  const [testClipUrl, setTestClipUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<VideoModel>("auto");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check config on mount
  useEffect(() => {
    fetch("/api/check-config")
      .then((r) => r.json())
      .then((data) => setHasVideoKey(data.hasFalKey || data.hasReplicateKey || data.hasHiggsfieldKey))
      .catch(() => {});
  }, []);

  const estimatedCost = brief
    ? Math.round(brief.scenes.length * 5 * 0.07 * 100) / 100
    : 0;

  const runPipeline = useCallback(async () => {
    if (!brief) return;
    setIsRunning(true);

    const skipImages = assets.images.length > 0;
    const skipVoiceover = !!assets.voiceoverUrl;
    const skipAnimating = videoMode === "ai_video" && (assets.videoClips?.length ?? 0) > 0;

    if (!skipImages) setCompletedSteps(new Set());

    let currentImages = assets.images;
    let currentVoiceoverUrl = assets.voiceoverUrl;
    let currentClips = assets.videoClips;

    try {
      // Step 1: Generate Images
      if (!skipImages) {
        setPipelineStep("generating_images", "Creating visuals for each scene...");
        const imgRes = await fetch("/api/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: brief.scenes,
            brandKit,
            aspectRatio: selectedAspectRatio,
          }),
        });
        if (!imgRes.ok) throw new Error("Image generation failed");
        const imgData = await imgRes.json();
        currentImages = imgData.images;
        setAssets({
          images: imgData.images,
          variants: videoMode === "slideshow" ? (imgData.variants || []) : [],
        });
      }
      setCompletedSteps((prev) => new Set(prev).add("generating_images"));

      // Step 2: Animate scenes (AI video mode only)
      if (videoMode === "ai_video" && !skipAnimating) {
        setPipelineStep("animating_scenes", `Animating scene 1 of ${brief.scenes.length}...`);
        const clipRes = await fetch("/api/generate-video-clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: currentImages,
            scenes: brief.scenes,
            testMode: false,
            model: selectedModel,
            aspectRatio: selectedAspectRatio,
            hasProductImage: !!brandKit.logoUrl,
          }),
        });
        if (!clipRes.ok) {
          const err = await clipRes.json();
          throw new Error(err.error || "Video clip generation failed");
        }
        const clipData = await clipRes.json();
        currentClips = clipData.clips;
        setAssets({ videoClips: clipData.clips });
      }
      if (videoMode === "ai_video") {
        setCompletedSteps((prev) => new Set(prev).add("animating_scenes"));
      }

      // Step 3: Generate Voiceover
      if (!skipVoiceover) {
        setPipelineStep("generating_voiceover", "Recording voiceover...");
        try {
          const voRes = await fetch("/api/generate-voiceover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              script: brief.voiceoverScript,
              musicDirection: brief.musicDirection,
            }),
          });
          if (voRes.ok) {
            const voData = await voRes.json();
            currentVoiceoverUrl = voData.voiceoverUrl;
            setAssets({ voiceoverUrl: voData.voiceoverUrl });
          }
        } catch {
          console.warn("Voiceover failed, continuing without it");
        }
      }
      setCompletedSteps((prev) => new Set(prev).add("generating_voiceover"));

      // Step 4: Assemble Video
      setPipelineStep("assembling_video", "Assembling final video...");
      try {
        const assembleBody: Record<string, unknown> = {
          durations: brief.scenes.map((s) => s.duration),
          voiceoverUrl: currentVoiceoverUrl,
          musicTrack: undefined,
        };
        if (videoMode === "ai_video" && currentClips?.length) {
          assembleBody.videoClips = currentClips;
        } else {
          assembleBody.images = currentImages;
        }

        const assembleRes = await fetch("/api/assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assembleBody),
        });
        if (assembleRes.ok) {
          const assembleData = await assembleRes.json();
          setAssets({ videoUrl: assembleData.videoUrl });
        }
      } catch {
        console.warn("Assembly failed, showing images only");
      }
      setCompletedSteps((prev) => new Set(prev).add("assembling_video"));

      setPipelineStep("complete", "Your ad is ready!");
    } catch (err) {
      setPipelineError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  }, [brief, brandKit, selectedAspectRatio, videoMode, assets.images, assets.voiceoverUrl, assets.videoClips, setAssets, setPipelineStep, setPipelineProgress, setPipelineError]);

  const testOneScene = useCallback(async () => {
    if (!brief || !assets.images.length) return;
    setIsRunning(true);
    setPipelineStep("animating_scenes", "Testing scene 1...");
    try {
      const res = await fetch("/api/generate-video-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: assets.images,
          scenes: brief.scenes,
          testMode: true,
          model: selectedModel,
          aspectRatio: selectedAspectRatio,
          hasProductImage: !!brandKit.logoUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Test failed");
      }
      const data = await res.json();
      setTestClipUrl(data.clips[0]);
      setPipelineStep("idle", `Test clip ready (~$${data.estimatedCost})`);
    } catch (err) {
      setPipelineError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  }, [brief, assets.images, setPipelineStep, setPipelineError]);

  const regenerateImages = useCallback(async () => {
    if (!brief) return;
    setPipelineStep("generating_images", "Regenerating images...");
    setIsRunning(true);
    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: brief.scenes,
          brandKit,
          aspectRatio: selectedAspectRatio,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets({ images: data.images, variants: data.variants || [], videoClips: undefined, videoUrl: undefined });
      setTestClipUrl(null);
      setPipelineStep("complete", "Images regenerated!");
    } catch (err) {
      setPipelineError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  }, [brief, brandKit, selectedAspectRatio, setAssets, setPipelineStep, setPipelineError]);

  if (!brief) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No brief generated yet.</p>
          <button onClick={() => router.push("/")} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl">
            Go Back
          </button>
        </div>
      </main>
    );
  }

  const isComplete = pipeline.step === "complete";
  const hasImages = assets.images.length > 0;
  const hasVideo = !!assets.videoUrl;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/creative/brief")}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Brief
            </button>
            <h1 className="text-2xl font-bold">Generate Your Ad</h1>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-3">
            {/* Video Mode Toggle */}
            <div className="flex items-center bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setVideoMode("slideshow")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  videoMode === "slideshow"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => hasVideoKey && setVideoMode("ai_video")}
                title={hasVideoKey ? `AI video ~$${estimatedCost}` : "Add REPLICATE_API_TOKEN or FAL_KEY to .env.local"}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  videoMode === "ai_video"
                    ? "bg-card text-foreground shadow-sm"
                    : hasVideoKey
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                <Zap className="w-3 h-3" />
                HD Video
                {videoMode === "ai_video" && (
                  <span className="text-primary ml-1">${estimatedCost}</span>
                )}
              </button>
            </div>

            {/* Model Selector (visible in HD Video mode) */}
            {videoMode === "ai_video" && hasVideoKey && (
              <>
                <div className="w-px h-6 bg-border" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as VideoModel)}
                  className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {VIDEO_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.tier})
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="w-px h-6 bg-border" />

            {["16:9", "9:16", "1:1", "4:5"].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                  selectedAspectRatio === ratio
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Progress */}
        {(isRunning || isComplete) && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="space-y-3">
              {PIPELINE_STEPS
                .filter((step) => !step.aiVideoOnly || videoMode === "ai_video")
                .map((step) => {
                const isActive = pipeline.step === step.key;
                const isDone = completedSteps.has(step.key);
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isDone
                          ? "bg-green-500/20 text-green-400"
                          : isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isDone
                          ? "text-green-400"
                          : isActive
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                      {isActive && (
                        <span className="text-muted-foreground ml-2">{pipeline.message}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error — with retry and partial results kept visible */}
        {pipeline.step === "error" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-400">A step failed</p>
                <p className="text-sm text-red-400/80 mt-1">{pipeline.error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={runPipeline}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            </div>
            {hasImages && (
              <p className="text-xs text-muted-foreground mt-2">
                Your generated images are preserved below. Retry will resume from where it left off.
              </p>
            )}
          </div>
        )}

        {/* Start Button — show when idle and no assets yet */}
        {!isRunning && pipeline.step === "idle" && !hasImages && (
          <button
            onClick={runPipeline}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
          >
            <Play className="w-5 h-5" />
            Start Generation
          </button>
        )}

        {/* Resume Button — show when idle but has partial assets */}
        {!isRunning && pipeline.step === "idle" && hasImages && !hasVideo && (
          <div className="space-y-3">
            <button
              onClick={runPipeline}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
            >
              <Play className="w-5 h-5" />
              {videoMode === "ai_video"
                ? `Generate HD Video (~$${estimatedCost})`
                : "Resume Generation"}
            </button>

            {/* Test 1 Scene button — only in AI video mode with images ready */}
            {videoMode === "ai_video" && hasVideoKey && !testClipUrl && (
              <button
                onClick={testOneScene}
                className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                <FlaskConical className="w-4 h-4" />
                Test 1 Scene First (~$0.35) — Preview quality before full generation
              </button>
            )}
          </div>
        )}

        {/* Test Clip Preview */}
        {testClipUrl && (
          <div className="bg-card border border-primary/30 rounded-2xl p-5">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> Test Clip Preview (Scene 1)
            </h3>
            <div className="rounded-xl overflow-hidden bg-black mb-3">
              <video src={testClipUrl} className="w-full" controls />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTestClipUrl(null);
                  runPipeline();
                }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Looks good — Generate all scenes (~${estimatedCost})
              </button>
              <button
                onClick={() => setTestClipUrl(null)}
                className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Results — always show available assets regardless of pipeline state */}
        {(hasImages || hasVideo || assets.voiceoverUrl) && (
          <div className="space-y-6">
            {/* Video Player */}
            {hasVideo && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" /> Final Video
                  </h3>
                  <a
                    href={assets.videoUrl}
                    download="mykos_ad.mp4"
                    className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-sm px-3 py-1.5 rounded-lg"
                  >
                    <Download className="w-4 h-4" /> Download MP4
                  </a>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    src={assets.videoUrl}
                    className="w-full"
                    controls
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              </div>
            )}

            {/* Generated Images */}
            {hasImages && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Scene Images
                  </h3>
                  <button
                    onClick={regenerateImages}
                    disabled={isRunning}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-4 h-4" /> Regenerate
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {assets.images.map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                      <img src={img} alt={`Scene ${i + 1}`} className="w-full aspect-video object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <a
                          href={img}
                          download={`scene_${i + 1}.png`}
                          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        Scene {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hero Variants */}
            {assets.variants.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" /> Hero Scene Variants (A/B)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {assets.variants.map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                      <img src={img} alt={`Variant ${i + 1}`} className="w-full aspect-video object-cover" />
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        Variant {String.fromCharCode(65 + i)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voiceover */}
            {assets.voiceoverUrl && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-primary" /> Voiceover
                </h3>
                <audio src={assets.voiceoverUrl} controls className="w-full" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/creative/brief")}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Edit Brief
              </button>
              <button
                onClick={() => {
                  // Force full regeneration by clearing assets first
                  setAssets({ images: [], variants: [], voiceoverUrl: undefined, videoUrl: undefined });
                  setTimeout(() => runPipeline(), 100);
                }}
                disabled={isRunning}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Regenerate All
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
