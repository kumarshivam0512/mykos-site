import { NextRequest, NextResponse } from "next/server";
import { generateVoiceover, pickVoice } from "@/lib/providers/edge-tts";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

interface IncomingSegment {
  sceneIndex: number;
  text: string;
  targetWords?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script, musicDirection, segments } = body as {
      script?: string;
      musicDirection?: string;
      segments?: IncomingSegment[];
    };

    if (!script && !(segments && segments.length > 0)) {
      return NextResponse.json({ error: "Script or segments are required" }, { status: 400 });
    }

    const voice = pickVoice(musicDirection || "professional");

    // ── New: per-scene segment mode (Phase 2) ───────────────────
    // We generate one TTS WAV per scene segment so FFmpeg can mix each one
    // at the correct video offset (no more "speak it all and truncate").
    // Gemini TTS free tier is 3 requests/minute — we pace segments by 21
    // seconds (under 3/min) to avoid bursting through the quota. The TTS
    // provider also retries with backoff on 429 as a safety net.
    if (segments && segments.length > 0) {
      const segmentResults: { sceneIndex: number; url: string }[] = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const filename = `voiceover_scene_${seg.sceneIndex}.wav`;
        const outPath = await generateVoiceover(seg.text, voice, OUTPUT_DIR, filename);
        segmentResults.push({
          sceneIndex: seg.sceneIndex,
          url: `/output/${path.basename(outPath)}?v=${Date.now()}`,
        });
        // Pace between segments to stay under 3 req/min Gemini TTS free tier.
        if (i < segments.length - 1) {
          await new Promise((r) => setTimeout(r, 21_000));
        }
      }

      // Per-scene mode does NOT need a separate "full" concatenated WAV —
      // FFmpeg assembly mixes each segment at its scene offset and ignores
      // voiceoverUrl when segments are present. Returning the first segment
      // as voiceoverUrl gives legacy callers something to preview.
      const voiceoverUrl = segmentResults[0]?.url;

      return NextResponse.json({ voiceoverUrl, segments: segmentResults });
    }

    // ── Legacy: single-blob mode ───────────────────────────────
    const outputPath = await generateVoiceover(script!, voice, OUTPUT_DIR);
    const relativePath = "/output/" + path.basename(outputPath);
    return NextResponse.json({ voiceoverUrl: relativePath });
  } catch (error) {
    console.error("Voiceover error:", error);
    return NextResponse.json(
      { error: "Failed to generate voiceover" },
      { status: 500 }
    );
  }
}
