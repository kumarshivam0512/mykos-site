// ─── Top-Level Generation Orchestrator ───────────────────────────
// Single entry point for scene image generation that:
//   1. Uses tier-selector to pick the right model
//   2. Routes to WaveSpeed (primary) with reference inputs when present
//   3. Falls back to existing Higgsfield → Pollinations → Replicate → Gemini chain
//   4. Returns Buffer + sourceUrl (URL needed downstream for video i2v)

import type { Scene, BrandKit, CameraSettings, AdFormat, QualityTier } from "@/lib/types";
import type { RealismSettings } from "@/lib/prompts/prompt-engine";

import { selectImageModel, selectVideoModel, type AvailableInputs } from "./tier-selector";
import { generateImageWaveSpeed } from "./wavespeed-image";
import { generateImageWithRefs, type MultiRefInputs } from "./wavespeed-edit";
import { generateVideoI2V, generateVideoT2V, generateVideoRefToVideo } from "./wavespeed-video";
import { resolveImageForWaveSpeed, resolveImagesForWaveSpeed } from "./wavespeed-base";

import { generateImageHiggsfield } from "./higgsfield-image";
import { generateImageWithFallback } from "./fallback";
import { generateVideoClip } from "./fal-video";

export interface OrchestratedImageResult {
  buffer: Buffer;
  sourceUrl: string;
  modelDescription: string;
  estimatedCostUsd: number;
}

export interface OrchestratedVideoResult {
  buffer: Buffer;
  sourceUrl: string;
  modelDescription: string;
  estimatedCostUsd: number;
}

export interface OrchestrateImageParams {
  scene: Scene;
  brandKit: BrandKit;
  tier: QualityTier;
  width?: number;
  height?: number;
  cameraSettings?: CameraSettings;
  adFormat?: AdFormat;
  sceneBackdrop?: string;
  characterSheet?: string;
  realism?: RealismSettings;
  inputs?: AvailableInputs;
  /** Which subject is the hero of the frame ("product" | "character" | "auto"). */
  hero?: "product" | "character" | "auto";
}

/**
 * Generate a single scene image. Routes through tier-selector to pick the right model.
 * Falls back to Higgsfield + free providers if WaveSpeed fails.
 */
export async function orchestrateImage(params: OrchestrateImageParams): Promise<OrchestratedImageResult> {
  const {
    scene, brandKit, tier,
    width = 1024, height = 576,
    cameraSettings, adFormat, sceneBackdrop, characterSheet, realism,
    inputs = {},
    hero = "auto",
  } = params;

  const selection = selectImageModel(tier, inputs);
  console.log(`[Orchestrate Image] ${selection.description}`);

  // ─── Primary: WaveSpeed ─────────────────────────────────────
  if (process.env.WAVESPEED_API_KEY) {
    try {
      // WaveSpeed cloud cannot reach our local /uploads/* URLs — inline them as data URIs.
      const resolvedInputs: AvailableInputs = {
        productImageUrls: await resolveImagesForWaveSpeed(inputs.productImageUrls),
        logoUrl: await resolveImageForWaveSpeed(inputs.logoUrl),
        characterRefUrl: await resolveImageForWaveSpeed(inputs.characterRefUrl),
        sourceImageUrl: await resolveImageForWaveSpeed(inputs.sourceImageUrl),
      };

      if (selection.path === "image-edit") {
        // Multi-reference fusion (product + character + logo)
        const refs: MultiRefInputs = {
          productImageUrls: resolvedInputs.productImageUrls,
          logoUrl: resolvedInputs.logoUrl,
          characterRefUrl: resolvedInputs.characterRefUrl,
        };
        const result = await generateImageWithRefs(
          scene, brandKit, tier, refs,
          width, height, cameraSettings, adFormat,
          sceneBackdrop, characterSheet, realism,
          hero
        );
        return { ...result, modelDescription: selection.description, estimatedCostUsd: selection.estimatedCostUsd };
      }

      // Standard text-to-image
      const hasProductImage = (inputs.productImageUrls?.length ?? 0) > 0;
      const result = await generateImageWaveSpeed(
        scene, brandKit, tier,
        width, height, cameraSettings, adFormat,
        hasProductImage, sceneBackdrop, characterSheet, realism
      );
      return { ...result, modelDescription: selection.description, estimatedCostUsd: selection.estimatedCostUsd };
    } catch (err) {
      console.error(`[Orchestrate Image] ❌ WaveSpeed FAILED — falling back to Higgsfield.`);
      console.error(`[Orchestrate Image] reason:`, (err as Error).message);
    }
  } else {
    console.warn(`[Orchestrate Image] ⚠️  WAVESPEED_API_KEY not set — skipping WaveSpeed.`);
  }

  // ─── Fallback: Higgsfield (existing path) ──────────────────
  if (process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET) {
    try {
      const hasProductImage = (inputs.productImageUrls?.length ?? 0) > 0;
      const result = await generateImageHiggsfield(
        scene, brandKit, width, height,
        cameraSettings, adFormat, hasProductImage,
        sceneBackdrop, characterSheet, realism
      );
      return {
        buffer: result.buffer,
        sourceUrl: result.sourceUrl,
        modelDescription: "FALLBACK · Higgsfield Soul 2.0",
        estimatedCostUsd: 0.08,
      };
    } catch (err) {
      console.warn(`[Orchestrate Image] Higgsfield failed, falling back further:`, (err as Error).message);
    }
  }

  // ─── Final Fallback: Pollinations / Replicate / Gemini ────
  const hasProductImage = (inputs.productImageUrls?.length ?? 0) > 0;
  const buffer = await generateImageWithFallback(
    scene, brandKit, width, height, Date.now(),
    cameraSettings, adFormat, hasProductImage,
    sceneBackdrop, characterSheet, realism
  );
  return {
    buffer,
    sourceUrl: "",
    modelDescription: "FALLBACK · free chain (Pollinations/Replicate/Gemini)",
    estimatedCostUsd: 0,
  };
}

