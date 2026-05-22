import { NextRequest, NextResponse } from "next/server";
import { orchestrateImage } from "@/lib/providers/orchestrator";
import type { RealismSettings } from "@/lib/prompts/prompt-engine";
import type { Scene, BrandKit, QualityTier, AspectRatio } from "@/lib/types";
import { ASPECT_RATIO_DIMENSIONS } from "@/lib/types";
import { checkRateLimit, checkCostCap, recordCost, apiError, ERROR_CODES } from "@/lib/rate-limit";
import { estimateCampaignCost } from "@/lib/providers/tier-selector";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// Give the route ample headroom — WaveSpeed can take 60-90s per scene and
// we run scenes in parallel (concurrency 3), so worst case ~3min for 6 scenes.
export const maxDuration = 300;

// How many scenes to render in parallel. WaveSpeed handles this fine and it
// converts a sequential N×60s walk into a max(60s, 60s, 60s) parallel burst.
// Lower if you see provider rate-limit errors; raise if WaveSpeed is happy.
const SCENE_CONCURRENCY = 3;

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

interface SceneInput {
  id: string;
  mood: string;
  setting: string;
  characterAction: string;
  productPlacement: string;
  cameraAngle: string;
  lighting: string;
  colorGrade: string;
  characterRefUrl?: string; // Face reference photo (Character Library)
}

// Convert structured scene inputs into a Scene object for the prompt engine
function sceneInputToScene(input: SceneInput, index: number): Scene {
  const parts: string[] = [];
  if (input.characterAction) parts.push(input.characterAction);
  if (input.productPlacement) parts.push(input.productPlacement);
  if (!parts.length) parts.push("Product displayed prominently in frame");

  return {
    index,
    visualPrompt: parts.join(". "),
    cameraAngle: input.cameraAngle,
    motion: "static",
    lighting: input.lighting,
    duration: 5,
  };
}

/**
 * Convert a relative path (e.g. /uploads/foo.png) to an absolute public URL.
 * WaveSpeed needs publicly fetchable URLs for reference images.
 */
