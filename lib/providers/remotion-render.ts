// ─── Remotion server-side renderer (Sprint A item 6c) ───────────
//
// Library wrapper around `@remotion/bundler` + `@remotion/renderer` so
// `/api/finalize-video` can call Remotion directly (no HTTP self-call) and
// `/api/render-brand-asset` is just a thin REST wrapper around this.
//
// The bundler step is the slow one (~5-10s first run). We memoize it for the
// lifetime of the Node process. Cache key = entryPath.

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { bundle } from "@remotion/bundler";
import type { BrandKit, AspectRatio } from "@/lib/types";
import {
  getPrimaryColor,
  getSecondaryColor,
  getDisplayFont,
  getBodyFont,
  ASPECT_RATIO_VIDEO_DIMENSIONS,
} from "@/lib/types";

const OUTPUT_DIR = path.join(process.cwd(), "public", "output");
const REMOTION_ENTRY = path.join(process.cwd(), "remotion", "index.ts");

let bundlePromise: Promise<string> | null = null;
function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({ entryPoint: REMOTION_ENTRY });
  }
  return bundlePromise;
}

export type BrandAssetKind = "opener" | "endCard" | "sceneOverlay";

export interface RenderBrandAssetParams {
  kind: BrandAssetKind;
  aspectRatio?: AspectRatio;
  durationSec?: number;
  brandKit: BrandKit;
  /** Absolute URL (or http://) of the brand logo. Caller must resolve. */
  logoUrl?: string;
  // Opener
  openerStyle?: "minimal" | "scale" | "particle";
  productName?: string;
  tagline?: string;
  background?: "transparent" | "solid";
  // End card
  ctaText?: string;
  endCardBackground?: "solid" | "dark" | "light";
  // Scene overlay
  text?: string;
  position?: "top" | "center" | "lower-third" | "bottom";
  showLowerThirdBar?: boolean;
}

export interface RenderBrandAssetResult {
  /** Absolute disk path to the rendered file. */
  filePath: string;
  /** Public URL beneath /public for browser playback. */
  publicUrl: string;
  /** True when the file was returned from disk cache without re-rendering. */
  cached: boolean;
  /** Final duration in seconds. */
  durationSec: number;
  /** True when the file has an alpha channel (sceneOverlay only). */
  hasAlpha: boolean;
}

/**
 * Render a single branded composition to disk. Idempotent — repeated calls
 * with the same params hit the on-disk cache.
 */
export async function renderBrandAsset(
  params: RenderBrandAssetParams
): Promise<RenderBrandAssetResult> {
  const {
    kind,
    aspectRatio = "16:9",
    durationSec = kind === "endCard" ? 2 : kind === "opener" ? 1.5 : 5,
    brandKit,
    logoUrl,
    openerStyle = "minimal",
    productName = "",
    tagline = "",
    background = "transparent",
    ctaText = "",
    endCardBackground = "dark",
    text = "",
    position = "lower-third",
    showLowerThirdBar = false,
  } = params;

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const dims = ASPECT_RATIO_VIDEO_DIMENSIONS[aspectRatio] ?? ASPECT_RATIO_VIDEO_DIMENSIONS["16:9"];
  const fps = 30;
  const durationInFrames = Math.max(1, Math.round(durationSec * fps));

  const compositionId = kind === "opener" ? "BrandOpener"
    : kind === "endCard" ? "EndCard"
    : "SceneOverlay";

  const primary = getPrimaryColor(brandKit);
  const secondary = getSecondaryColor(brandKit);
  const displayFont = getDisplayFont(brandKit);
  const bodyFont = getBodyFont(brandKit);

  const inputProps: Record<string, unknown> = (() => {
    switch (kind) {
      case "opener":
        return {
          brandName: productName,
          tagline,
          logoUrl,
          primaryColor: primary,
          displayFont,
          style: openerStyle,
          background,
        };
      case "endCard":
        return {
          brandName: productName,
          tagline,
          ctaText,
          logoUrl,
          primaryColor: primary,
          secondaryColor: secondary,
          displayFont,
          bodyFont,
          background: endCardBackground,
        };
      case "sceneOverlay":
      default:
        return {
          text,
          position,
          showLowerThirdBar,
          logoUrl,
          primaryColor: primary,
          bodyFont,
        };
    }
  })();

  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify({ compositionId, dims, fps, durationInFrames, inputProps }))
    .digest("hex")
    .slice(0, 12);

  const isOverlay = kind === "sceneOverlay";
  const ext = isOverlay ? "webm" : "mp4";
  const outName = `remotion_${kind}_${hash}.${ext}`;
  const outPath = path.join(OUTPUT_DIR, outName);

  try {
    await fs.access(outPath);
    return {
      filePath: outPath,
      publicUrl: `/output/${outName}`,
      cached: true,
      durationSec,
      hasAlpha: isOverlay,
    };
  } catch { /* not cached, proceed */ }

  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  await renderMedia({
    composition: {
      ...composition,
      width: dims.width,
      height: dims.height,
      fps,
      durationInFrames,
    },
    serveUrl,
    codec: isOverlay ? "vp8" : "h264",
    outputLocation: outPath,
    inputProps,
    pixelFormat: isOverlay ? "yuva420p" : "yuv420p",
    imageFormat: "jpeg",
  });

  return {
    filePath: outPath,
    publicUrl: `/output/${outName}`,
    cached: false,
    durationSec,
    hasAlpha: isOverlay,
  };
}

/** Resolve a possibly-relative logo URL to an absolute URL Remotion can fetch. */
export function resolveLogoUrl(maybeRelative: string | undefined, origin: string): string | undefined {
  if (!maybeRelative) return undefined;
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  const clean = maybeRelative.startsWith("/") ? maybeRelative : `/${maybeRelative}`;
  return `${origin}${clean}`;
}
