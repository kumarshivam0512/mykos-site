// ─── /api/render-brand-asset (Sprint A item 6b) ──────────────────
//
// Thin REST wrapper around `lib/providers/remotion-render.renderBrandAsset`.
// Kept as a separate endpoint for two reasons:
//   1. Allows the Post Studio UI (Sprint A item 7) to re-render individual
//      branded chrome assets without re-rendering the whole video.
//   2. Decouples the orchestrator (`/api/finalize-video`) from the renderer
//      so Remotion Lambda can be swapped in later without touching upstream.

import { NextRequest, NextResponse } from "next/server";
import { renderBrandAsset, resolveLogoUrl, type BrandAssetKind } from "@/lib/providers/remotion-render";
import type { BrandKit, AspectRatio } from "@/lib/types";
import { checkRateLimit, apiError, ERROR_CODES } from "@/lib/rate-limit";

interface RenderBody {
  kind: BrandAssetKind;
  aspectRatio?: AspectRatio;
  durationSec?: number;
  brandKit: BrandKit;
  openerStyle?: "minimal" | "scale" | "particle";
  productName?: string;
  tagline?: string;
  background?: "transparent" | "solid";
  ctaText?: string;
  endCardBackground?: "solid" | "dark" | "light";
  text?: string;
  position?: "top" | "center" | "lower-third" | "bottom";
  showLowerThirdBar?: boolean;
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const body = (await req.json()) as RenderBody;
    if (!body.kind || !["opener", "endCard", "sceneOverlay"].includes(body.kind)) {
      return apiError("`kind` must be opener | endCard | sceneOverlay", ERROR_CODES.MISSING_INPUT, 400);
    }
    if (!body.brandKit) {
      return apiError("`brandKit` is required", ERROR_CODES.MISSING_INPUT, 400);
    }

    const origin = req.nextUrl.origin || "http://localhost:3000";
    const result = await renderBrandAsset({
      ...body,
      logoUrl: resolveLogoUrl(body.brandKit.logoUrl, origin),
    });

    return NextResponse.json({
      url: `${result.publicUrl}?v=${Date.now()}`,
      cached: result.cached,
      durationSec: result.durationSec,
      aspectRatio: body.aspectRatio ?? "16:9",
      hasAlpha: result.hasAlpha,
    });
  } catch (err) {
    const message = (err as Error).message || "Failed to render brand asset";
    console.error("[render-brand-asset] error:", message);
    return apiError(message, ERROR_CODES.GENERATION_FAILED, 500);
  }
}
