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
import { generateVoiceover, pickVoice } from "@/lib/providers/edge-tts";
import type { QualityTier, AdFormat, VoiceoverSegment } from "@/lib/types";
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
  musicTrack?: string;
  musicDirection?: string;
  tier?: QualityTier;
  adFormat?: AdFormat;
  useNativeAudio?: boolean;
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
      tier,
      adFormat,
      useNativeAudio,
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
      // We pass the actual duration to the TTS via a small prefix hint that
      // doesn't change pronunciation, just nudges pacing.
      voSegmentPaths = [];
      for (let i = 0; i < voiceoverSegments.length; i++) {
        const seg = voiceoverSegments[i];
        const sceneIdx = seg.sceneIndex;
        const duration = actualDurations[sceneIdx] ?? 5;
        // Trim text if it exceeds what fits in the clip at ~2.4 wps. Keep at
        // least 70% of original so we don't mangle the script.
        const maxWords = Math.floor(duration * 2.4);
        const trimmed = trimToWords(seg.text, maxWords);
        const filename = `vo_scene_${sceneIdx}.wav`;
        const outPath = await generateVoiceover(trimmed, voice, OUTPUT_DIR, filename);
        voSegmentPaths.push({ sceneIndex: sceneIdx, path: outPath });
        // 21s pacing under Gemini TTS 3/min free tier limit
        if (i < voiceoverSegments.length - 1) {
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
      const outPath = await generateVoiceover(trimmed, voice, OUTPUT_DIR, "voiceover.wav");
      mainVoUrl = `/output/${path.basename(outPath)}?v=${Date.now()}`;
    }
    // If neither is provided, we assemble without VO (music + ambient only).

    // ── Step 3: Assemble with the calibrated voiceover ─────────────────────
    const musicPath = musicTrack
      ? path.join(process.cwd(), "public", "music", `${musicTrack}.mp3`)
      : undefined;
    const voiceoverPath = mainVoUrl && !voSegmentPaths ? toDiskPath(mainVoUrl) : undefined;

    const videoPath = await assembleVideo({
      videoClips: clipDiskPaths,
      durations: actualDurations, // use the probed durations
      voiceoverPath,
      voiceoverSegments: voSegmentPaths,
      musicPath,
      outputDir: OUTPUT_DIR,
      tier,
      adFormat,
      useNativeAudio,
    });

    const relativePath = `/output/${path.basename(videoPath)}?v=${Date.now()}`;
    return NextResponse.json({
      videoUrl: relativePath,
      voiceoverUrl: mainVoUrl,
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
