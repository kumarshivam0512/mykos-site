import { NextRequest, NextResponse } from "next/server";
import { generateVoiceover, pickVoice } from "@/lib/providers/edge-tts";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script, musicDirection } = body;

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 });
    }

    const voice = pickVoice(musicDirection || "professional");
    const outputPath = await generateVoiceover(script, voice, OUTPUT_DIR);

    // Return public URL path
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
