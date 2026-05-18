// ─── Quality Tier Selector ───────────────────────────────────────
// Pure function that maps (tier, useCase, available inputs) → routing decision.
//
// The user picks ONE tier (Budget / Premium / Ultra), and this module picks
// the BEST model for their use case within that tier. Different use cases get
// different models even within the same tier (e.g. image vs video vs ref-to-video).
//
// Design goal: simple UX (3 tiers), smart routing (right model per scenario).

import type { QualityTier } from "@/lib/types";

export type UseCase =
  | "image"          // text-to-image (no refs)
  | "image-edit"     // image generation with reference photos (product/character/logo)
  | "video-i2v"      // image-to-video (animate a single source frame)
  | "video-t2v"      // text-to-video (no source image)
  | "video-ref";     // reference-to-video (animate while preserving multiple subjects)

export interface AvailableInputs {
  /** Source frame for i2v (the generated scene image). */
  sourceImageUrl?: string;
  /** Product reference photos. */
  productImageUrls?: string[];
  /** Brand logo URL. */
  logoUrl?: string;
  /** Character reference photo (face/full body shot). */
  characterRefUrl?: string;
}

export interface ModelSelection {
  /** Which provider to call. */
  provider: "wavespeed" | "higgsfield" | "fallback";
  /** Which use case path to take inside that provider. */
  path: UseCase;
  /** Estimated cost in USD (for transparency / billing). */
  estimatedCostUsd: number;
  /** Human-readable description shown in UI / logs. */
  description: string;
  /** Optional explicit duration hint passed downstream. */
  durationSec?: number;
}

/**
 * Counts how many reference inputs are present.
 */
function refCount(inputs: AvailableInputs): number {
  return (
    (inputs.productImageUrls?.length ?? 0) +
    (inputs.logoUrl ? 1 : 0) +
    (inputs.characterRefUrl ? 1 : 0)
  );
}

/**
 * Pick the best image-generation path.
 * - If refs present (product/character/logo) → use image-edit (multi-reference fusion)
 * - Else → use text-to-image
 */
export function selectImageModel(tier: QualityTier, inputs: AvailableInputs): ModelSelection {
  const hasRefs = refCount(inputs) > 0;
  const path: UseCase = hasRefs ? "image-edit" : "image";

  // Cost estimates (per image, USD) — keep in sync with wavespeed pricing
  const cost = hasRefs
    ? { budget: 0.04, premium: 0.07, ultra: 0.14 }[tier]
    : { budget: 0.005, premium: 0.07, ultra: 0.14 }[tier];

  const modelName = hasRefs
    ? { budget: "Seedream V4 Edit", premium: "Nano Banana 2 Edit", ultra: "Nano Banana Pro Edit Multi" }[tier]
    : { budget: "Z-Image Turbo", premium: "Nano Banana 2", ultra: "Nano Banana Pro" }[tier];

  return {
    provider: "wavespeed",
    path,
    estimatedCostUsd: cost,
    description: `${tier.toUpperCase()} · ${modelName}${hasRefs ? ` (${refCount(inputs)} ref${refCount(inputs) > 1 ? "s" : ""})` : ""}`,
  };
}

/**
 * Pick the best video-generation path.
 * - If refs present AND tier >= premium → use reference-to-video (preserves all subjects)
 * - Else if source image present → use image-to-video (animate the scene)
 * - Else → use text-to-video
 */
export function selectVideoModel(
  tier: QualityTier,
  inputs: AvailableInputs,
  durationSec = 5
): ModelSelection {
  const hasRefs = refCount(inputs) > 0;
  const hasSource = !!inputs.sourceImageUrl;

  // ── ROUTING RULE (read this before changing the branches) ──────────────
  //
  // When a generated scene image is present (`sourceImageUrl`), it ALREADY
  // encodes whatever the references conveyed — Nano Banana Pro Edit Multi
  // (and the lower tiers' edit models) fused character + product + logo
  // into the rendered frame. Passing the scene image to image-to-video
  // preserves that exact outfit / pose / composition.
  //
  // Reference-to-video models (Wan 2.7, Seedance v1 Lite) IGNORE the scene
  // image and re-imagine the frame from raw refs only, which often produces
  // a totally different outfit than what was in the approved scene. That's
  // almost never what the user wants after they've signed off the scene.
  //
  // So: if a scene image exists, prefer i2v at every tier. Only fall back
  // to ref-to-video when refs exist but NO scene image (e.g. a campaign
  // starting straight from references without going through Scene Builder).

  // Image-to-video — preferred path whenever a scene image exists.
  if (hasSource) {
    const costPerSec = { budget: 0.01, premium: 0.084, ultra: 0.15 }[tier];
    const model = { budget: "Wan 2.2 Ultra Fast", premium: "Kling v2.5 Turbo Pro", ultra: "Seedance 2.0" }[tier];
    const refNote = hasRefs ? " (scene image preserves your refs)" : "";
    return {
      provider: "wavespeed",
      path: "video-i2v",
      estimatedCostUsd: costPerSec * durationSec,
      description: `${tier.toUpperCase()} · ${model} i2v (${durationSec}s)${refNote}`,
      durationSec,
    };
  }

  // Reference-to-video — only when NO scene image is available.
  if (hasRefs && tier !== "budget") {
    const cost = tier === "premium" ? 0.10 * durationSec : 0.15 * durationSec;
    const model = tier === "premium" ? "Seedance v1 Lite Reference" : "Wan 2.7 Reference-to-Video";
    return {
      provider: "wavespeed",
      path: "video-ref",
      estimatedCostUsd: cost,
      description: `${tier.toUpperCase()} · ${model} (${refCount(inputs)} refs, ${durationSec}s, no scene image)`,
      durationSec,
    };
  }

  // Text-to-video — no source image, no refs.
  const costPerSec = { budget: 0.01, premium: 0.084, ultra: 0.15 }[tier];
  const model = { budget: "Wan 2.2 Ultra Fast", premium: "Kling v2.5 Turbo Pro", ultra: "Seedance 2.0" }[tier];
  return {
    provider: "wavespeed",
    path: "video-t2v",
    estimatedCostUsd: costPerSec * durationSec,
    description: `${tier.toUpperCase()} · ${model} t2v (${durationSec}s)`,
    durationSec,
  };
}

