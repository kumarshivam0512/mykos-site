import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  try {
    return require("ffmpeg-static") as string;
  } catch {
    return "ffmpeg";
  }
}

export interface AssemblyParams {
  images?: string[];       // paths to scene images (slideshow mode)
  videoClips?: string[];   // paths to MP4 clips (AI video mode)
  durations: number[];
  voiceoverPath?: string;
  musicPath?: string;
  outputDir: string;
  fps?: number;
  width?: number;
  height?: number;
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
    musicPath,
    outputDir,
    fps = 30,
    width = 1280,
    height = 720,
  } = params;

  await fs.mkdir(outputDir, { recursive: true });
  const ffmpeg = getFfmpegPath();
  const outputPath = path.join(outputDir, "final_ad.mp4");

  let clipPaths: string[];

  if (videoClips && videoClips.length > 0) {
    // AI Video mode: clips are already MP4 files, just normalize resolution
    clipPaths = [];
    for (let i = 0; i < videoClips.length; i++) {
      const normPath = path.join(outputDir, `norm_${i}.mp4`);
      await execFileAsync(ffmpeg, [
        "-i", videoClips[i],
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-an", "-pix_fmt", "yuv420p", "-y", normPath,
      ]);
      clipPaths.push(normPath);
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
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-y", clipPath,
      ]);
      clipPaths.push(clipPath);
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
    const offset = Math.max(0.5, (durations[0] || 5) - xfadeDuration);
    currentVideo = path.join(outputDir, "video_xfade.mp4");
    try {
      await execFileAsync(ffmpeg, [
        "-i", clipPaths[0], "-i", clipPaths[1],
        "-filter_complex",
        `[0:v][1:v]xfade=transition=fade:duration=${xfadeDuration}:offset=${offset}[v]`,
        "-map", "[v]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-y", currentVideo,
      ]);
    } catch {
      currentVideo = await concatFallback(ffmpeg, clipPaths, outputDir);
    }
  } else {
    // Multi-clip xfade chain
    const inputArgs = clipPaths.flatMap((p) => ["-i", p]);
    let filterChain = "";
    let prevLabel = "0:v";
    let offset = 0;

    for (let i = 1; i < clipPaths.length; i++) {
      offset += Math.max(0.5, (durations[i - 1] || 5) - xfadeDuration);
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
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-y", currentVideo,
      ]);
    } catch {
      console.warn("Crossfade failed, using simple concat fallback");
      currentVideo = await concatFallback(ffmpeg, clipPaths, outputDir);
    }
  }

  // Add audio
  const audioInputs: string[] = ["-i", currentVideo];
  let audioStreamCount = 0;
  if (voiceoverPath) { audioInputs.push("-i", voiceoverPath); audioStreamCount++; }
  if (musicPath) { audioInputs.push("-i", musicPath); audioStreamCount++; }

  if (audioStreamCount === 0) {
    await execFileAsync(ffmpeg, [
      "-i", currentVideo, "-c:v", "copy",
      "-movflags", "+faststart", "-y", outputPath,
    ]);
  } else if (audioStreamCount === 1 && voiceoverPath) {
    await execFileAsync(ffmpeg, [
      ...audioInputs,
      "-filter_complex", `[1:a]volume=1.0,afade=t=in:d=0.3[vo]`,
      "-map", "0:v", "-map", "[vo]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-shortest", "-movflags", "+faststart", "-y", outputPath,
    ]);
  } else if (audioStreamCount === 1 && musicPath) {
    await execFileAsync(ffmpeg, [
      ...audioInputs,
      "-filter_complex", `[1:a]volume=0.3,afade=t=in:d=1.0[music]`,
      "-map", "0:v", "-map", "[music]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-shortest", "-movflags", "+faststart", "-y", outputPath,
    ]);
  } else {
    await execFileAsync(ffmpeg, [
      ...audioInputs,
      "-filter_complex",
      `[1:a]volume=1.0,afade=t=in:d=0.3[vo];[2:a]volume=0.15,afade=t=in:d=1.0[music];[vo][music]amix=inputs=2:duration=shortest[aout]`,
      "-map", "0:v", "-map", "[aout]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-shortest", "-movflags", "+faststart", "-y", outputPath,
    ]);
  }

  // Cleanup temp files
  for (const clip of clipPaths) { await fs.unlink(clip).catch(() => {}); }
  await fs.unlink(path.join(outputDir, "video_xfade.mp4")).catch(() => {});
  await fs.unlink(path.join(outputDir, "concat.txt")).catch(() => {});
  await fs.unlink(path.join(outputDir, "video_concat.mp4")).catch(() => {});

  return outputPath;
}

async function concatFallback(ffmpeg: string, clipPaths: string[], outputDir: string): Promise<string> {
  const concatFile = path.join(outputDir, "concat.txt");
  const concatContent = clipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  await fs.writeFile(concatFile, concatContent);
  const out = path.join(outputDir, "video_concat.mp4");
  await execFileAsync(ffmpeg, [
    "-f", "concat", "-safe", "0", "-i", concatFile,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-y", out,
  ]);
  return out;
}
