// ─── Finalize Video — single endpoint that:
//   1. Probes the real duration of each video clip via ffprobe
//   2. Generates voiceover segments calibrated to those exact durations
//      (instead of the planned durations, which Wavespeed often misses by 0.1-0.5s)
//   3. Assembles the final MP4 with frame-perfect VO sync
//
// Replaces the previous two-step flow (generate-voiceover → assemble) where
// VO was always slightly off because it was timed to planned durations.

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { assembleVideo, type VoiceoverSegmentInput } from "@/lib/providers/ffmpeg";
import { generateVoiceover, pickVoice, type VoiceTone } from "@/lib/providers/edge-tts";
import type { QualityTier, AdFormat, VoiceoverSegment, AspectRatio, BrandKit } from "@/lib/types";
import { ASPECT_RATIO_VIDEO_DIMENSIONS } from "@/lib/types";
import {
  getTrackById,
  pickTrackForTemplate,
  getAmbientById,
  pickAmbientForTemplate,
} from "@/lib/templates/music-library";
import { renderBrandAsset, resolveLogoUrl } from "@/lib/providers/remotion-render";
import { checkRateLimit, apiError, ERROR_CODES } from "@/lib/rate-limit";

const execFileAsync = promisify(execFile);
const OUTPUT_DIR = path.join(process.cwd(), "public", "output");

function getFfprobePath(): string {
  try {
    return (require("@ffprobe-installer/ffprobe") as { path: string }).path;
  } catch {
    return "ffprobe";
  }
}

/** Strip cache-bust query strings before resolving to a disk path. */
function toDiskPath(publicUrl: string): string {
  const cleaned = publicUrl.split("?")[0].split("#")[0];
  return path.join(process.cwd(), "public", cleaned);
}

/** Probe the real duration of a clip on disk. */
async function probeClipDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(getFfprobePath(), [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const d = parseFloat(stdout.trim());
    return Number.isFinite(d) && d > 0 ? d : 0;
  } catch {
    return 0;
  }
}

interface FinalizeBody {
  videoClips: string[];
  /** Optional planned durations — falls back to 5s per clip if absent. */
  plannedDurations?: number[];
  /** Voiceover segments — segment text is reused but timed to ACTUAL durations. */
  voiceoverSegments?: VoiceoverSegment[];
  /** Fallback: a single voiceover script if segments aren't available. */
  voiceoverScript?: string;
  /**
   * Music selection (Sprint A item 2). Either:
   *   - a track id from `lib/templates/music-library.ts` (e.g. "cinematic-piano-60bpm")
   *   - `"auto"` to auto-pick from the registry based on `adFormat`
   *   - `"silence"` / undefined to skip music
   * Legacy: a bare filename stem (e.g. "cinematic") still works — resolved as
   * `public/music/<value>.mp3` for back-compat with older clients.
   */
  musicTrack?: string;
  musicDirection?: string;
  /**
   * Ambient bed selection (Sprint A item 3). Either:
   *   - an id from AMBIENT_BEDS (e.g. "cafe", "kitchen")
   *   - `"auto"` to auto-pick (cafe for testimonial_ugc, none otherwise)
   *   - `"none"` / undefined to skip
   */
  ambientBed?: string;
  /** Ambient bed volume, 0–0.2 typical. Default 0.08. */
  ambientVolume?: number;
  tier?: QualityTier;
  adFormat?: AdFormat;
  useNativeAudio?: boolean;
  /** Output aspect ratio — drives FFmpeg canvas dimensions and caption layout. */
  aspectRatio?: AspectRatio;
  /** Burn captions into the final MP4. If false, only a .srt sidecar is written. */
  burnedCaptions?: boolean;
  /** Caption style preset. */
  captionStyle?: "modern" | "tiktok" | "cinematic";
  /**
   * Override caption font. Caller (Video Studio) passes `brandKit.bodyFont`
   * so captions inherit the brand's typography instead of hardcoded Helvetica.
   * Falls back to the style's default font when undefined.
   */
  captionFont?: string;
  /**
   * Voice tone (Sprint A item 4). Drives TTS delivery instruction:
   * polished | casual | gritty | ugc-authentic. Default: polished.
   */
  voiceTone?: VoiceTone;
  /**
   * Add handheld jitter post-pass (Sprint A item 5). Auto-enabled when
   * adFormat is testimonial_ugc or voiceTone is ugc-authentic. Pass `false`
   * to force-disable; `true` to force-enable regardless of format.
   */
  handheldJitter?: boolean;
  /**
   * Branded chrome (Sprint A item 6c). When `useBrandedChrome` is true:
   *   • Opener (default 1.5s) rendered with brandKit + productName + tagline
   *   • End card (default 2s) rendered with brandKit + ctaText
   *   • Per-scene overlays rendered if `sceneOverlays` array provided
   * `brandKit` is required when `useBrandedChrome` is true.
   */
  useBrandedChrome?: boolean;
  brandKit?: BrandKit;
  productName?: string;
  tagline?: string;
  ctaText?: string;
  openerStyle?: "minimal" | "scale" | "particle";
  openerDurationSec?: number;
  endCardDurationSec?: number;
  endCardBackground?: "solid" | "dark" | "light";
  sceneOverlays?: {
    sceneIndex: number;
    text: string;
    position?: "top" | "center" | "lower-third" | "bottom";
    showLowerThirdBar?: boolean;
  }[];
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const body = (await req.json()) as FinalizeBody;
    const {
      videoClips,
      plannedDurations,
      voiceoverSegments,
      voiceoverScript,
      musicTrack,
      musicDirection,
      ambientBed,
      ambientVolume,
      tier,
      adFormat,
      useNativeAudio,
      aspectRatio = "16:9",
      burnedCaptions,
      captionStyle = "modern",
      captionFont,
      voiceTone = "polished",
      handheldJitter,
      useBrandedChrome = false,
      brandKit,
      productName = "",
      tagline = "",
      ctaText = "",
      openerStyle = "minimal",
      openerDurationSec = 1.5,
      endCardDurationSec = 2,
      endCardBackground = "dark",
      sceneOverlays,
    } = body;