/**
 * Estimate the total cost for a typical campaign at a given tier.
 * Used to show users the budget impact of each tier choice.
 */
export interface CampaignCostEstimate {
  perImage: number;
  perImageWithRefs: number;
  perVideoSecond: number;
  per5SecClipWithRefs: number;
  /** Typical 3-scene campaign: 3 images + 3 x 5s clips */
  typicalCampaign: number;
}

export function estimateCampaignCost(tier: QualityTier): CampaignCostEstimate {
  const perImage = { budget: 0.005, premium: 0.07, ultra: 0.14 }[tier];
  const perImageWithRefs = { budget: 0.04, premium: 0.07, ultra: 0.14 }[tier];
  const perVideoSecond = { budget: 0.01, premium: 0.084, ultra: 0.15 }[tier];
  const per5SecClipWithRefs = tier === "budget" ? 0.05 : (tier === "premium" ? 0.50 : 0.75);
  const typicalCampaign = perImage * 3 + perVideoSecond * 15;
  return { perImage, perImageWithRefs, perVideoSecond, per5SecClipWithRefs, typicalCampaign };
}

// ─── Precise pre-flight cost estimator ─────────────────────────────────
// Used by the UI's "Cost preview before generate" panel to show the user
// exactly what they're about to spend BEFORE clicking generate. Eliminates
// the #1 anxiety in the product.

export interface PreflightCostBreakdown {
  /** Sum of per-scene image costs. */
  imagesUsd: number;
  /** Sum of per-scene video costs (only filled when including video). */
  videoUsd: number;
  /** Voiceover + assembly cost (Gemini TTS is free up to quota; FFmpeg = 0). */
  audioUsd: number;
  /** Total — what the user pays for the whole flow. */
  totalUsd: number;
  /** Time estimate in seconds (best-case). */
  estimatedSeconds: number;
  /** Human-readable breakdown lines for the UI. */
  lines: string[];
}

export interface PreflightCostParams {
  tier: QualityTier;
  /** Number of scenes the user will generate images for. */
  imageSceneCount: number;
  /** True if any reference image is attached (logo / product / character). Adds ~$0.05 on Premium/Ultra. */
  hasRefs: boolean;
  /** Optional: include video-clip cost. Pass `videoDurations` array. */
  videoDurations?: number[];
}

/**
 * Compute the precise cost of a scene-image-only run, or a full image+video+audio
 * run, based on the user's tier and scene count.
 *
 * Image times: ~70s/scene Ultra, ~45s Premium, ~15s Budget.
 * Video times: ~75s/clip Ultra (Seedance 2.0), ~65s Premium (Kling), ~25s Budget (Wan).
 * Audio: ~5s per voiceover segment + ~10s assembly.
 */
export function estimatePreflightCost(params: PreflightCostParams): PreflightCostBreakdown {
  const { tier, imageSceneCount, hasRefs, videoDurations } = params;
  const costEst = estimateCampaignCost(tier);
  const lines: string[] = [];

  // Images
  const perImage = hasRefs ? costEst.perImageWithRefs : costEst.perImage;
  const imagesUsd = perImage * imageSceneCount;
  if (imageSceneCount > 0) {
    lines.push(`${imageSceneCount}× scene image${imageSceneCount > 1 ? "s" : ""}${hasRefs ? " (with refs)" : ""} · $${perImage.toFixed(3)} each = $${imagesUsd.toFixed(2)}`);
  }

  // Video
  let videoUsd = 0;
  if (videoDurations?.length) {
    const totalSeconds = videoDurations.reduce((s, d) => s + (d || 5), 0);
    videoUsd = costEst.perVideoSecond * totalSeconds;
    lines.push(`${videoDurations.length}× video clip${videoDurations.length > 1 ? "s" : ""} (${totalSeconds}s total) · $${costEst.perVideoSecond.toFixed(3)}/s = $${videoUsd.toFixed(2)}`);
  }

  // Audio (voiceover + assembly are effectively free at current Gemini TTS quotas)
  const audioUsd = 0;
  if (videoDurations?.length) {
    lines.push(`Voiceover + assembly · included`);
  }

  const totalUsd = imagesUsd + videoUsd + audioUsd;

  // Time estimates
  const imageSecsPerScene = { budget: 15, premium: 45, ultra: 70 }[tier];
  const videoSecsPerClip = { budget: 25, premium: 65, ultra: 75 }[tier];
  const imageTime = imageSceneCount * imageSecsPerScene;
  const videoTime = (videoDurations?.length ?? 0) * videoSecsPerClip;
  const audioTime = videoDurations?.length ? videoDurations.length * 22 + 15 : 0; // 22s per VO segment + 15s assembly
  const estimatedSeconds = imageTime + videoTime + audioTime;

  return { imagesUsd, videoUsd, audioUsd, totalUsd, estimatedSeconds, lines };
}

/** Format seconds as "1m 45s" or "45s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
