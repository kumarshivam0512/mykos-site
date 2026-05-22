// ─── WaveSpeed Video Provider ────────────────────────────────────
// Image-to-video, text-to-video, and reference-to-video across tiers.
//
// Budget:  Wan 2.2 I2V 720p Ultra Fast       ($0.01/s, 100s of video per $1)
// Premium: Kling 3.0 Std Image-to-Video      ($0.084/s, native audio, fluid motion)
// Ultra:   Seedance 2.0 Image-to-Video       (~$0.15/s, broadcast quality)
//
// Reference-to-video (Premium+ when refs are provided):
//   Premium: Seedance 2.0 Fast Reference (via Bytedance — accepts up to 9 ref images)
//   Ultra:   Seedance 2.0 Reference            (highest fidelity)

import type { Scene, CameraSettings, AdFormat } from "@/lib/types";
import { buildVideoPrompt, type RealismSettings } from "@/lib/prompts/prompt-engine";
import { optimizePromptForModel, type TargetModel } from "@/lib/prompts/model-tuning";
import { runWaveSpeedTask, ASPECT_RATIO_ALLOW, type WaveSpeedResult } from "./wavespeed-base";

/**
 * Coerce a requested aspect ratio to the closest value the model accepts.
 * Falls back to 16:9 if not in the allow-list and 16:9 is allowed.
 */
function coerceAspectRatio(requested: string, modelId: string): string {
  const allowed = ASPECT_RATIO_ALLOW[modelId];
  if (!allowed || allowed.includes(requested)) return requested;
  // Try common fallbacks in order of preference
  for (const fallback of ["16:9", "9:16", "1:1", "4:3", "3:4"]) {
    if (allowed.includes(fallback)) return fallback;
  }
  return allowed[0];
}

export type WaveSpeedVideoTier = "budget" | "premium" | "ultra";

/** Image-to-video models (one source frame, animate it). */
// NOTE: All WaveSpeed model IDs use slash separators (verified live).
const I2V_TIER_MODELS: Record<WaveSpeedVideoTier, string> = {
  budget: "wavespeed-ai/wan-2.2/i2v-720p",
  premium: "kwaivgi/kling-v2.5-turbo-pro/image-to-video",
  ultra: "bytedance/seedance-2.0/image-to-video",
};

/** Text-to-video models (no source image). */
const T2V_TIER_MODELS: Record<WaveSpeedVideoTier, string> = {
  budget: "wavespeed-ai/wan-2.2/t2v-720p",
  premium: "kwaivgi/kling-v2.5-turbo-pro/text-to-video",
  ultra: "bytedance/seedance-2.0/text-to-video",
};

/**
 * Reference-to-video: animate while preserving multiple reference subjects.
 * These models accept arrays of reference images for character/product consistency.
 */
const REF_TO_VIDEO_MODELS: Record<WaveSpeedVideoTier, string> = {
  // Budget tier falls back to standard i2v (no ref-to-video at budget price).
  budget: "wavespeed-ai/wan-2.2/i2v-720p",
  // Premium: Seedance v1 Lite ref-to-video — accepts up to 9 refs.
  premium: "bytedance/seedance-v1-lite/reference-to-video",
  // Ultra: Wan 2.7 reference-to-video (Alibaba).
  ultra: "alibaba/wan-2.7/reference-to-video",
};

/** Map tier → TargetModel for prompt tuning. */
const VIDEO_TIER_TARGET: Record<WaveSpeedVideoTier, TargetModel> = {
  budget: "wan-2.2",
  premium: "kling-3.0",
  ultra: "seedance-2.0",
};

const REF_TIER_TARGET: Record<WaveSpeedVideoTier, TargetModel> = {
  budget: "wan-2.2",
  premium: "seedance-2.0-ref",
  ultra: "seedance-2.0-ref",
};

