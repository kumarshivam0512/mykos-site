import { NextRequest, NextResponse } from "next/server";
import { assembleVideo } from "@/lib/providers/ffmpeg";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

const PLATFORM_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  "youtube": { width: 1280, height: 720, label: "YouTube (16:9)" },
  "reels": { width: 720, height: 1280, label: "Instagram Reels (9:16)" },
  "square": { width: 1080, height: 1080, label: "Feed Square (1:1)" },
  "tiktok": { width: 720, height: 1280, label: "TikTok (9:16)" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, durations, voiceoverUrl, platforms = ["youtube", "reels", "square"] } = body as {
      images: string[];
      durations: number[];
      voiceoverUrl?: string;
      platforms?: string[];
    };

    if (!images?.length || !durations?.length) {
      return NextResponse.json({ error: "Images and durations required" }, { status: 400 });
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const absoluteImages = images.map((img: string) =>
      path.join(process.cwd(), "public", img)
    );
    const voiceoverPath = voiceoverUrl
      ? path.join(process.cwd(), "public", voiceoverUrl)
      : undefined;

    const results: Record<string, string> = {};

    for (const platformKey of platforms) {
      const preset = PLATFORM_PRESETS[platformKey];
      if (!preset) continue;

      const platformDir = path.join(OUTPUT_DIR, platformKey);
      await fs.mkdir(platformDir, { recursive: true });

      const videoPath = await assembleVideo({
        images: absoluteImages,
        durations,
        voiceoverPath,
        outputDir: platformDir,
        width: preset.width,
        height: preset.height,
      });

      const relativePath = `/output/${platformKey}/${path.basename(videoPath)}`;
      results[platformKey] = relativePath;
    }

    return NextResponse.json({ videos: results });
  } catch (error) {
    console.error("Multi-platform export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