function toPublicUrl(req: NextRequest, relativeUrl: string | undefined | null): string | undefined {
  if (!relativeUrl) return undefined;
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) return relativeUrl;
  // Derive origin from request
  const origin = req.nextUrl.origin;
  return `${origin}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
}

export async function POST(req: NextRequest) {
  // Rate limit check (per client IP)
  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const body = await req.json();
    const {
      scenes,
      brandColors = [],
      logoUrl,
      sceneBackdrop,
      characterSheet,
      realism,
      productAngleUrls,
      tier = "premium",
      existingImages,
      hero = "auto",
      aspectRatio = "16:9",
    } = body as {
      scenes: SceneInput[];
      productName?: string;
      productDescription?: string;
      brandColors?: string[];
      logoUrl?: string;
      sceneBackdrop?: string;
      characterSheet?: string;
      hasProductImage?: boolean;
      realism?: RealismSettings;
      productAngleUrls?: string[];
      tier?: QualityTier;
      /** Existing image URLs from a previous (possibly partial) run. Indices with a non-empty entry are skipped. */
      existingImages?: (string | null | undefined)[];
      /** Which subject is the hero of the frame. */
      hero?: "product" | "character" | "auto";
      /** Aspect ratio for image generation — drives dimensions and prompt nudge. */
      aspectRatio?: AspectRatio;
    };

    if (!scenes?.length) {
      return apiError("No scenes provided", ERROR_CODES.MISSING_INPUT, 400);
    }

    // Cost cap check — estimate upfront before spending (only count NEW scenes)
    const hasRefs = !!(logoUrl || productAngleUrls?.length || scenes.some((s) => s.characterRefUrl));
    const costEst = estimateCampaignCost(tier);
    const perScene = hasRefs ? costEst.perImageWithRefs : costEst.perImage;
    const remainingScenes = scenes.filter((_, i) => !existingImages?.[i]).length;
    const estimatedCost = perScene * remainingScenes;
    const capCheck = checkCostCap(req, estimatedCost);
    if (capCheck) return capCheck;

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const brandKit: BrandKit = { colors: brandColors, fonts: [], logoUrl };

    // Resolve relative upload paths to absolute public URLs (WaveSpeed needs them)
    const publicLogoUrl = toPublicUrl(req, logoUrl);
    const publicProductUrls = productAngleUrls?.map((u) => toPublicUrl(req, u)).filter((u): u is string => !!u);

    // Aspect-aware dimensions — single source of truth from lib/types.
    const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio] ?? ASPECT_RATIO_DIMENSIONS["16:9"];

    const images: ({ url: string; sourceUrl?: string; modelDescription?: string; estimatedCostUsd?: number } | null)[] =
      scenes.map((_, i) => {
        const existing = existingImages?.[i];
        return existing ? { url: existing } : null;
      });
    const errors: { index: number; message: string }[] = [];
    let totalCostUsd = 0;

    // ── Parallelization (20 May 2026) ────────────────────────────────
    // Previously we ran scenes one-at-a-time with a 1.5s gap between each,
    // turning 3 × 60s WaveSpeed calls into a 180s+ wall-clock wait that
    // routinely tripped the 360s client timeout. Now we run up to
    // SCENE_CONCURRENCY scenes in parallel using a simple promise-pool.
    // Indices that already have an image (resume case) are skipped.
    const pendingIndices: number[] = [];
    for (let i = 0; i < scenes.length; i++) if (!images[i]) pendingIndices.push(i);

    const renderOne = async (i: number): Promise<void> => {
      const sceneInput = scenes[i];
      const scene = sceneInputToScene(sceneInput, i);

      const effectiveBackdrop = sceneInput.setting || sceneBackdrop || "";
      const adFormat = moodToAdFormat(sceneInput.mood);
      const publicCharacterRefUrl = toPublicUrl(req, sceneInput.characterRefUrl);

      // ── Bug 2 fix (20 May 2026) ──────────────────────────────────────
      // When the user attaches a real character photo, the generic Gemini-
      // generated `characterSheet` text (e.g. "athletic woman, mid-30s")
      // FIGHTS the photo at render time. The model gets two sources of
      // identity and sometimes picks the text — producing a random person
      // of the wrong gender. We replace the text with a short identity-
      // anchor instruction; the photo carries the actual identity.
      const effectiveCharacterSheet = publicCharacterRefUrl
        ? "Render the exact person shown in the attached character reference photo. Match their face, skin tone, hair, build, age, and gender. Do not invent or generalize."
        : characterSheet;

      try {
        const result = await orchestrateImage({
          scene,
          brandKit,
          tier,
          width: dims.width,
          height: dims.height,
          cameraSettings: { focalLength: "85mm", aperture: "f/2.0", colorGrade: sceneInput.colorGrade },
          adFormat,
          sceneBackdrop: effectiveBackdrop,
          characterSheet: effectiveCharacterSheet,
          realism,
          inputs: {
            productImageUrls: publicProductUrls,
            logoUrl: publicLogoUrl,
            characterRefUrl: publicCharacterRefUrl,
          },
          hero,
          aspectRatio,
        });

        totalCostUsd += result.estimatedCostUsd;

        const outputPath = path.join(OUTPUT_DIR, `scene_${i}.png`);
        const finalBuffer = await sharp(result.buffer).resize(dims.width, dims.height, { fit: "cover" }).png().toBuffer();
        await fs.writeFile(outputPath, finalBuffer);

        // Cache-bust the URL so the browser doesn't show a stale image when
        // the same filename is overwritten on a subsequent generation.
        const cacheBust = Date.now();
        images[i] = {
          url: `/output/scene_${i}.png?v=${cacheBust}`,
          sourceUrl: result.sourceUrl || undefined,
          modelDescription: result.modelDescription,
          estimatedCostUsd: result.estimatedCostUsd,
        };
      } catch (err) {
        const message = (err as Error).message || "scene generation failed";
        console.error(`[scene-to-image] scene ${i} failed:`, message);
        errors.push({ index: i, message });
        // continue — let other scenes succeed so the user can resume just the failures
      }
    };

    // Simple bounded-concurrency pool: keep SCENE_CONCURRENCY workers
    // pulling from the shared queue until all pending indices are done.
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < pendingIndices.length) {
        const myIdx = cursor++;
        const sceneIdx = pendingIndices[myIdx];
        await renderOne(sceneIdx);
      }
    };
    const workerCount = Math.min(SCENE_CONCURRENCY, pendingIndices.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    // Record actual cost for cost-cap accounting
    recordCost(req, totalCostUsd);

    const partial = errors.length > 0;
    return NextResponse.json({ images, errors, partial, totalCostUsd, tier });
  } catch (error) {
    console.error("Scene-to-image error:", error);
    const msg = (error as Error).message || "Failed to generate scene images";
    // Differentiate upstream provider errors from other failures
    const isUpstream = msg.toLowerCase().includes("provider") || msg.toLowerCase().includes("wavespeed") || msg.toLowerCase().includes("higgsfield");
    return apiError(msg, isUpstream ? ERROR_CODES.UPSTREAM_ERROR : ERROR_CODES.GENERATION_FAILED, 500);
  }
}

function moodToAdFormat(mood: string): "cinematic_lifestyle" | "product_showcase" | "energetic_sports" | "testimonial_ugc" | "minimalist_editorial" | "animated_explainer" {
  const map: Record<string, string> = {
    "Aspirational": "cinematic_lifestyle",
    "Energetic": "energetic_sports",
    "Calm": "minimalist_editorial",
    "Luxurious": "product_showcase",
    "Playful": "testimonial_ugc",
    "Gritty": "energetic_sports",
    "Professional": "product_showcase",
    "Warm": "cinematic_lifestyle",
    "Dramatic": "cinematic_lifestyle",
    "Minimal": "minimalist_editorial",
  };
  return (map[mood] || "cinematic_lifestyle") as ReturnType<typeof moodToAdFormat>;
}