/**
 * Per-model duration limits, in seconds. Different WaveSpeed video models accept
 * different ranges — sending a value outside this range either fails or is
 * silently clamped (the latter is worse because the user thinks they got a 12s
 * clip when they actually got 10s). We clamp explicitly and warn.
 */
const MODEL_DURATION_LIMITS: Record<string, { min: number; max: number }> = {
  // Wan 2.2 supports 1–12 seconds.
  "wavespeed-ai/wan-2.2/i2v-720p": { min: 1, max: 12 },
  "wavespeed-ai/wan-2.2/t2v-720p": { min: 1, max: 12 },
  // Kling v2.5 Turbo Pro supports only 5 or 10 seconds (not arbitrary values).
  "kwaivgi/kling-v2.5-turbo-pro/image-to-video": { min: 5, max: 10 },
  "kwaivgi/kling-v2.5-turbo-pro/text-to-video": { min: 5, max: 10 },
  // Seedance 2.0 supports 5–12 seconds.
  "bytedance/seedance-2.0/image-to-video": { min: 5, max: 12 },
  "bytedance/seedance-2.0/text-to-video": { min: 5, max: 12 },
  // Seedance v1 Lite reference-to-video supports 5–10 seconds.
  "bytedance/seedance-v1-lite/reference-to-video": { min: 5, max: 10 },
  // Wan 2.7 reference-to-video supports 5–10 seconds.
  "alibaba/wan-2.7/reference-to-video": { min: 5, max: 10 },
};

/**
 * Which model IDs natively generate audio (speech + ambient + foley) along
 * with the video. When true we send the dialog block in the prompt and
 * remove the "no chatter" negatives. When false the model is silent and we
 * rely on TTS in post.
 *
 * Source: WaveSpeed model docs + live testing (20 May 2026).
 *   - Kling 2.5 Turbo Pro: yes, lip-sync + ambient
 *   - Seedance 2.0:        yes, lip-sync + ambient + foley
 *   - Wan 2.2 / 2.7:       no
 *   - Seedance v1 Lite:    no (older release, silent)
 */
const NATIVE_AUDIO_MODELS = new Set<string>([
  "kwaivgi/kling-v2.5-turbo-pro/image-to-video",
  "kwaivgi/kling-v2.5-turbo-pro/text-to-video",
  "bytedance/seedance-2.0/image-to-video",
  "bytedance/seedance-2.0/text-to-video",
]);

/** True when this WaveSpeed model can generate native audio for the clip. */
export function modelSupportsNativeAudio(modelId: string): boolean {
  return NATIVE_AUDIO_MODELS.has(modelId);
}

/**
 * Clamp the requested duration to the model's supported range and log when we
 * have to. Kling/Seedance Lite snap to 5 or 10 — if user picks 8s, we round to
 * the nearest valid bucket rather than silently passing a value the model
 * rejects.
 */
function clampDurationForModel(modelId: string, requested: number): number {
  const limits = MODEL_DURATION_LIMITS[modelId];
  if (!limits) return Math.min(Math.max(requested, 1), 12); // unknown model — keep wide range

  // Kling v2.5 only accepts 5 or 10 — snap to nearest.
  if (modelId.startsWith("kwaivgi/kling-v2.5")) {
    const snapped = requested >= 7.5 ? 10 : 5;
    if (snapped !== requested) {
      console.warn(`[WaveSpeed] ${modelId} accepts only 5s or 10s — snapping ${requested}s → ${snapped}s`);
    }
    return snapped;
  }

  const clamped = Math.min(Math.max(requested, limits.min), limits.max);
  if (clamped !== requested) {
    console.warn(`[WaveSpeed] ${modelId} duration range is ${limits.min}-${limits.max}s — clamping ${requested}s → ${clamped}s`);
  }
  return clamped;
}

export interface WaveSpeedVideoOpts {
  /** 1-12 seconds (further clamped per model — see MODEL_DURATION_LIMITS). */
  duration?: number;
  /** "16:9" | "9:16" | "1:1" | "4:3" | "3:4" */
  aspectRatio?: string;
  /** "480p" | "720p" | "1080p" — when supported by the model. */
  resolution?: "480p" | "720p" | "1080p";
}

