// ─── WaveSpeed Multi-Reference Image Editor ──────────────────────
// Generate scene images that include actual product photos, brand logo, and
// character reference photos using multi-image fusion models.
//
// This is the consistency solution: product/character/logo are passed as
// REAL image inputs to the AI model (not just described in text).
//
// Budget:  Seedream V4 Edit                  ($0.04/image, image-to-image)
// Premium: Nano Banana 2 Edit                ($0.07/image, multi-image fusion)
// Ultra:   Nano Banana Pro Edit Multi        ($0.14/image, best multi-ref quality)

import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt, type RealismSettings } from "@/lib/prompts/prompt-engine";
import { optimizePromptForModel, type TargetModel } from "@/lib/prompts/model-tuning";
import { runWaveSpeedTask, aspectRatioFromDimensions, ASPECT_RATIO_ALLOW, type WaveSpeedResult } from "./wavespeed-base";

export type WaveSpeedEditTier = "budget" | "premium" | "ultra";

const EDIT_TIER_MODELS: Record<WaveSpeedEditTier, string> = {
  // Seedream V4 Edit supports a single reference image (image-to-image).
  // NOTE: model ID uses slash separator (verified live).
  budget: "bytedance/seedream-v4/edit",
  // Nano Banana 2 Edit supports multiple reference images natively.
  premium: "google/nano-banana-2/edit",
  // Pro Edit Multi: top-tier multi-image fusion.
  ultra: "google/nano-banana-pro/edit-multi",
};

const EDIT_TIER_TARGET: Record<WaveSpeedEditTier, TargetModel> = {
  budget: "seedream-v4-edit",
  premium: "nano-banana-2-edit",
  ultra: "nano-banana-pro-edit",
};

const TIER_RESOLUTION: Record<WaveSpeedEditTier, "1k" | "2k" | "4k"> = {
  budget: "1k",
  premium: "1k",
  ultra: "2k",
};

export interface MultiRefInputs {
  /** Public URLs of product images (front, back, side, etc.). */
  productImageUrls?: string[];
  /** Public URL of brand logo. */
  logoUrl?: string;
  /** Public URL of character reference photo (face/full body shot). */
  characterRefUrl?: string;
  /** Optional additional reference images (location, style, etc.). */
  extraRefUrls?: string[];
}

/**
 * Collect all reference image URLs into a single ordered array.
 * Order matters: character first (face is highest priority), then product, then logo.
 * Nano Banana models accept up to ~6 reference images.
 */
export function collectReferenceUrls(refs: MultiRefInputs): string[] {
  const urls: string[] = [];
  if (refs.characterRefUrl) urls.push(refs.characterRefUrl);
  if (refs.productImageUrls?.length) urls.push(...refs.productImageUrls.slice(0, 3));
  if (refs.logoUrl) urls.push(refs.logoUrl);
  if (refs.extraRefUrls?.length) urls.push(...refs.extraRefUrls.slice(0, 2));
  return urls.slice(0, 6); // models typically cap at 6
}

/**
 * Build a prompt that instructs the AI how to use the references.
 * This augments the standard image prompt with explicit reference guidance.
 */
function buildMultiRefPrompt(
  basePrompt: string,
  refs: MultiRefInputs,
  refUrls: string[]
): string {
  if (refUrls.length === 0) return basePrompt;

  const guidance: string[] = [];
  let refIndex = 0;

  if (refs.characterRefUrl) {
    guidance.push(`Reference image ${refIndex + 1} is the character — preserve their face, hair, and overall appearance exactly`);
    refIndex++;
  }
  if (refs.productImageUrls?.length) {
    const count = refs.productImageUrls.slice(0, 3).length;
    guidance.push(`Reference image${count > 1 ? "s" : ""} ${refIndex + 1}${count > 1 ? `-${refIndex + count}` : ""} show the actual product — render it exactly as shown, preserving shape, color, branding, and proportions`);
    refIndex += count;
  }
  if (refs.logoUrl) {
    guidance.push(`Reference image ${refIndex + 1} is the brand logo — place it naturally in the scene (corner or on packaging) without distortion`);
    refIndex++;
  }

  return `${basePrompt}\n\nReference guidance: ${guidance.join("; ")}.`;
}

export async function generateImageWithRefs(
  scene: Scene,
  brandKit: BrandKit,
  tier: WaveSpeedEditTier,
  refs: MultiRefInputs,
  width = 1024,
  height = 576,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings
): Promise<WaveSpeedResult> {
  const refUrls = collectReferenceUrls(refs);
  if (refUrls.length === 0) {
    throw new Error("generateImageWithRefs requires at least one reference image URL");
  }

  const basePrompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, true, sceneBackdrop, characterSheet, realism);
  const promptWithRefs = buildMultiRefPrompt(basePrompt, refs, refUrls);
  const prompt = optimizePromptForModel(promptWithRefs, EDIT_TIER_TARGET[tier], realism);
  const modelId = EDIT_TIER_MODELS[tier];
  const aspectRatio = aspectRatioFromDimensions(width, height, ASPECT_RATIO_ALLOW[modelId]);

  // Seedream V4 Edit accepts a single `image` field; Nano Banana variants accept `images` array.
  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution: TIER_RESOLUTION[tier],
  };
  if (tier === "budget") {
    body.image = refUrls[0]; // Seedream V4 Edit takes single reference
  } else {
    body.images = refUrls; // Nano Banana 2/Pro Edit takes array
  }

  return runWaveSpeedTask(modelId, body, { label: `edit-${tier}` });
}
