import { NextRequest, NextResponse } from "next/server";
import { assembleVideo } from "@/lib/providers/ffmpeg";
import type { QualityTier, AdFormat } from "@/lib/types";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, videoClips, durations, voiceoverUrl, voiceoverSegments, musicTrack, tier, adFormat, useNativeAudio } = body as {
      images?: string[];
      videoClips?: string[];
      durations: number[];
      voiceoverUrl?: string;
      voiceoverSegments?: { sceneIndex: number; url: string }[];
      musicTrack?: string;
      tier?: QualityTier;
      adFormat?: AdFormat;
      useNativeAudio?: boolean;
    };

    if ((!images?.length && !videoClips?.length) || !durations?.length) {
      return NextResponse.json(
        { error: "Images or video clips, and durations are required" },
        { status: 400 }
      );
    }

    // Cache-bust query strings (e.g. "?v=1779...") are great for the browser but
    // are NOT valid filesystem characters — FFmpeg treats the whole string as a
    // filename and fails with "Error opening input". Strip them before resolving.
    const toDiskPath = (publicUrl: string): string => {
      const cleaned = publicUrl.split("?")[0].split("#")[0];
      return path.join(process.cwd(), "public", cleaned);
    };

    // Convert public URL paths to absolute file paths
    const absoluteImages = images?.map(toDiskPath);

    const absoluteClips = videoClips?.map(toDiskPath);

    const voiceoverPath = voiceoverUrl ? toDiskPath(voiceoverUrl) : undefined;

    // Phase 2: per-scene voiceover segments — resolve each url to a disk path.
    const absoluteVoSegments = voiceoverSegments?.map((s) => ({
      sceneIndex: s.sceneIndex,
      path: toDiskPath(s.url),
    }));

    const musicPath = musicTrack
      ? path.join(process.cwd(), "public", "music", `${musicTrack}.mp3`)
      : undefined;

    const videoPath = await assembleVideo({
      images: absoluteImages,
      videoClips: absoluteClips,
      durations,
      voiceoverPath,
      voiceoverSegments: absoluteVoSegments,
      musicPath,
      outputDir: OUTPUT_DIR,
      tier,
      adFormat,
      useNativeAudio,
    });

    const relativePath = "/output/" + path.basename(videoPath);
    return NextResponse.json({ videoUrl: relativePath });
  } catch (error) {
    console.error("Assembly error:", error);
    return NextResponse.json(
      { error: "Failed to assemble video" },
      { status: 500 }
    );
  }
}
