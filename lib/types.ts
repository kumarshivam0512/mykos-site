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
export interface CreativeBrief {
  productCategory: string;
  targetAudience: TargetAudience;
  personas: Persona[];
  platformBriefs: PlatformBrief[];
  competitorAnalysis?: CompetitorAnalysis;
  adFormat: AdFormat;
  characterDescription?: string; // consistent character across all scenes
  duration: number;
  scenes: Scene[];
  voiceoverScript: string;
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

// ─── Generated Assets ───────────────────────────────────────
export interface GeneratedAssets {
  images: string[];
  variants: string[];
  sourceUrls?: string[]; // Original provider URLs (for i2v, avoids re-upload)
  videoClips?: string[];
  voiceoverUrl?: string;
  musicTrack?: string;
  videoUrl?: string;
}

// ─── Full Ad State ──────────────────────────────────────────
export interface AdState {
  productInput: ProductInput;
  brandKit: BrandKit;
  brief: CreativeBrief | null;
  assets: GeneratedAssets;
  pipeline: PipelineStatus;
}
