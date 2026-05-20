import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import type { QualityTier, AdFormat } from "@/lib/types";

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  try {
    return require("ffmpeg-static") as string;
  } catch {
    return "ffmpeg";
  }
}

/** ffprobe is bundled alongside ffmpeg in @ffprobe-installer; fall back to PATH. */
function getFfprobePath(): string {
  try {
    return (require("@ffprobe-installer/ffprobe") as { path: string }).path;
  } catch {
    return "ffprobe";
  }
}

/**
 * Probe the real duration of a media file. Returns 0 on failure so the caller
 * can fall back to the requested duration. We need this because video models
 * (Wan, Kling, Seedance) often return clips that are 0.1-0.5s shorter than
 * requested — silently using requested durations causes audio drift and
 * crossfade timing errors.
 */
async function probeDuration(filePath: string): Promise<number> {
  try {
    const ffprobe = getFfprobePath();
    const { stdout } = await execFileAsync(ffprobe, [
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

/**
 * Returns true if the given media file has at least one audio stream. Used
 * to detect whether a normalized WaveSpeed clip carries Kling's native
 * ambient audio or is one of the silent models (Seedance / Wan).
 */
async function probeHasAudioStream(filePath: string): Promise<boolean> {
  try {
    const ffprobe = getFfprobePath();
    const { stdout } = await execFileAsync(ffprobe, [
      "-v", "error",
      "-select_streams", "a",
      "-show_entries", "stream=codec_type",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Tier-aware encode parameters. Luxury content (Ultra) deserves slower preset
 * and lower CRF (higher quality, larger files). Budget gets faster encode.
 */
interface EncodeParams { preset: string; crf: string; audioBitrate: string; }
function encodeParamsForTier(tier?: QualityTier): EncodeParams {
  switch (tier) {
    case "ultra":   return { preset: "slow",   crf: "16", audioBitrate: "256k" };
    case "premium": return { preset: "medium", crf: "18", audioBitrate: "192k" };
    default:        return { preset: "fast",   crf: "22", audioBitrate: "128k" };
  }
}

/**
 * Ad-format-aware audio mix. A minimalist editorial luxury spot needs music
 * almost as loud as the voiceover; a testimonial needs VO to dominate.
 */
interface AudioMix { voVolume: number; musicVolume: number; }
function audioMixForFormat(adFormat?: AdFormat): AudioMix {
  switch (adFormat) {
    case "minimalist_editorial": return { voVolume: 0.7, musicVolume: 0.55 };
    case "cinematic_lifestyle":  return { voVolume: 0.85, musicVolume: 0.40 };
    case "product_showcase":     return { voVolume: 0.95, musicVolume: 0.25 };
    case "energetic_sports":     return { voVolume: 0.85, musicVolume: 0.55 };
    case "testimonial_ugc":      return { voVolume: 1.0, musicVolume: 0.10 };
    case "animated_explainer":   return { voVolume: 1.0, musicVolume: 0.20 };
    default:                     return { voVolume: 1.0, musicVolume: 0.15 };
  }
}

export interface VoiceoverSegmentInput {
  sceneIndex: number;
  /** Absolute file path on disk (caller is responsible for resolving the URL). */
  path: string;
}

export interface AssemblyParams {
  images?: string[];       // paths to scene images (slideshow mode)
  videoClips?: string[];   // paths to MP4 clips (AI video mode)
  durations: number[];
  voiceoverPath?: string;
  /**
   * Per-scene voiceover segments. If provided, each segment is delayed by the
   * cumulative offset of its scene index and mixed independently. Wins over
   * `voiceoverPath` when both are present.
   */
  voiceoverSegments?: VoiceoverSegmentInput[];
  musicPath?: string;
  /**
   * Optional ambient bed (e.g. cafe noise) mixed UNDER the music. Used for
   * testimonial_ugc template to add real-world texture. Different from
   * `useNativeAudio` which pulls ambience from the source clip's own track.
   */
  ambientPath?: string;
  /** Ambient bed volume, 0.0–0.5 typical. Defaults to 0.08 when ambientPath set. */
  ambientVolume?: number;
  outputDir: string;
  fps?: number;
  width?: number;
  height?: number;
  /** Quality tier — drives codec preset, CRF, and audio bitrate. */
  tier?: QualityTier;
  /** Ad format — drives audio mixing balance between voiceover and music. */
  adFormat?: AdFormat;
  /**
   * When true (and the source clips have audio), keep native model-generated
   * audio (e.g. Kling's ambient/SFX) and mix it under the voiceover at a quiet
   * level. Has no effect on silent models (Seedance, Wan).
   */
  useNativeAudio?: boolean;
  /**
   * Add subtle handheld jitter (Sprint A item 5) to make Seedance/Kling/Wan
   * clips feel iPhone-shot. Applied during the clip-normalization pass as a
   * tiny time-varying crop offset. Cheap, no analysis required.
   * Auto-enabled in callers for testimonial_ugc adFormat.
   */
  addHandheldJitter?: boolean;
  /**
   * Branded chrome paths (Sprint A item 6c). All optional. When present:
   *   • `openerPath`: prepended to the timeline (no xfade — clean cut)
   *   • `endCardPath`: appended to the timeline (no xfade)
   *   • `overlayPaths[i]`: composited ON TOP of normalized clip i via FFmpeg
   *     overlay filter (transparent WebM with alpha channel)
   * VO offsets are automatically shifted by `openerDurationSec` so the
   * voiceover stays aligned with the scene clips.
   */
  openerPath?: string;
  openerDurationSec?: number;
  endCardPath?: string;
  endCardDurationSec?: number;
  overlayPaths?: (string | undefined)[];
}

// Varied Ken Burns motion patterns for visual variety
const MOTION_PATTERNS = [
  { z: "min(zoom+0.0008,1.25)", x: "iw/2-(iw/zoom/2)+on*0.15", y: "ih/2-(ih/zoom/2)" },
  { z: "if(eq(on\\,1)\\,1.25\\,max(zoom-0.0008\\,1))", x: "iw/2-(iw/zoom/2)-on*0.1", y: "ih/2-(ih/zoom/2)" },
  { z: "1.15", x: "on*0.3", y: "ih/2-(ih/zoom/2)" },
  { z: "min(zoom+0.0004,1.15)", x: "iw/2-(iw/zoom/2)", y: "on*0.2" },
  { z: "min(zoom+0.0006,1.2)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" },
];

export async function assembleVideo(params: AssemblyParams): Promise<string> {
  const {
    images,
    videoClips,
    durations,
    voiceoverPath,
    voiceoverSegments,
    musicPath,
    ambientPath,
    ambientVolume: customAmbientVolume,
    outputDir,
    fps = 30,
    width = 1280,
    height = 720,
    tier,
    adFormat,
    useNativeAudio = false,
    addHandheldJitter = false,
    openerPath,
    openerDurationSec = 0,
    endCardPath,
    endCardDurationSec = 0,
    overlayPaths,
  } = params;

  await fs.mkdir(outputDir, { recursive: true });
  const ffmpeg = getFfmpegPath();
  const outputPath = path.join(outputDir, "final_ad.mp4");
  const enc = encodeParamsForTier(tier);

  let clipPaths: string[];
  /** Actual on-disk durations after normalization — used for accurate xfade timing. */
  const actualDurations: number[] = [];

  if (videoClips && videoClips.length > 0) {
    // AI Video mode: clips are already MP4 files, just normalize resolution.
    // Probe each clip for its REAL duration (WaveSpeed often returns ~0.1-0.5s
    // shorter than requested) and use that for downstream xfade timing.
    clipPaths = [];
    for (let i = 0; i < videoClips.length; i++) {
      const normPath = path.join(outputDir, `norm_${i}.mp4`);
      // Keep source audio when useNativeAudio is true (Kling v2.5 Turbo Pro
      // generates ambient SFX); strip it otherwise to avoid surprise audio.
      // Silent models (Seedance, Wan) just produce a silent track either way.
      const audioFlag = useNativeAudio ? [] : ["-an"];
      // Build the video filter chain. Optional handheld jitter is applied
      // BEFORE scale/pad so the crop window moves within the source frame.
      // The jitter: scale slightly oversized → moving crop window → final scale/pad.
      // Each clip gets a different phase offset so motion isn't synchronized.
      const phase = i * 1.3;
      const jitterChain = addHandheldJitter
        ? [
            // Oversample by ~5% so we have headroom for the moving crop.
            `scale=iw*1.05:ih*1.05:flags=lanczos`,
            // Crop a window slightly smaller than the source, with subtle sin/cos
            // offsets driven by `t` (clip timestamp). Amplitudes kept small
            // (~6px) so the jitter reads as "handheld" not "drunk camera".
            `crop=in_w*0.92:in_h*0.92:` +
              `(in_w-out_w)/2+6*sin(t*1.7+${phase.toFixed(2)}):` +
              `(in_h-out_h)/2+5*cos(t*2.1+${phase.toFixed(2)})`,
          ]
        : [];
      const finalFilter = [
        ...jitterChain,
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      ].join(",");
      // If this scene has a Remotion overlay (transparent WebM), composite it
      // ON TOP of the normalized frame via `overlay` in a filter_complex. The
      // overlay file is added as a second input, scaled to match the canvas,
      // then composited with alpha. We use -shortest behavior implicitly via
      // overlay's end-on-shortest default to keep duration honest.
      const overlayForScene = overlayPaths?.[i];
      if (overlayForScene) {
        await execFileAsync(ffmpeg, [
          "-i", videoClips[i],
          "-i", overlayForScene,
          "-filter_complex",
          `[0:v]${finalFilter}[base];` +
          `[1:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black@0[ovl];` +
          `[base][ovl]overlay=0:0:format=auto[v]`,
          "-map", "[v]",
          ...(useNativeAudio ? ["-map", "0:a?"] : ["-an"]),
          "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
          "-pix_fmt", "yuv420p", "-y", normPath,
        ]);
      } else {
        await execFileAsync(ffmpeg, [
          "-i", videoClips[i],
          "-vf", finalFilter,
          "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
          ...audioFlag, "-pix_fmt", "yuv420p", "-y", normPath,
        ]);
      }
      clipPaths.push(normPath);

      const real = await probeDuration(normPath);
      const requested = durations[i] || 5;
      const effective = real > 0 ? real : requested;
      if (real > 0 && Math.abs(real - requested) > 0.15) {
        console.warn(`[assemble] clip ${i}: requested ${requested}s, actual ${real.toFixed(2)}s — using actual`);
      }
      actualDurations.push(effective);
    }
  } else if (images && images.length > 0) {
    // Slideshow mode: Ken Burns from images
    clipPaths = [];
    const srcW = Math.round(width * 1.3);
    const srcH = Math.round(height * 1.3);

    for (let i = 0; i < images.length; i++) {
      const clipPath = path.join(outputDir, `clip_${i}.mp4`);
      const dur = durations[i] || 5;
      const totalFrames = dur * fps;
      const motion = MOTION_PATTERNS[i % MOTION_PATTERNS.length];

      const filters = [
        `scale=${srcW}:${srcH}:flags=lanczos`,
        `zoompan=z='${motion.z}':x='${motion.x}':y='${motion.y}':d=${totalFrames}:s=${width}x${height}:fps=${fps}`,
        i === 0 ? `fade=t=in:st=0:d=0.5` : "",
        i === images.length - 1 ? `fade=t=out:st=${Math.max(0, dur - 0.5)}:d=0.5` : "",
      ].filter(Boolean).join(",");

      await execFileAsync(ffmpeg, [
        "-loop", "1",
        "-i", images[i],
        "-vf", filters,
        "-t", String(dur),
        "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
        "-pix_fmt", "yuv420p", "-y", clipPath,
      ]);
      clipPaths.push(clipPath);
      // Slideshow clips are exact-duration by construction.
      actualDurations.push(dur);
    }
  } else {
    throw new Error("No images or video clips provided for assembly");
  }

  // Concatenate clips with crossfade transitions
  let currentVideo: string;
  const xfadeDuration = 0.8;

  if (clipPaths.length === 1) {
    currentVideo = clipPaths[0];
  } else if (clipPaths.length === 2) {
    const offset = Math.max(0.5, (actualDurations[0] || 5) - xfadeDuration);
    currentVideo = path.join(outputDir, "video_xfade.mp4");
    try {
      await execFileAsync(ffmpeg, [
        "-i", clipPaths[0], "-i", clipPaths[1],
        "-filter_complex",
        `[0:v][1:v]xfade=transition=fade:duration=${xfadeDuration}:offset=${offset}[v]`,
        "-map", "[v]",
        "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
        "-pix_fmt", "yuv420p", "-y", currentVideo,
      ]);
    } catch {
      currentVideo = await concatFallback(ffmpeg, clipPaths, outputDir, enc);
    }
  } else {
    // Multi-clip xfade chain
    const inputArgs = clipPaths.flatMap((p) => ["-i", p]);
    let filterChain = "";
    let prevLabel = "0:v";
    let offset = 0;

    for (let i = 1; i < clipPaths.length; i++) {
      offset += Math.max(0.5, (actualDurations[i - 1] || 5) - xfadeDuration);
      const outLabel = i === clipPaths.length - 1 ? "[v]" : `[xf${i}]`;
      filterChain += `[${prevLabel}][${i}:v]xfade=transition=fade:duration=${xfadeDuration}:offset=${offset}${outLabel};`;
      prevLabel = `xf${i}`;
    }
    filterChain = filterChain.replace(/;$/, "");

    currentVideo = path.join(outputDir, "video_xfade.mp4");
    try {
      await execFileAsync(ffmpeg, [
        ...inputArgs,
        "-filter_complex", filterChain,
        "-map", "[v]",
        "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
        "-pix_fmt", "yuv420p", "-y", currentVideo,
      ]);
    } catch (xfadeErr) {
      console.warn("Crossfade failed:", (xfadeErr as Error).message);
      console.warn("Filter chain was:", filterChain);
      currentVideo = await concatFallback(ffmpeg, clipPaths, outputDir, enc);
    }
  }

  // ── Branded chrome (Sprint A item 6c) ────────────────────────
  // Prepend opener + append endCard via simple concat (no xfade — chrome
  // moments stay clean). Both are normalized to the same dims as scene clips
  // before concat so the demuxer is happy.
  if (openerPath || endCardPath) {
    const concatPieces: string[] = [];

    // Normalize opener to scene dims, strip audio (chrome shouldn't carry it).
    if (openerPath) {
      const normOpener = path.join(outputDir, "norm_opener.mp4");
      await execFileAsync(ffmpeg, [
        "-i", openerPath,
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        "-an", "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
        "-pix_fmt", "yuv420p", "-y", normOpener,
      ]);
      concatPieces.push(normOpener);
    }
    concatPieces.push(currentVideo);
    if (endCardPath) {
      const normEnd = path.join(outputDir, "norm_endcard.mp4");
      await execFileAsync(ffmpeg, [
        "-i", endCardPath,
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        "-an", "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
        "-pix_fmt", "yuv420p", "-y", normEnd,
      ]);
      concatPieces.push(normEnd);
    }

    const concatFile = path.join(outputDir, "chrome_concat.txt");
    await fs.writeFile(
      concatFile,
      concatPieces.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n")
    );
    const chromedVideo = path.join(outputDir, "video_with_chrome.mp4");
    await execFileAsync(ffmpeg, [
      "-f", "concat", "-safe", "0", "-i", concatFile,
      // Concat demuxer requires identical codec params — re-encode lightly
      // to guarantee that even when xfade output and chrome have minor diffs.
      "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
      "-pix_fmt", "yuv420p", "-an", "-y", chromedVideo,
    ]);
    currentVideo = chromedVideo;
  }

  // ── Audio mix ───────────────────────────────────────────────
  //
  // Inputs (each as a separate -i to FFmpeg, indices matter):
  //   index 0           = currentVideo (carries native audio when useNativeAudio is on)
  //   index 1..N        = per-scene voiceover segments (voiceoverSegments mode)
  //                       OR a single full voiceover file (voiceoverPath mode)
  //   index N+1         = music (optional)
  //
  // We build a filtergraph that:
  //   - delays each VO segment by the cumulative video offset of its scene index
  //   - mixes all VO segments into one [vo] stream
  //   - optionally pulls native ambient from [0:a] at 0.12 volume
  //   - mixes music at audioMixForFormat(adFormat).musicVolume (ducked when ambient is in)
  //   - outputs a single [aout] mapped to the final MP4
  //
  // Falls back to copy-video-only when there's literally nothing to mix.

  const mix = audioMixForFormat(adFormat);
  // Cumulative offset of each scene (used to delay VO segments). When an
  // opener is prepended, every offset shifts by openerDurationSec so VO
  // still lands on the right scene clip.
  const openerShift = openerPath ? (openerDurationSec || 0) : 0;
  const sceneOffsets: number[] = [];
  {
    let cum = openerShift;
    for (let i = 0; i < actualDurations.length; i++) {
      sceneOffsets.push(cum);
      cum += actualDurations[i] || 5;
    }
  }

  // Detect whether the normalized video carries any audio (only true when
  // useNativeAudio is on AND at least one source clip had an audio track).
  const hasNativeAudio = useNativeAudio && currentVideo
    ? (await probeHasAudioStream(currentVideo))
    : false;
  // When ambient is in the mix, slightly duck the music so the bed doesn't compete.
  const musicVolumeAdjusted = hasNativeAudio || ambientPath ? mix.musicVolume * 0.7 : mix.musicVolume;
  const ambientVolume = 0.12;
  const externalAmbientVolume = typeof customAmbientVolume === "number"
    ? Math.max(0, Math.min(0.5, customAmbientVolume))
    : 0.08;

  const useSegments = !!(voiceoverSegments && voiceoverSegments.length > 0);
  const useSingleVo = !useSegments && !!voiceoverPath;

  // Collect inputs and remember their FFmpeg stream index.
  const audioInputs: string[] = ["-i", currentVideo];
  const voSegmentStreamIdx: { sceneIndex: number; idx: number }[] = [];
  let voSingleIdx: number | null = null;
  let musicIdx: number | null = null;
  let externalAmbientIdx: number | null = null;
  let nextIdx = 1;

  if (useSegments) {
    for (const seg of voiceoverSegments!) {
      audioInputs.push("-i", seg.path);
      voSegmentStreamIdx.push({ sceneIndex: seg.sceneIndex, idx: nextIdx });
      nextIdx++;
    }
  } else if (useSingleVo) {
    audioInputs.push("-i", voiceoverPath!);
    voSingleIdx = nextIdx;
    nextIdx++;
  }
  if (musicPath) {
    audioInputs.push("-i", musicPath);
    musicIdx = nextIdx;
    nextIdx++;
  }
  if (ambientPath) {
    audioInputs.push("-i", ambientPath);
    externalAmbientIdx = nextIdx;
    nextIdx++;
  }

  const haveAnyAudio = useSegments || useSingleVo || musicIdx !== null || externalAmbientIdx !== null || hasNativeAudio;

  if (!haveAnyAudio) {
    await execFileAsync(ffmpeg, [
      "-i", currentVideo, "-c:v", "copy",
      "-movflags", "+faststart", "-y", outputPath,
    ]);
  } else {
    // Build the filter graph piece by piece, then amix the final mix labels.
    const filterParts: string[] = [];
    const mixLabels: string[] = [];

    // VO segments — delay each by its scene's cumulative offset.
    if (useSegments) {
      for (const { sceneIndex, idx } of voSegmentStreamIdx) {
        // Defensive: skip any segment whose sceneIndex points past the end of
        // the rendered video. Without this, undefined offsets would default to
        // 0ms delay and the audio would stack on top of scene 0.
        if (sceneIndex < 0 || sceneIndex >= sceneOffsets.length) {
          console.warn(`[ffmpeg] skipping VO segment for scene ${sceneIndex} — outside rendered range [0..${sceneOffsets.length - 1}]`);
          continue;
        }
        const offsetMs = Math.round((sceneOffsets[sceneIndex] || 0) * 1000);
        const label = `vo${idx}`;
        filterParts.push(`[${idx}:a]adelay=${offsetMs}|${offsetMs},volume=${mix.voVolume},afade=t=in:d=0.2[${label}]`);
        mixLabels.push(`[${label}]`);
      }
    } else if (useSingleVo) {
      filterParts.push(`[${voSingleIdx}:a]volume=${mix.voVolume},afade=t=in:d=0.3[vo]`);
      mixLabels.push("[vo]");
    }

    if (hasNativeAudio) {
      filterParts.push(`[0:a]volume=${ambientVolume}[ambient]`);
      mixLabels.push("[ambient]");
    }

    if (musicIdx !== null) {
      filterParts.push(`[${musicIdx}:a]volume=${musicVolumeAdjusted},afade=t=in:d=1.0[music]`);
      mixLabels.push("[music]");
    }

    if (externalAmbientIdx !== null) {
      // External ambient bed (e.g. cafe noise file). Loop with `aloop` so
      // short SFX files extend across the full video; tail-trim via -shortest.
      filterParts.push(`[${externalAmbientIdx}:a]aloop=loop=-1:size=2e9,volume=${externalAmbientVolume},afade=t=in:d=1.5[extamb]`);
      mixLabels.push("[extamb]");
    }

    // Final mix — single track passes through; multiple amix together.
    if (mixLabels.length === 1) {
      filterParts.push(`${mixLabels[0]}aresample=async=1:first_pts=0[aout]`);
    } else {
      filterParts.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=0,aresample=async=1:first_pts=0[aout]`);
    }

    await execFileAsync(ffmpeg, [
      ...audioInputs,
      "-filter_complex", filterParts.join(";"),
      "-map", "0:v", "-map", "[aout]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", enc.audioBitrate,
      // Use video duration as the master so VO can extend slightly past last
      // clip without truncating, but the file ends when the video ends.
      "-shortest", "-movflags", "+faststart", "-y", outputPath,
    ]);
  }

  // Cleanup temp files
  for (const clip of clipPaths) { await fs.unlink(clip).catch(() => {}); }
  await fs.unlink(path.join(outputDir, "video_xfade.mp4")).catch(() => {});
  await fs.unlink(path.join(outputDir, "concat.txt")).catch(() => {});
  await fs.unlink(path.join(outputDir, "video_concat.mp4")).catch(() => {});
  // Sprint A item 6c chrome temps
  await fs.unlink(path.join(outputDir, "norm_opener.mp4")).catch(() => {});
  await fs.unlink(path.join(outputDir, "norm_endcard.mp4")).catch(() => {});
  await fs.unlink(path.join(outputDir, "chrome_concat.txt")).catch(() => {});
  await fs.unlink(path.join(outputDir, "video_with_chrome.mp4")).catch(() => {});

  return outputPath;
}

async function concatFallback(ffmpeg: string, clipPaths: string[], outputDir: string, enc: EncodeParams): Promise<string> {
  const concatFile = path.join(outputDir, "concat.txt");
  const concatContent = clipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  await fs.writeFile(concatFile, concatContent);
  const out = path.join(outputDir, "video_concat.mp4");
  await execFileAsync(ffmpeg, [
    "-f", "concat", "-safe", "0", "-i", concatFile,
    "-c:v", "libx264", "-preset", enc.preset, "-crf", enc.crf,
    "-pix_fmt", "yuv420p", "-y", out,
  ]);
  return out;
}