    if (!videoClips?.length) {
      return apiError("videoClips is required", ERROR_CODES.MISSING_INPUT, 400);
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // ── Step 1: Probe REAL durations of each clip ────────────────────────
    const clipDiskPaths = videoClips.map(toDiskPath);
    const actualDurations: number[] = [];
    for (let i = 0; i < clipDiskPaths.length; i++) {
      const real = await probeClipDuration(clipDiskPaths[i]);
      const planned = plannedDurations?.[i] ?? 5;
      const effective = real > 0 ? real : planned;
      if (real > 0 && Math.abs(real - planned) > 0.15) {
        console.log(`[finalize] clip ${i}: planned ${planned}s, actual ${real.toFixed(2)}s — pacing VO to actual`);
      }
      actualDurations.push(effective);
    }

    // ── Step 2: Generate voiceover segments paced to ACTUAL durations ─────
    // If the brief carries segment text, re-pace it to the new durations by
    // calibrating targetWords. Each segment's text is reused verbatim (the
    // user has already approved the script); only the timing changes.
    const voice = pickVoice(musicDirection || "professional");
    let voSegmentPaths: VoiceoverSegmentInput[] | undefined;
    let mainVoUrl: string | undefined;

    if (voiceoverSegments?.length) {
      // Segment mode — generate one TTS per scene, paced to clip duration.
      // CRITICAL: only generate VO for scenes that actually have a clip. If
      // the brief carries 4 segments but only 3 clips were rendered, the 4th
      // segment must be dropped — otherwise FFmpeg falls back to a 0ms delay
      // and the audio stacks on top of scene 0, producing duplicate VO.
      voSegmentPaths = [];
      const validSegments = voiceoverSegments.filter(
        (s) => s.sceneIndex >= 0 && s.sceneIndex < actualDurations.length
      );
      const dropped = voiceoverSegments.length - validSegments.length;
      if (dropped > 0) {
        console.warn(`[finalize] dropping ${dropped} voiceover segment(s) — scene index out of range (only ${actualDurations.length} clips exist)`);
      }
      for (let i = 0; i < validSegments.length; i++) {
        const seg = validSegments[i];
        const sceneIdx = seg.sceneIndex;
        const duration = actualDurations[sceneIdx];
        // Trim text if it exceeds what fits in the clip at ~2.4 wps.
        const maxWords = Math.floor(duration * 2.4);
        const trimmed = trimToWords(seg.text, maxWords);
        const filename = `vo_scene_${sceneIdx}.wav`;
        const outPath = await generateVoiceover(trimmed, voice, OUTPUT_DIR, filename, voiceTone);
        voSegmentPaths.push({ sceneIndex: sceneIdx, path: outPath });
        // 21s pacing under Gemini TTS 3/min free tier limit
        if (i < validSegments.length - 1) {
          await new Promise((r) => setTimeout(r, 21_000));
        }
      }
      // Expose the first one as a preview URL.
      const firstName = path.basename(voSegmentPaths[0].path);
      mainVoUrl = `/output/${firstName}?v=${Date.now()}`;
    } else if (voiceoverScript) {
      // Legacy single-blob mode — generate one VO file, no per-scene timing.
      const totalSeconds = actualDurations.reduce((s, d) => s + d, 0);
      const maxWords = Math.floor(totalSeconds * 2.4);
      const trimmed = trimToWords(voiceoverScript, maxWords);
      const outPath = await generateVoiceover(trimmed, voice, OUTPUT_DIR, "voiceover.wav", voiceTone);
      mainVoUrl = `/output/${path.basename(outPath)}?v=${Date.now()}`;
    }
    // If neither is provided, we assemble without VO (music + ambient only).

    // ── Step 3: Assemble with the calibrated voiceover ─────────────────────
    // Music selection: resolve via registry first, fall back to legacy bare
    // filename for back-compat. Silent-OK if file is missing on disk.
    const resolvedTrack = (() => {
      if (!musicTrack || musicTrack === "silence" || musicTrack === "none") return undefined;
      if (musicTrack === "auto") return pickTrackForTemplate(adFormat);
      return getTrackById(musicTrack);
    })();
    let musicPath: string | undefined;
    if (resolvedTrack) {
      const p = path.join(process.cwd(), "public", "music", `${resolvedTrack.id}.mp3`);
      try { await fs.access(p); musicPath = p; }
      catch { console.warn(`[finalize] music track ${resolvedTrack.id} not on disk — assembling without music. Run \`npm run music:download\` to fetch.`); }
    } else if (musicTrack && musicTrack !== "silence" && musicTrack !== "none" && musicTrack !== "auto") {
      // Legacy bare filename path (e.g. "professional")
      const p = path.join(process.cwd(), "public", "music", `${musicTrack}.mp3`);
      try { await fs.access(p); musicPath = p; } catch { /* skip silently */ }
    }

    // Ambient bed (Sprint A item 3) — auto-pick for testimonial_ugc, explicit otherwise.
    const resolvedAmbient = (() => {
      if (!ambientBed || ambientBed === "none") return undefined;
      if (ambientBed === "auto") return pickAmbientForTemplate(adFormat);
      return getAmbientById(ambientBed);
    })();
    let ambientPath: string | undefined;
    if (resolvedAmbient) {
      const p = path.join(process.cwd(), "public", "music", "ambient", resolvedAmbient.file);
      try { await fs.access(p); ambientPath = p; }
      catch { console.warn(`[finalize] ambient bed ${resolvedAmbient.id} not on disk — skipping. Run \`npm run music:download\`.`); }
    }

    const voiceoverPath = mainVoUrl && !voSegmentPaths ? toDiskPath(mainVoUrl) : undefined;

    // Aspect-aware FFmpeg canvas — 1280x720 for 16:9, 720x1280 for 9:16, etc.
    const dims = ASPECT_RATIO_VIDEO_DIMENSIONS[aspectRatio] ?? ASPECT_RATIO_VIDEO_DIMENSIONS["16:9"];

    // ── Step 3a: Render branded chrome (Sprint A item 6c) ──────────────
    // Opener, end card, and per-scene overlays via Remotion. All optional.
    // If any single render fails (e.g. compositor not downloaded), we log
    // and continue without that piece — never block the whole assembly.
    let openerPath: string | undefined;
    let openerDur = 0;
    let endCardPath: string | undefined;
    let endCardDur = 0;
    let overlayPaths: (string | undefined)[] | undefined;

    if (useBrandedChrome && brandKit) {
      const origin = req.nextUrl.origin || "http://localhost:3000";
      const absoluteLogo = resolveLogoUrl(brandKit.logoUrl, origin);

      try {
        const opener = await renderBrandAsset({
          kind: "opener",
          aspectRatio,
          durationSec: openerDurationSec,
          brandKit,
          logoUrl: absoluteLogo,
          openerStyle,
          productName,
          tagline,
          background: "solid", // solid background — clean cut into scene 1
        });
        openerPath = opener.filePath;
        openerDur = opener.durationSec;
      } catch (err) {
        console.warn(`[finalize] opener render failed, continuing without: ${(err as Error).message}`);
      }

      try {
        const endCard = await renderBrandAsset({
          kind: "endCard",
          aspectRatio,
          durationSec: endCardDurationSec,
          brandKit,
          logoUrl: absoluteLogo,
          productName,
          tagline,
          ctaText,
          endCardBackground,
        });
        endCardPath = endCard.filePath;
        endCardDur = endCard.durationSec;
      } catch (err) {
        console.warn(`[finalize] endCard render failed, continuing without: ${(err as Error).message}`);
      }

      if (sceneOverlays?.length) {
        overlayPaths = new Array(actualDurations.length).fill(undefined);
        for (const ov of sceneOverlays) {
          if (ov.sceneIndex < 0 || ov.sceneIndex >= actualDurations.length) continue;
          if (!ov.text?.trim()) continue;
          try {
            const overlay = await renderBrandAsset({
              kind: "sceneOverlay",
              aspectRatio,
              durationSec: actualDurations[ov.sceneIndex],
              brandKit,
              logoUrl: absoluteLogo,
              text: ov.text,
              position: ov.position ?? "lower-third",
              showLowerThirdBar: ov.showLowerThirdBar ?? false,
            });
            overlayPaths[ov.sceneIndex] = overlay.filePath;
          } catch (err) {
            console.warn(`[finalize] overlay render for scene ${ov.sceneIndex} failed: ${(err as Error).message}`);
          }
        }
      }
    }

    const videoPath = await assembleVideo({
      videoClips: clipDiskPaths,
      durations: actualDurations, // use the probed durations
      voiceoverPath,
      voiceoverSegments: voSegmentPaths,
      musicPath,
      ambientPath,
      ambientVolume,
      outputDir: OUTPUT_DIR,
      width: dims.width,
      height: dims.height,
      tier,
      adFormat,
      useNativeAudio,
      // Auto-enable handheld jitter for UGC ad format or UGC voice tone.
      // Explicit flag wins when caller passes it.
      addHandheldJitter: typeof handheldJitter === "boolean"
        ? handheldJitter
        : (adFormat === "testimonial_ugc" || voiceTone === "ugc-authentic"),
      // Branded chrome paths (any may be undefined — assembleVideo handles it).
      openerPath,
      openerDurationSec: openerDur,
      endCardPath,
      endCardDurationSec: endCardDur,
      overlayPaths,
    });

    // ── Step 4: Captions (Sprint 2) ──────────────────────────────
    // Generate SRT from voiceoverSegments + actualDurations. Always written
    // when segments are available. Optionally burned into the video.
    let srtUrl: string | undefined;
    let captionedVideoUrl: string | undefined;

    if (voiceoverSegments?.length) {
      const srtContent = buildSrtFromSegments(voiceoverSegments, actualDurations, openerDur);
      const srtPath = path.join(OUTPUT_DIR, "final_ad.srt");
      await fs.writeFile(srtPath, srtContent, "utf-8");
      srtUrl = `/output/final_ad.srt?v=${Date.now()}`;

      // Burn captions into the MP4 if requested. Default ON for vertical,
      // OFF for landscape (YouTube has its own caption UI).
      const shouldBurn = burnedCaptions ?? (aspectRatio !== "16:9");
      if (shouldBurn) {
        const captionedPath = path.join(OUTPUT_DIR, "final_ad_captioned.mp4");
        const styleArgs = captionStyleArgs(captionStyle, aspectRatio, captionFont);
        try {
          const { execFile } = await import("child_process");
          const { promisify } = await import("util");
          const exec = promisify(execFile);
          const ffmpeg = await import("ffmpeg-static").then((m) => (m.default ?? m) as unknown as string);
          // CRITICAL Windows fix: FFmpeg's `subtitles` filter on Windows fails
          // when the path contains a drive letter (e.g. C:\Users\...) — the
          // colon collides with filter syntax even with backslash escapes.
          // Cleanest fix: cd into OUTPUT_DIR and use a bare relative filename,
          // so the filter just sees "final_ad.srt" with no path separators.
          await exec(
            ffmpeg,
            [
              "-i", "final_ad.mp4", // also relative — both files live in cwd
              "-vf", `subtitles=final_ad.srt:force_style='${styleArgs}'`,
              "-c:v", "libx264", "-preset", "medium", "-crf", "20",
              "-c:a", "copy",
              "-movflags", "+faststart",
              "-y", "final_ad_captioned.mp4",
            ],
            { cwd: OUTPUT_DIR }
          );
          captionedVideoUrl = `/output/final_ad_captioned.mp4?v=${Date.now()}`;
          console.log(`[finalize] captions burned in → ${captionedPath}`);
        } catch (err) {
          console.warn(`[finalize] caption burn-in failed (returning main video without captions):`, (err as Error).message);
        }
      }
    }

    const relativePath = `/output/${path.basename(videoPath)}?v=${Date.now()}`;
    return NextResponse.json({
      videoUrl: captionedVideoUrl ?? relativePath,
      videoUrlPlain: relativePath, // always the unburned version for backup
      voiceoverUrl: mainVoUrl,
      srtUrl,
      captionsBurned: !!captionedVideoUrl,
      actualDurations,
      segments: voSegmentPaths?.map((s) => ({
        sceneIndex: s.sceneIndex,
        url: `/output/${path.basename(s.path)}?v=${Date.now()}`,
      })),
    });
  } catch (err) {
    const message = (err as Error).message || "Failed to finalize video";
    console.error("[finalize] error:", message);
    return apiError(message, ERROR_CODES.GENERATION_FAILED, 500);
  }
}