/**
 * Image-to-video generation.
 * Single source frame is animated based on the scene's motion prompt.
 */
export async function generateVideoI2V(
  imageUrl: string,
  scene: Scene,
  tier: WaveSpeedVideoTier,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings,
  opts: WaveSpeedVideoOpts = {}
): Promise<WaveSpeedResult> {
  const modelId = I2V_TIER_MODELS[tier];
  const nativeAudio = modelSupportsNativeAudio(modelId);
  const basePrompt = buildVideoPrompt(scene, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism, nativeAudio);
  const prompt = optimizePromptForModel(basePrompt, VIDEO_TIER_TARGET[tier], realism);

  const body: Record<string, unknown> = {
    prompt,
    image: imageUrl, // most i2v models accept "image"
    duration: clampDurationForModel(modelId, opts.duration ?? scene.duration ?? 5),
    aspect_ratio: coerceAspectRatio(opts.aspectRatio ?? "16:9", modelId),
  };
  if (opts.resolution) body.resolution = opts.resolution;

  return runWaveSpeedTask(modelId, body, { label: `video-i2v-${tier}` });
}

/**
 * Text-to-video generation (no source image).
 */
export async function generateVideoT2V(
  scene: Scene,
  tier: WaveSpeedVideoTier,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings,
  opts: WaveSpeedVideoOpts = {}
): Promise<WaveSpeedResult> {
  const modelId = T2V_TIER_MODELS[tier];
  const nativeAudio = modelSupportsNativeAudio(modelId);
  const basePrompt = buildVideoPrompt(scene, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism, nativeAudio);
  const prompt = optimizePromptForModel(basePrompt, VIDEO_TIER_TARGET[tier], realism);

  const body: Record<string, unknown> = {
    prompt,
    duration: clampDurationForModel(modelId, opts.duration ?? scene.duration ?? 5),
    aspect_ratio: coerceAspectRatio(opts.aspectRatio ?? "16:9", modelId),
  };
  if (opts.resolution) body.resolution = opts.resolution;

  return runWaveSpeedTask(modelId, body, { label: `video-t2v-${tier}` });
}

/**
 * Reference-to-video generation.
 * Animates a scene while preserving multiple reference subjects (character, product, logo).
 * This is the key model for character + product consistency in videos.
 *
 * @param refImageUrls  Up to 9 reference image URLs (character first, then product, then logo)
 */
export async function generateVideoRefToVideo(
  scene: Scene,
  tier: WaveSpeedVideoTier,
  refImageUrls: string[],
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings,
  opts: WaveSpeedVideoOpts = {}
): Promise<WaveSpeedResult> {
  if (refImageUrls.length === 0) {
    throw new Error("generateVideoRefToVideo requires at least one reference image URL");
  }

  const modelId = REF_TO_VIDEO_MODELS[tier];
  const nativeAudio = modelSupportsNativeAudio(modelId);
  const basePrompt = buildVideoPrompt(scene, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism, nativeAudio);
  const prompt = optimizePromptForModel(basePrompt, REF_TIER_TARGET[tier], realism);
  const refs = refImageUrls.slice(0, 9); // cap at 9

  // WaveSpeed ref-to-video models expect the field "reference_images" (not "images"
  // which belongs to image-edit models). Verified live against the API error:
  //   "r2v model requires at least 1 videos or reference_images"
  const body: Record<string, unknown> = {
    prompt,
    reference_images: refs,
    duration: clampDurationForModel(modelId, opts.duration ?? scene.duration ?? 5),
    aspect_ratio: coerceAspectRatio(opts.aspectRatio ?? "16:9", modelId),
  };
  if (opts.resolution) body.resolution = opts.resolution;

  return runWaveSpeedTask(modelId, body, { label: `video-ref-${tier}` });
}
