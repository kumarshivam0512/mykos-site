import { NextRequest, NextResponse } from "next/server";
import { orchestrateVideo } from "@/lib/providers/orchestrator";
import type { Scene, CameraSettings, AdFormat, QualityTier } from "@/lib/types";
import type { RealismSettings } from "@/lib/prompts/prompt-engine";
import { checkRateLimit, checkCostCap, recordCost, apiError, ERROR_CODES } from "@/lib/rate-limit";
import { estimateCampaignCost } from "@/lib/providers/tier-selector";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

/**
 * Convert a relative path to an absolute public URL.
 */
function toPublicUrl(req: NextRequest, relativeUrl: string | undefined | null): string | undefined {
  if (!relativeUrl) return undefined;
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) return relativeUrl;
  if (relativeUrl.startsWith("data:")) return relativeUrl;
  const origin = req.nextUrl.origin;
  return `${origin}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
}

export async function POST(req: NextRequest) {
  // Rate limit check
  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const body = await req.json();
    const {
      images,
      scenes,
      testMode = false,
      aspectRatio = "16:9",
      duration = 5,
      cameraSettings,
      adFormat,
      sourceUrls,
      sceneBackdrop,
      characterSheet,
      realism,
      heroFrameIdx,
      tier = "premium",
      productAngleUrls,
      logoUrl,
      characterRefUrl,
      characterRefUrls,
      existingClips,
    } = body as {
      images: string[];
      scenes: Scene[];
      testMode?: boolean;
      aspectRatio?: string;
      duration?: number;
      cameraSettings?: CameraSettings;
      adFormat?: AdFormat;
      sourceUrls?: string[];
      sceneBackdrop?: string;
      characterSheet?: string;
      realism?: RealismSettings;
      heroFrameIdx?: number | null;
      tier?: QualityTier;
      productAngleUrls?: string[];
      logoUrl?: string;
      /** Single ref applied to all scenes (legacy / shorthand). */
      characterRefUrl?: string;
      /** Per-scene refs — index aligned with scenes[]. Wins over characterRefUrl when present. */
      characterRefUrls?: (string | undefined)[];
      /** Existing clip URLs from a previous (possibly partial) run. Indices with a non-empty entry are skipped. */
      existingClips?: (string | null | undefined)[];
    };

    if (!images?.length || !scenes?.length) {
      return apiError("Images and scenes required", ERROR_CODES.MISSING_INPUT, 400);
    }

    const hasProvider = !!(
      process.env.WAVESPEED_API_KEY ||
      (process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET) ||
      process.env.REPLICATE_API_TOKEN ||
      process.env.FAL_KEY
    );
    if (!hasProvider) {
      return apiError("No video provider configured", ERROR_CODES.NO_PROVIDER, 503);
    }

    // Cost cap check — video is the expensive operation; estimate upfront
    const totalSeconds = scenes.reduce((sum, s) => sum + Math.min(s.duration || duration, 12), 0);
    const costEst = estimateCampaignCost(tier);
    const hasRefs = !!(logoUrl || productAngleUrls?.length || characterRefUrl || characterRefUrls?.some((u) => !!u));
    const estimatedCost = hasRefs && tier !== "budget"
      ? costEst.per5SecClipWithRefs * (totalSeconds / 5)
      : costEst.perVideoSecond * totalSeconds;
    const capCheck = checkCostCap(req, estimatedCost);
    if (capCheck) return capCheck;

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const count = testMode ? 1 : Math.min(images.length, scenes.length);
    // Pre-fill from any prior partial run so we can skip already-generated clips
    const clipPaths: (string | null)[] = Array.from({ length: count }, (_, i) => existingClips?.[i] || null);
    const clipModels: (string | null)[] = Array.from({ length: count }, () => null);
    const errors: { index: number; message: string }[] = [];
    let totalCostUsd = 0;

    // Resolve reference URLs (must be publicly fetchable for WaveSpeed)
    const publicLogoUrl = toPublicUrl(req, logoUrl);
    const publicCharacterRefUrl = toPublicUrl(req, characterRefUrl);
    const publicProductUrls = productAngleUrls?.map((u) => toPublicUrl(req, u)).filter((u): u is string => !!u);
    // Per-scene character refs (index aligned with scenes[])
    const publicCharacterRefUrls = characterRefUrls?.map((u) => toPublicUrl(req, u));

    // Hero Frame: resolve ONCE — used as an additional reference image for
    // character/identity consistency across clips. Each clip still animates
    // its OWN scene image; the hero frame is layered in via productImageUrls
    // (Wan/Seedance ref-to-video) so the model preserves the hero's likeness.
    let heroRefUrl: string | undefined;
    if (heroFrameIdx != null && heroFrameIdx >= 0 && heroFrameIdx < images.length) {
      heroRefUrl = sourceUrls?.[heroFrameIdx] || toPublicUrl(req, images[heroFrameIdx]);
      console.log(`[VideoClips] Hero Frame: scene ${heroFrameIdx + 1} added as identity reference (each clip still animates its own scene)`);
    }

    for (let i = 0; i < count; i++) {
      // Skip indices that already succeeded in a prior run
      if (clipPaths[i]) continue;

      if (i > 0) await new Promise((r) => setTimeout(r, 1500));

      // Each clip animates its OWN scene image. The hero frame is NOT used
      // as the source — that would just produce 4 copies of the hero clip.
      const sourceImageUrl = sourceUrls?.[i] || toPublicUrl(req, images[i]);

      const clipDuration = Math.min(scenes[i].duration || duration, 12);

      // Per-scene character ref wins over global ref. Hero frame, when set,
      // is appended to product refs (which Wan/Seedance ref-to-video treat as
      // identity anchors). Skip the hero frame for the scene the hero IS.
      const sceneCharacterRefUrl = publicCharacterRefUrls?.[i] || publicCharacterRefUrl;
      const refsForThisScene = heroRefUrl && i !== heroFrameIdx
        ? [...(publicProductUrls ?? []), heroRefUrl]
        : publicProductUrls;

      try {
        const result = await orchestrateVideo({
          scene: scenes[i],
          tier,
          sourceImageUrl,
          duration: clipDuration,
          aspectRatio,
          cameraSettings,
          adFormat,
          sceneBackdrop,
          characterSheet,
          realism,
          inputs: {
            productImageUrls: refsForThisScene,
            logoUrl: publicLogoUrl,
            characterRefUrl: sceneCharacterRefUrl,
          },
        });

        const clipPath = path.join(OUTPUT_DIR, `ai_clip_${i}.mp4`);
        await fs.writeFile(clipPath, result.buffer);
        // Cache-bust so the browser doesn't reuse stale video for the same path
        const cacheBust = Date.now();
        clipPaths[i] = `/output/ai_clip_${i}.mp4?v=${cacheBust}`;
        clipModels[i] = result.modelDescription;
        totalCostUsd += result.estimatedCostUsd;
      } catch (err) {
        const message = (err as Error).message || "clip generation failed";
        console.error(`[generate-video-clips] clip ${i} failed:`, message);
        errors.push({ index: i, message });
        // continue — let the rest succeed so the user can resume just the failures
      }
    }

    // Record actual cost for cost-cap accounting
    recordCost(req, totalCostUsd);

    const completed = clipPaths.filter(Boolean).length;
    const partial = errors.length > 0;
    return NextResponse.json({
      clips: clipPaths,
      models: clipModels,
      scenesGenerated: completed,
      tier,
      totalCostUsd,
      testMode,
      errors,
      partial,
    });
  } catch (error) {
    console.error("Video clip generation error:", error);
    const msg = (error as Error).message || "Failed to generate video clips";
    const isUpstream = msg.toLowerCase().includes("provider") || msg.toLowerCase().includes("wavespeed") || msg.toLowerCase().includes("higgsfield");
    return apiError(msg, isUpstream ? ERROR_CODES.UPSTREAM_ERROR : ERROR_CODES.GENERATION_FAILED, 500);
  }
}
