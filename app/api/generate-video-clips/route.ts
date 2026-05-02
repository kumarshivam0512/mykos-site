import { NextRequest, NextResponse } from "next/server";
import { generateVideoClip } from "@/lib/providers/fal-video";
import type { Scene } from "@/lib/types";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, scenes, testMode = false } = body as {
      images: string[];
      scenes: Scene[];
      testMode?: boolean;
    };

    if (!images?.length || !scenes?.length) {
      return NextResponse.json({ error: "Images and scenes required" }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 503 });
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // In test mode, only generate scene 0
    const count = testMode ? 1 : Math.min(images.length, scenes.length);
    const clipPaths: string[] = [];
    const clipDuration = 5; // Fixed 5s clips for best quality

    for (let i = 0; i < count; i++) {
      // Convert relative URL to absolute for Fal.ai upload
      const imagePath = path.join(process.cwd(), "public", images[i]);
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString("base64");
      const ext = images[i].endsWith(".png") ? "png" : "jpeg";
      const dataUrl = `data:image/${ext};base64,${base64}`;

      const videoBuffer = await generateVideoClip(dataUrl, scenes[i], clipDuration);

      const clipPath = path.join(OUTPUT_DIR, `ai_clip_${i}.mp4`);
      await fs.writeFile(clipPath, videoBuffer);
      clipPaths.push(`/output/ai_clip_${i}.mp4`);

      // Delay between submissions
      if (i < count - 1) await new Promise((r) => setTimeout(r, 2000));
    }

    const estimatedCost = count * clipDuration * 0.07;

    return NextResponse.json({
      clips: clipPaths,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      testMode,
    });
  } catch (error) {
    console.error("Video clip generation error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate video clips" },
      { status: 500 }
    );
  }
}
