import { NextRequest, NextResponse } from "next/server";
import { generateImageWithFallback } from "@/lib/providers/fallback";
import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenes, brandKit, aspectRatio = "16:9", textOverlays, cameraSettings, adFormat, hasProductImage } = body as {
      scenes: Scene[];
      brandKit: BrandKit;
      aspectRatio?: string;
      textOverlays?: { sceneIndex: number; text: string; position: "top" | "bottom" | "center" }[];
      cameraSettings?: CameraSettings;
      adFormat?: AdFormat;
      hasProductImage?: boolean;
    };

    if (!scenes?.length) {
      return NextResponse.json({ error: "No scenes provided" }, { status: 400 });
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const dimensions = getAspectDimensions(aspectRatio);
    const imagePaths: string[] = [];
    const variants: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      // Delay between requests to avoid rate limiting
      if (i > 0) await new Promise((r) => setTimeout(r, 2000));

      const scene = scenes[i];
      const buffer = await generateImageWithFallback(
        scene,
        brandKit,
        dimensions.width,
        dimensions.height,
        Date.now() + i,
        cameraSettings,
        adFormat,
        hasProductImage
      );

      // Process with Sharp: resize + logo composite
      let pipeline = sharp(buffer).resize(
        dimensions.width,
        dimensions.height,
        { fit: "cover" }
      );

      // Composite logo if provided
      if (brandKit.logoUrl) {
        try {
          // Logo URL is a relative path like /uploads/logo_xxx.png — read from filesystem
          const logoPath = path.join(process.cwd(), "public", brandKit.logoUrl);
          const logoBuffer = await fs.readFile(logoPath);
          const logoResized = await sharp(logoBuffer)
            .resize(120, 120, { fit: "inside" })
            .png()
            .toBuffer();

          pipeline = pipeline.composite([
            {
              input: logoResized,
              gravity: "southeast",
            },
          ]);
        } catch {
          console.warn("Failed to composite logo, skipping");
        }
      }

      // Composite text overlay if provided
      const overlay = textOverlays?.find((o) => o.sceneIndex === i);
      if (overlay?.text) {
        try {
          const yPos = overlay.position === "top" ? "15%" : overlay.position === "center" ? "45%" : "80%";
          const svgText = `<svg width="${dimensions.width}" height="${dimensions.height}">
            <style>
              .overlay { fill: white; font-size: 32px; font-family: Arial, sans-serif; font-weight: bold; }
              .shadow { fill: rgba(0,0,0,0.7); font-size: 32px; font-family: Arial, sans-serif; font-weight: bold; }
            </style>
            <text x="50%" y="${yPos}" text-anchor="middle" class="shadow" dy="2" dx="2">${escapeXml(overlay.text)}</text>
            <text x="50%" y="${yPos}" text-anchor="middle" class="overlay">${escapeXml(overlay.text)}</text>
          </svg>`;
          pipeline = pipeline.composite([{ input: Buffer.from(svgText), gravity: "center" }]);
        } catch {
          console.warn("Text overlay failed, skipping");
        }
      }

      const outputPath = path.join(OUTPUT_DIR, `scene_${i}.png`);
      await pipeline.png().toFile(outputPath);
      imagePaths.push(`/output/scene_${i}.png`);

      // Generate variants for hero scene (scene 0)
      if (i === 0) {
        for (let v = 1; v <= 2; v++) {
          try {
            await new Promise((r) => setTimeout(r, 2000));
            const variantBuffer = await generateImageWithFallback(
              scene,
              brandKit,
              dimensions.width,
              dimensions.height,
              Date.now() + 1000 + v
            );
            const variantPath = path.join(OUTPUT_DIR, `scene_0_variant_${v}.png`);
            await sharp(variantBuffer)
              .resize(dimensions.width, dimensions.height, { fit: "cover" })
              .png()
              .toFile(variantPath);
            variants.push(`/output/scene_0_variant_${v}.png`);
          } catch {
            console.warn(`Variant ${v} generation failed, skipping`);
          }
        }
      }
    }

    return NextResponse.json({ images: imagePaths, variants });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate images" },
      { status: 500 }
    );
  }
}

function getAspectDimensions(ratio: string) {
  const map: Record<string, { width: number; height: number }> = {
    "16:9": { width: 1024, height: 576 },
    "9:16": { width: 576, height: 1024 },
    "1:1": { width: 1024, height: 1024 },
    "4:5": { width: 819, height: 1024 },
  };
  return map[ratio] || map["16:9"];
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
