import { NextRequest, NextResponse } from "next/server";
import { generateImageHiggsfield } from "@/lib/providers/higgsfield-image";
import { generateImageWithFallback } from "@/lib/providers/fallback";
import { buildImagePrompt, type RealismSettings } from "@/lib/prompts/prompt-engine";
import type { Scene, BrandKit } from "@/lib/types";
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
  characterRefUrl?: string; // Face reference for IP-Adapter consistency
}

// Convert structured scene inputs into a Scene object for the prompt engine
function sceneInputToScene(input: SceneInput, index: number): Scene {
  // Build a rich visualPrompt from the structured inputs
  const parts: string[] = [];
  if (input.characterAction) parts.push(input.characterAction);
  if (input.productPlacement) parts.push(input.productPlacement);
  if (!parts.length) parts.push("Product displayed prominently in frame");

  return {
    index,
    visualPrompt: parts.join(". "),
    cameraAngle: input.cameraAngle,
    motion: "static", // Image prompt - no motion
    lighting: input.lighting,
    duration: 5,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scenes,
      productName,
      productDescription,
      brandColors = [],
      sceneBackdrop,
      characterSheet,
      hasProductImage = false,
      realism,
      productAngleUrls,
    } = body as {
      scenes: SceneInput[];
      productName: string;
      productDescription: string;
      brandColors?: string[];
      sceneBackdrop?: string;
      characterSheet?: string;
      hasProductImage?: boolean;
      realism?: RealismSettings;
      productAngleUrls?: string[];
    };

    if (!scenes?.length) {
      return NextResponse.json({ error: "No scenes provided" }, { status: 400 });
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const brandKit: BrandKit = { colors: brandColors, fonts: [] };
    const useHiggsfield = !!(process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET);

    const images: { url: string; sourceUrl?: string }[] = [];

    for (let i = 0; i < scenes.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 2000));

      const sceneInput = scenes[i];
      const scene = sceneInputToScene(sceneInput, i);

      // Use scene-specific setting if provided, otherwise fall back to brief backdrop
      const effectiveBackdrop = sceneInput.setting || sceneBackdrop || "";

      // Build the ad format from mood
      const adFormat = moodToAdFormat(sceneInput.mood);

      // If multi-angle product images are provided, boost product preservation in prompt
      const effectiveHasProductImage = hasProductImage || (productAngleUrls && productAngleUrls.length > 0);

      let buffer: Buffer;
      let sourceUrl: string | undefined;

      if (useHiggsfield) {
        const result = await generateImageHiggsfield(
          scene, brandKit, 1024, 576,
          { focalLength: "85mm", aperture: "f/2.0", colorGrade: sceneInput.colorGrade },
          adFormat,
          effectiveHasProductImage,
          effectiveBackdrop,
          characterSheet,
          realism
        );
        buffer = result.buffer;
        sourceUrl = result.sourceUrl;
      } else {
        buffer = await generateImageWithFallback(
          scene, brandKit, 1024, 576,
          Date.now() + i,
          { focalLength: "85mm", aperture: "f/2.0", colorGrade: sceneInput.colorGrade },
          adFormat,
          effectiveHasProductImage,
          effectiveBackdrop,
          characterSheet,
          realism
        );
      }

      // Save to disk
      const outputPath = path.join(OUTPUT_DIR, `scene_${i}.png`);
      const finalBuffer = await sharp(buffer).resize(1024, 576, { fit: "cover" }).png().toBuffer();

      await fs.writeFile(outputPath, finalBuffer);

      images.push({
        url: `/output/scene_${i}.png`,
        sourceUrl,
      });
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Scene-to-image error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate scene images" },
      { status: 500 }
    );
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
