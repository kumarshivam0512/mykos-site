// ── Mykos AI v2 — Core TypeScript Types ──

// ─── Product Input ──────────────────────────────────────────
export interface ProductInput {
  name: string;
  description: string;
  imageUrl?: string;
  productUrl?: string;
}

// ─── Brand Kit ──────────────────────────────────────────────
export interface BrandKit {
  logoUrl?: string;
  colors: string[]; // hex codes
  fonts: string[];
  guidelines?: string;
}

// ─── Target Audience ────────────────────────────────────────
export interface TargetAudience {
  ageRange: string;
  gender: string;
  platforms: string[];
  psychographics: string[];
}

// ─── Buyer Persona ──────────────────────────────────────────
export interface Persona {
  name: string;
  age: number;
  income: string;
  location: string;
  painPoints: string[];
  motivations: string[];
  contentPreferences: string[];
  purchaseTriggers: string[];
  adAngle: string; // specific hook/angle for this persona
}

// ─── Platform-Specific Brief ────────────────────────────────
export interface PlatformBrief {
  platform: string; // "Instagram Reels", "YouTube Pre-roll", "LinkedIn"
  format: string;
  duration: number;
  hook: string; // first 3 seconds hook
  tone: string;
  ctaText: string;
}

// ─── Competitor Analysis ────────────────────────────────────
export interface CompetitorAnalysis {
  competitorName: string;
  theirPositioning: string;
  theirAudience: string;
  differentiators: string[];
  attackAngles: string[];
}

// ─── Ad Format ──────────────────────────────────────────────
export type AdFormat =
  | "cinematic_lifestyle"
  | "animated_explainer"
  | "product_showcase"
  | "testimonial_ugc"
  | "minimalist_editorial"
  | "energetic_sports";

// ─── Scene ──────────────────────────────────────────────────
export interface Scene {
  index: number;
  visualPrompt: string;
  cameraAngle: string;
  motion: string;
  lighting: string;
  duration: number; // seconds
}

// ─── Camera Settings ────────────────────────────────────────
export interface CameraSettings {
  focalLength: string;
  aperture: string;
  colorGrade: string;
}

// ─── Creative Brief (full AI output) ────────────────────────
/**
 * Voiceover broken into per-scene segments so each segment's pacing can be
 * calibrated to the scene's actual duration (~140 WPM ≈ 2.4 words/second).
 * Optional for back-compat — the legacy single-blob `voiceoverScript` is
 * always present.
 */
export interface VoiceoverSegment {
  sceneIndex: number;
  text: string;
  /** Target word count = round(sceneDuration × 2.4). */
  targetWords: number;
}

export interface CreativeBrief {
  productCategory: string;
  targetAudience: TargetAudience;
  personas: Persona[];
  platformBriefs: PlatformBrief[];
  competitorAnalysis?: CompetitorAnalysis;
  adFormat: AdFormat;
  sceneBackdrop: string;   // detailed environment/setting description (shared across all scenes)
  characterSheet: string;  // detailed character appearance (shared across all scenes)
  duration: number;
  scenes: Scene[];
  voiceoverScript: string;
  voiceoverSegments?: VoiceoverSegment[];
  musicDirection: string;
  cameraSettings: CameraSettings;
  endCard: {
    tagline: string;
    ctaText: string;
  };
}

// ─── Pipeline Status ────────────────────────────────────────
export type PipelineStep =
  | "idle"
  | "generating_brief"
  | "generating_images"
  | "animating_scenes"
  | "generating_voiceover"
  | "assembling_video"
  | "complete"
  | "error";

export type VideoMode = "slideshow" | "ai_video";

export interface PipelineStatus {
  step: PipelineStep;
  progress: number; // 0-100
  message: string;
  error?: string;
}

// ─── Quality Tier (user-selected per generation) ─────────────
export type QualityTier = "budget" | "premium" | "ultra";

// ─── Aspect ratio (user-selected per campaign) ───────────────
// Drives image gen dimensions, video gen `aspect_ratio`, FFmpeg encode target,
// caption positioning, and prompt nudges (composition language differs).
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

/** Map aspect ratio to image generation dimensions (width × height in px). */
export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1024, height: 576 },   // YouTube pre-roll, landscape banner
  "9:16": { width: 576, height: 1024 },   // Reels, TikTok, Stories, Shorts
  "1:1":  { width: 1024, height: 1024 },  // Instagram feed, LinkedIn square
  "4:5":  { width: 819, height: 1024 },   // Instagram feed (tall), Facebook
};

/** Map aspect ratio to FFmpeg encode target (always >= 720p on smaller side). */
export const ASPECT_RATIO_VIDEO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720,  height: 1280 },
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 864,  height: 1080 },
};

/** UI labels with platform hints. */
export const ASPECT_RATIO_LABELS: Record<AspectRatio, { label: string; sub: string }> = {
  "16:9": { label: "16:9", sub: "YouTube · landscape" },
  "9:16": { label: "9:16", sub: "Reels · TikTok · Shorts" },
  "1:1":  { label: "1:1",  sub: "Feed · square" },
  "4:5":  { label: "4:5",  sub: "Feed · tall" },
};

/** Tailwind aspect-ratio class per AspectRatio — for previewing scene images
 *  and clips with the correct frame shape in the UI. */
export const ASPECT_RATIO_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",      // 16/9 — Tailwind built-in
  "9:16": "aspect-[9/16]",
  "1:1":  "aspect-square",     // 1/1 — Tailwind built-in
  "4:5":  "aspect-[4/5]",
};

/** Type-guard / normalizer — clamps unknown strings to a valid AspectRatio. */
export function toAspectRatio(value: string | undefined | null): AspectRatio {
  if (value === "9:16" || value === "1:1" || value === "4:5") return value;
  return "16:9";
}

// ─── Generated Assets ───────────────────────────────────────
export interface GeneratedAssets {
  images: string[];
  variants: string[];
  sourceUrls?: string[]; // Original provider URLs (for i2v, avoids re-upload)
  videoClips?: string[];
  voiceoverUrl?: string;
  /** Per-scene voiceover segments — index-aligned with scene index. */
  voiceoverSegments?: { sceneIndex: number; url: string }[];
  musicTrack?: string;
  videoUrl?: string;
  // Persisted from Scene Builder so Video Studio can access them
  realism?: Record<string, boolean>;
  productAngleUrls?: string[];
  /** Per-scene character reference photo URLs, index aligned with images[]. */
  characterRefUrls?: (string | undefined)[];
  /** User's chosen quality tier — drives model selection across the pipeline. */
  tier?: QualityTier;
}

// ─── Full Ad State ──────────────────────────────────────────
export interface AdState {
  productInput: ProductInput;
  brandKit: BrandKit;
  brief: CreativeBrief | null;
  assets: GeneratedAssets;
  pipeline: PipelineStatus;
}
