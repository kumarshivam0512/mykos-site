import { NextRequest, NextResponse } from "next/server";
import { generateVideoClip, type VideoModel } from "@/lib/providers/fal-video";
import type { Scene, CameraSettings, AdFormat } from "@/lib/types";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      images,
      scenes,
      testMode = false,
      model = "auto",
      aspectRatio = "16:9",
      hasProductImage = false,
      duration = 5,
      cameraSettings,
      adFormat,
      characterDescription,
      sourceUrls,
      sceneBackdrop,
      characterSheet,
    } = body as {
      images: string[];
      scenes: Scene[];
      testMode?: boolean;
      model?: VideoModel;
      aspectRatio?: string;
      hasProductImage?: boolean;
      duration?: number;
      cameraSettings?: CameraSettings;
      adFormat?: AdFormat;
      characterDescription?: string;
      sourceUrls?: string[];
      sceneBackdrop?: string;
      characterSheet?: string;
    };

    if (!images?.length || !scenes?.length) {
      return NextResponse.json({ error: "Images and scenes required" }, { status: 400 });
    }

    // Check at least one video provider is configured
    const hasProvider = !!(
      (process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET) ||
      process.env.REPLICATE_API_TOKEN ||
      process.env.FAL_KEY
    );
    if (!hasProvider) {
      return NextResponse.json({ error: "No video provider configured" }, { status: 503 });
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const count = testMode ? 1 : Math.min(images.length, scenes.length);
    const clipPaths: string[] = [];
    const clipDuration = Math.min(duration, 10);

    for (let i = 0; i < count; i++) {
      console.log(`[VideoClips] Generating scene ${i + 1}/${count} with model=${model}`);

      // Use public source URL if available (from Higgsfield), otherwise base64
      let imageUrl: string;
      if (sourceUrls?.[i]) {
        imageUrl = sourceUrls[i];
        console.log(`[VideoClips] Using source URL: ${imageUrl.substring(0, 80)}...`);
      } else {
        const imagePath = path.join(process.cwd(), "public", images[i]);
        const imageBuffer = await fs.readFile(imagePath);
        const base64 = imageBuffer.toString("base64");
        const ext = images[i].endsWith(".png") ? "png" : "jpeg";
        imageUrl = `data:image/${ext};base64,${base64}`;
        console.log(`[VideoClips] Using base64 data URL (${Math.round(imageUrl.length/1024)}KB)`);
      }

      const videoBuffer = await generateVideoClip(
        imageUrl,
        scenes[i],
        clipDuration,
        model,
        aspectRatio,
        hasProductImage,
        cameraSettings,
        adFormat,
        sceneBackdrop,
        characterSheet
      );

      const clipPath = path.join(OUTPUT_DIR, `ai_clip_${i}.mp4`);
      await fs.writeFile(clipPath, videoBuffer);
      clipPaths.push(`/output/ai_clip_${i}.mp4`);

      // Delay between submissions to avoid rate limits
      if (i < count - 1) await new Promise((r) => setTimeout(r, 2000));
    }

    return NextResponse.json({
      clips: clipPaths,
      model,
      testMode,
      scenesGenerated: count,
    });
  } catch (error) {
    console.error("Video clip generation error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate video clips" },
      { status: 500 }
    );
  }
}
