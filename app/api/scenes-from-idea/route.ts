// ─── Scenes-From-Idea API ────────────────────────────────────────
// POST /api/scenes-from-idea
//
// Body:
//   {
//     idea: string,                  // free-text user prompt
//     brandName: string,
//     productDescription?: string,
//     adType?: AdType,               // optional pin
//     tierOverride?: QualityTier,    // optional UI override
//     persistToLibraries?: boolean,  // default true — save char + loc for reuse
//   }
//
// Returns a fully-filled payload the Scene Builder can drop into state,
// plus the persisted character/location ids when persistToLibraries=true.

import { NextRequest, NextResponse } from "next/server";
import { generateScenesFromIdea } from "@/lib/templates/idea-to-scenes";
import { saveCharacter, type Character } from "@/lib/db/characters";
import { saveLocation, type Location } from "@/lib/db/locations";
import type { AdType } from "@/lib/templates/golden-templates";
import type { QualityTier } from "@/lib/types";
import { checkRateLimit, apiError, ERROR_CODES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const body = await req.json();
    const {
      idea,
      brandName,
      productDescription,
      adType,
      tierOverride,
      persistToLibraries = true,
    } = body as {
      idea: string;
      brandName: string;
      productDescription?: string;
      adType?: AdType;
      tierOverride?: QualityTier;
      persistToLibraries?: boolean;
    };

    if (!idea?.trim()) return apiError("idea is required", ERROR_CODES.MISSING_INPUT, 400);
    if (!brandName?.trim()) return apiError("brandName is required", ERROR_CODES.MISSING_INPUT, 400);

    const filled = await generateScenesFromIdea({
      idea,
      brandName,
      productDescription,
      adType,
      tierOverride,
    });

    // Persist generated character + location so they appear in the @ mention
    // dropdowns and can be re-used across campaigns. Best-effort — if Cosmos
    // isn't configured we still return the filled payload.
    let savedCharacter: Character | null = null;
    let savedLocation: Location | null = null;
    if (persistToLibraries) {
      try {
        savedLocation = await saveLocation(filled.location);
      } catch (err) {
        console.warn("[scenes-from-idea] saveLocation failed:", (err as Error).message);
      }
      if (filled.character) {
        try {
          savedCharacter = await saveCharacter(filled.character);
        } catch (err) {
          console.warn("[scenes-from-idea] saveCharacter failed:", (err as Error).message);
        }
      }
    }

    return NextResponse.json({
      ...filled,
      savedCharacterId: savedCharacter?.id ?? null,
      savedLocationId: savedLocation?.id ?? null,
    });
  } catch (err) {
    const message = (err as Error).message || "Failed to generate scenes from idea";
    console.error("[scenes-from-idea] error:", message);
    return apiError(message, ERROR_CODES.GENERATION_FAILED, 500);
  }
}
