// ─── Motion Descriptions API ─────────────────────────────────────
// POST /api/motion-descriptions — auto-fill per-scene motion prompts.

import { NextRequest, NextResponse } from "next/server";
import { generateMotionDescriptions, type MotionFillScene } from "@/lib/templates/motion-fill";
import { checkRateLimit, apiError, ERROR_CODES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const body = await req.json();
    const { scenes, brandName, productDescription, sceneBackdrop, characterSheet } = body as {
      scenes: MotionFillScene[];
      brandName?: string;
      productDescription?: string;
      sceneBackdrop?: string;
      characterSheet?: string;
    };

    if (!scenes?.length) return apiError("scenes is required", ERROR_CODES.MISSING_INPUT, 400);

    const motions = await generateMotionDescriptions({
      scenes,
      brandName,
      productDescription,
      sceneBackdrop,
      characterSheet,
    });

    return NextResponse.json({ motions });
  } catch (err) {
    const message = (err as Error).message || "Failed to generate motion descriptions";
    console.error("[motion-descriptions] error:", message);
    return apiError(message, ERROR_CODES.GENERATION_FAILED, 500);
  }
}