// ─── Caption helpers (Sprint 2) ──────────────────────────────────

/** Format seconds as "HH:MM:SS,mmm" for SRT. */
function srtTimestamp(seconds: number): string {
  const ms = Math.floor((seconds % 1) * 1000);
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/**
 * Build an SRT file from per-scene voiceover segments + their probed durations.
 * Each segment becomes one cue starting at its scene's cumulative offset.
 * Long lines (>42 chars) are split at the nearest word boundary.
 * When a branded opener is prepended, pass its duration as `leadInSec` so
 * caption timestamps align with the final video timeline (opener + clips).
 */
function buildSrtFromSegments(
  segments: VoiceoverSegment[],
  actualDurations: number[],
  leadInSec = 0
): string {
  const blocks: string[] = [];
  let cumulative = leadInSec;
  const offsets: number[] = [];
  for (let i = 0; i < actualDurations.length; i++) {
    offsets.push(cumulative);
    cumulative += actualDurations[i] || 5;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const start = offsets[seg.sceneIndex] ?? leadInSec;
    const end = start + (actualDurations[seg.sceneIndex] || 5);
    const text = wrapCaptionText(seg.text, 42);
    blocks.push(`${i + 1}\n${srtTimestamp(start)} --> ${srtTimestamp(end)}\n${text}\n`);
  }
  return blocks.join("\n");
}

/** Break long captions into at most 2 lines at word boundaries, max `maxChars` per line. */
function wrapCaptionText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const words = t.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      lines.push(current.trim());
      current = w;
      if (lines.length === 2) {
        // 3rd line would overflow — pack the rest into line 2
        current = current + " " + words.slice(words.indexOf(w) + 1).join(" ");
        break;
      }
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2).join("\n");
}

