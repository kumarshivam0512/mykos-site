// ─── WaveSpeed Image Provider ────────────────────────────────────
// Text-to-image generation across budget/premium/ultra tiers.
//
// Budget:  Z-Image Turbo          ($0.005/image, 200/$1)
// Premium: Nano Banana 2          ($0.07/image, photoreal, character consistency)
// Ultra:   Nano Banana Pro        ($0.14/image, top-tier realism + typography)

import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt, type RealismSettings } from "@/lib/prompts/prompt-engine";
import { optimizePromptForModel, type TargetModel } from "@/lib/prompts/model-tuning";
import { runWaveSpeedTask, aspectRatioFromDimensions, ASPECT_RATIO_ALLOW, type WaveSpeedResult } from "./wavespeed-base";

/** WaveSpeed text-to-image model IDs (verified from MODELS.md). */
export type WaveSpeedImageTier = "budget" | "premium" | "ultra";

const IMAGE_TIER_MODELS: Record<WaveSpeedImageTier, string> = {
  // NOTE: WaveSpeed uses slash separators between family and variant.
  // Verified live: https://api.wavespeed.ai/api/v3/wavespeed-ai/z-image/turbo
  budget: "wavespeed-ai/z-image/turbo",
  premium: "google/nano-banana-2/text-to-image",
  ultra: "google/nano-banana-pro/text-to-image",
};

/** Map tier → TargetModel for prompt tuning. */
const IMAGE_TIER_TARGET: Record<WaveSpeedImageTier, TargetModel> = {
  budget: "z-image-turbo",
  premium: "nano-banana-2",
  ultra: "nano-banana-pro",
};

/** Per-tier output resolution defaults. */
const TIER_RESOLUTION: Record<WaveSpeedImageTier, "1k" | "2k" | "4k"> = {
  budget: "1k",
  premium: "1k",
  ultra: "2k",
};

export async function generateImageWaveSpeed(
  scene: Scene,
  brandKit: BrandKit,
  tier: WaveSpeedImageTier,
  width = 1024,
  height = 576,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings,
  /** Aspect ratio — passes through to the prompt for composition cues. */
  aspectRatioHint?: "16:9" | "9:16" | "1:1" | "4:5"
): Promise<WaveSpeedResult> {
  const basePrompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism, aspectRatioHint);
  const prompt = optimizePromptForModel(basePrompt, IMAGE_TIER_TARGET[tier], realism);
  const modelId = IMAGE_TIER_MODELS[tier];
  const aspectRatio = aspectRatioFromDimensions(width, height, ASPECT_RATIO_ALLOW[modelId]);

  // Z-Image Turbo doesn't accept resolution flag — only Nano Banana models do.
  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
  };
  if (tier !== "budget") {
    body.resolution = TIER_RESOLUTION[tier];
  }

  return runWaveSpeedTask(modelId, body, { label: `image-${tier}` });
}
