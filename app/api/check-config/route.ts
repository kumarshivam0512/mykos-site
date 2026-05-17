import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasFalKey: !!process.env.FAL_KEY,
    hasReplicateKey: !!process.env.REPLICATE_API_TOKEN,
    hasHiggsfieldKey: !!(process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET),
    hasWaveSpeedKey: !!process.env.WAVESPEED_API_KEY,
  });
}
