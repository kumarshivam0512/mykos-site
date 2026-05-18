import { NextRequest, NextResponse } from "next/server";
import { orchestrateImage } from "@/lib/providers/orchestrator";
import type { RealismSettings } from "@/lib/prompts/prompt-engine";
import type { Scene, BrandKit, QualityTier } from "@/lib/types";
import { checkRateLimit, checkCostCap, recordCost, apiError, ERROR_CODES } from "@/lib/rate-limit";
import { estimateCampaignCost } from "@/lib/providers/tier-selector";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

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

    const images: ({ url: string; sourceUrl?: string; modelDescription?: string; estimatedCostUsd?: number } | null)[] =
      scenes.map((_, i) => {
        const existing = existingImages?.[i];
        return existing ? { url: existing } : null;
      });
    const errors: { index: number; message: string }[] = [];
    let totalCostUsd = 0;

    for (let i = 0; i < scenes.length; i++) {
      // Skip indices that already succeeded in a prior run
      if (images[i]) continue;

      if (i > 0) await new Promise((r) => setTimeout(r, 1500));

      const sceneInput = scenes[i];
      const scene = sceneInputToScene(sceneInput, i);

      const effectiveBackdrop = sceneInput.setting || sceneBackdrop || "";
      const adFormat = moodToAdFormat(sceneInput.mood);
      const publicCharacterRefUrl = toPublicUrl(req, sceneInput.characterRefUrl);

      try {
        // Route through orchestrator (tier-selector picks the right model)
        const result = await orchestrateImage({
          scene,
          brandKit,
          tier,
          width: 1024,
          height: 576,
          cameraSettings: { focalLength: "85mm", aperture: "f/2.0", colorGrade: sceneInput.colorGrade },
          adFormat,
          sceneBackdrop: effectiveBackdrop,
          characterSheet,
          realism,
          inputs: {
            productImageUrls: publicProductUrls,
            logoUrl: publicLogoUrl,
            characterRefUrl: publicCharacterRefUrl,
          },
          hero,
        });

        totalCostUsd += result.estimatedCostUsd;

        // Save to disk
        const outputPath = path.join(OUTPUT_DIR, `scene_${i}.png`);
        const finalBuffer = await sharp(result.buffer).resize(1024, 576, { fit: "cover" }).png().toBuffer();
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
    }

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