/**
 * Per-style libass `force_style` string for the FFmpeg `subtitles` filter.
 * Aspect-aware vertical positioning — captions sit in the lower-third for 16:9,
 * but higher up (mid-third) for vertical/square to stay above platform UI.
 *
 * `brandFont` (optional) overrides the style's default font so captions inherit
 * the brand body font set in Brand Hub. Falls back to per-style defaults.
 */
function captionStyleArgs(
  style: "modern" | "tiktok" | "cinematic",
  aspectRatio: AspectRatio,
  brandFont?: string
): string {
  // MarginV is the bottom margin in pixels. Vertical formats need bigger
  // margin so captions land in the thumb-safe area, not behind the IG UI.
  const marginV = aspectRatio === "9:16" ? 220 : aspectRatio === "4:5" ? 180 : aspectRatio === "1:1" ? 120 : 80;
  const fontSize = aspectRatio === "9:16" || aspectRatio === "4:5" ? 32 : 24;

  switch (style) {
    case "tiktok":
      // Bold sans-serif, yellow highlight, black outline. Centered.
      return `FontName=${brandFont || "Arial"},FontSize=${fontSize + 4},Bold=1,PrimaryColour=&H00FFFF00,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=${marginV}`;
    case "cinematic":
      // Italic serif, semi-transparent background, lower-third.
      return `FontName=${brandFont || "Georgia"},FontSize=${fontSize},Italic=1,PrimaryColour=&H00FFFFFF,BackColour=&HCC000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=${marginV}`;
    case "modern":
    default:
      // White sans-serif, black outline, drop shadow. Apple/Linear style.
      return `FontName=${brandFont || "Helvetica"},FontSize=${fontSize},Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=${marginV}`;
  }
}

/** Trim a string to at most `maxWords` words, breaking on the nearest sentence end. */
function trimToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  const trimmed = words.slice(0, maxWords).join(" ");
  // Prefer to end on a sentence boundary if there's one in the last 8 words.
  const endIdx = Math.max(trimmed.lastIndexOf(". "), trimmed.lastIndexOf("? "), trimmed.lastIndexOf("! "));
  if (endIdx > trimmed.length - 50) return trimmed.slice(0, endIdx + 1);
  return trimmed;
}
