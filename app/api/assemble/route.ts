import { NextRequest, NextResponse } from "next/server";
import { assembleVideo } from "@/lib/providers/ffmpeg";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, videoClips, durations, voiceoverUrl, musicTrack } = body as {
      images?: string[];
      videoClips?: string[];
      durations: number[];
      voiceoverUrl?: string;
      musicTrack?: string;
    };

    if ((!images?.length && !videoClips?.length) || !durations?.length) {
      return NextResponse.json(
        { error: "Images or video clips, and durations are required" },
        { status: 400 }
      );
    }

    // Convert public URL paths to absolute file paths
    const absoluteImages = images?.map((img: string) =>
      path.join(process.cwd(), "public", img)
    );

    const absoluteClips = videoClips?.map((clip: string) =>
      path.join(process.cwd(), "public", clip)
    );

    const voiceoverPath = voiceoverUrl
      ? path.join(process.cwd(), "public", voiceoverUrl)
      : undefined;

    const musicPath = musicTrack
      ? path.join(process.cwd(), "public", "music", `${musicTrack}.mp3`)
      : undefined;

    const videoPath = await assembleVideo({
      images: absoluteImages,
      videoClips: absoluteClips,
      durations,
      voiceoverPath,
      musicPath,
      outputDir: OUTPUT_DIR,
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
