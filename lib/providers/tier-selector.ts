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
