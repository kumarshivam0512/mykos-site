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
 * Which subject is the hero of the frame. Drives:
 *   1. Reference image ordering (Nano Banana models weight earlier refs more)
 *   2. Prompt guidance language (the model is told which subject to centre)
 *
 * Default is "auto" — inferred from adFormat (product_showcase → product,
 * everything else → character).
 */
export type HeroSubject = "product" | "character" | "auto";

/** Resolve "auto" to a concrete hero based on the ad format. */
function resolveHero(hero: HeroSubject, adFormat?: AdFormat): "product" | "character" {
  if (hero !== "auto") return hero;
  // Product-led formats: the product IS the hero, character is secondary.
  if (adFormat === "product_showcase" || adFormat === "minimalist_editorial") return "product";
  // Everything else (cinematic, sports, testimonial, explainer) leads with character.
  return "character";
}

/**
 * Collect all reference image URLs into a single ordered array.
 * Order matters — Nano Banana / Seedream models weight the FIRST reference
 * most heavily. So we put the hero subject's reference first.
 *
 * - hero=character: [character, product1-3, logo, extras] (the classic flow)
 * - hero=product:   [product1-3, character, logo, extras] (luxury, hero product)
 *
 * Nano Banana caps at ~6 references total.
 */
export function collectReferenceUrls(refs: MultiRefInputs, hero: "product" | "character" = "character"): string[] {
  const urls: string[] = [];
  if (hero === "product") {
    if (refs.productImageUrls?.length) urls.push(...refs.productImageUrls.slice(0, 3));
    if (refs.characterRefUrl) urls.push(refs.characterRefUrl);
  } else {
    if (refs.characterRefUrl) urls.push(refs.characterRefUrl);
    if (refs.productImageUrls?.length) urls.push(...refs.productImageUrls.slice(0, 3));
  }
  if (refs.logoUrl) urls.push(refs.logoUrl);
  if (refs.extraRefUrls?.length) urls.push(...refs.extraRefUrls.slice(0, 2));
  return urls.slice(0, 6);
}

/**
 * Build a prompt that instructs the AI how to use the references AND which
 * subject is the hero of the frame. The hero gets dominant framing, the
 * other subjects appear in supporting roles.
 */
function buildMultiRefPrompt(
  basePrompt: string,
  refs: MultiRefInputs,
  refUrls: string[],
  hero: "product" | "character"
): string {
  if (refUrls.length === 0) return basePrompt;

  const guidance: string[] = [];
  let refIndex = 0;

  // Build the per-reference guidance in the same order as refUrls.
  if (hero === "product") {
    if (refs.productImageUrls?.length) {
      const count = refs.productImageUrls.slice(0, 3).length;
      guidance.push(`Reference image${count > 1 ? "s" : ""} ${refIndex + 1}${count > 1 ? `-${refIndex + count}` : ""} show the PRODUCT — this is the HERO of the frame. Render it large, centred, and fully visible. Preserve shape, color, branding, and proportions exactly`);
      refIndex += count;
    }
    if (refs.characterRefUrl) {
      // STRONG identity directive even when character is secondary subject —
      // text characterSheet from Gemini can invent a different person.
      guidance.push(`Reference image ${refIndex + 1} IS THE IDENTITY OF THIS CHARACTER — render the exact same person from this photo (same face, skin tone, hair, build, age, gender). They are SECONDARY in this frame so show them interacting with or beside the product, but do not crop or obscure the product. Never invent or replace this person`);
      refIndex++;
    }
  } else {
    if (refs.characterRefUrl) {
      // STRONG identity directive — without this, models will sometimes ignore
      // the photo and invent a face based on the text description, producing
      // a random person (often the wrong gender). Verified bug 20 May 2026:
      // user uploaded Himanshu (male), got a random woman in scenes 1/3/4.
      guidance.push(`Reference image ${refIndex + 1} IS THE IDENTITY OF THIS CHARACTER — render the exact same person from this photo: same face, skin tone, hair, build, age, gender. Do not invent or replace this person. Treat this reference as the single source of truth for the character`);
      refIndex++;
    }
    if (refs.productImageUrls?.length) {
      const count = refs.productImageUrls.slice(0, 3).length;
      guidance.push(`Reference image${count > 1 ? "s" : ""} ${refIndex + 1}${count > 1 ? `-${refIndex + count}` : ""} show the actual product — render it exactly as shown, preserving shape, color, branding, and proportions`);
      refIndex += count;
    }
  }
  if (refs.logoUrl) {
    guidance.push(`Reference image ${refIndex + 1} is the brand logo — place it naturally in the scene (corner or on packaging) without distortion`);
    refIndex++;
  }

  // Add a hero-emphasis prefix so the model centres the right subject.
  const heroPrefix = hero === "product"
    ? "Composition: the PRODUCT is the visual hero of this frame — it should be the largest, most prominent, and clearly readable subject. The character (if any) is in a supporting role."
    : "Composition: the CHARACTER is the focus of this frame, with the product visible but not dominating.";

  return `${basePrompt}\n\n${heroPrefix}\n\nReference guidance: ${guidance.join("; ")}.`;
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
  realism?: RealismSettings,
  /** Which subject is the hero of the frame. Defaults to "auto" (inferred from adFormat). */
  hero: HeroSubject = "auto",
  /** Aspect ratio — drives composition cues in the prompt. */
  aspectRatioHint?: "16:9" | "9:16" | "1:1" | "4:5"
): Promise<WaveSpeedResult> {
  const resolvedHero = resolveHero(hero, adFormat);
  const refUrls = collectReferenceUrls(refs, resolvedHero);
  if (refUrls.length === 0) {
    throw new Error("generateImageWithRefs requires at least one reference image URL");
  }

  const basePrompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, true, sceneBackdrop, characterSheet, realism, aspectRatioHint);
  const promptWithRefs = buildMultiRefPrompt(basePrompt, refs, refUrls, resolvedHero);
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