export interface OrchestrateVideoParams {
  scene: Scene;
  tier: QualityTier;
  /** Public URL of the source frame (from image generation), if available. */
  sourceImageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  cameraSettings?: CameraSettings;
  adFormat?: AdFormat;
  sceneBackdrop?: string;
  characterSheet?: string;
  realism?: RealismSettings;
  inputs?: AvailableInputs;
}

/**
 * Generate a single video clip. Routes through tier-selector to pick the right model.
 * Falls back to existing Higgsfield/Replicate/Fal video chain on failure.
 */
export async function orchestrateVideo(params: OrchestrateVideoParams): Promise<OrchestratedVideoResult> {
  const {
    scene, tier, sourceImageUrl,
    duration = 5, aspectRatio = "16:9",
    cameraSettings, adFormat, sceneBackdrop, characterSheet, realism,
    inputs = {},
  } = params;

  // Merge source image into inputs for the selector
  const effectiveInputs: AvailableInputs = { ...inputs, sourceImageUrl };
  const selection = selectVideoModel(tier, effectiveInputs, duration);
  console.log(`[Orchestrate Video] ${selection.description}`);

  // ─── Primary: WaveSpeed ─────────────────────────────────────
  if (process.env.WAVESPEED_API_KEY) {
    try {
      const hasProductImage = (inputs.productImageUrls?.length ?? 0) > 0;
      const opts = { duration, aspectRatio };

      // WaveSpeed cloud cannot reach our local /uploads/* URLs — inline as data URIs.
      const resolvedSourceImageUrl = await resolveImageForWaveSpeed(sourceImageUrl);
      const resolvedCharacterRefUrl = await resolveImageForWaveSpeed(inputs.characterRefUrl);
      const resolvedLogoUrl = await resolveImageForWaveSpeed(inputs.logoUrl);
      const resolvedProductImageUrls = await resolveImagesForWaveSpeed(inputs.productImageUrls);

      if (selection.path === "video-ref") {
        // Reference-to-video: pass character/product/logo as refs
        const refUrls: string[] = [];
        if (resolvedCharacterRefUrl) refUrls.push(resolvedCharacterRefUrl);
        if (resolvedProductImageUrls.length) refUrls.push(...resolvedProductImageUrls.slice(0, 3));
        if (resolvedLogoUrl) refUrls.push(resolvedLogoUrl);
        if (resolvedSourceImageUrl) refUrls.push(resolvedSourceImageUrl); // scene image as anchor

        const result = await generateVideoRefToVideo(
          scene, tier, refUrls,
          cameraSettings, adFormat, hasProductImage,
          sceneBackdrop, characterSheet, realism, opts
        );
        return { ...result, modelDescription: selection.description, estimatedCostUsd: selection.estimatedCostUsd };
      }

      if (selection.path === "video-i2v" && resolvedSourceImageUrl) {
        const result = await generateVideoI2V(
          resolvedSourceImageUrl, scene, tier,
          cameraSettings, adFormat, hasProductImage,
          sceneBackdrop, characterSheet, realism, opts
        );
        return { ...result, modelDescription: selection.description, estimatedCostUsd: selection.estimatedCostUsd };
      }

      // Text-to-video
      const result = await generateVideoT2V(
        scene, tier,
        cameraSettings, adFormat, hasProductImage,
        sceneBackdrop, characterSheet, realism, opts
      );
      return { ...result, modelDescription: selection.description, estimatedCostUsd: selection.estimatedCostUsd };
    } catch (err) {
      console.error(`[Orchestrate Video] ❌ WaveSpeed FAILED — falling back.`);
      console.error(`[Orchestrate Video] reason:`, (err as Error).message);
    }
  } else {
    console.warn(`[Orchestrate Video] ⚠️  WAVESPEED_API_KEY not set — skipping WaveSpeed.`);
  }

  // ─── Fallback: existing fal-video orchestrator (Higgsfield + Replicate + Fal) ─
  if (!sourceImageUrl) {
    throw new Error("Video fallback requires a source image URL (Higgsfield/Replicate/Fal are image-to-video only)");
  }
  const fallbackModel = tier === "budget" ? "wan-2.2" : "kling-2.1-pro";
  const videoBuffer = await generateVideoClip(
    sourceImageUrl, scene, duration,
    fallbackModel, aspectRatio,
    (inputs.productImageUrls?.length ?? 0) > 0,
    cameraSettings, adFormat, sceneBackdrop, characterSheet, realism
  );
  return {
    buffer: videoBuffer,
    sourceUrl: "",
    modelDescription: `FALLBACK · ${fallbackModel}`,
    estimatedCostUsd: 0,
  };
}
