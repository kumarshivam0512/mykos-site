// ─── WaveSpeedAI Base Client ─────────────────────────────────────
// Shared submit/poll/download helpers for all WaveSpeed model endpoints.
//
// API docs: https://wavespeed.ai/docs/rest-api
// Base URL: https://api.wavespeed.ai/api/v3
// Auth:     Authorization: Bearer ${WAVESPEED_API_KEY}
//
// Workflow:
//   1. POST /api/v3/{model-id} with JSON body → { data: { id, urls: { get } } }
//   2. Poll GET /api/v3/predictions/{id} until status = "completed" or "failed"
//   3. Download from data.outputs[0]

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WS_BASE = "https://api.wavespeed.ai/api/v3";

/**
 * WaveSpeed video models (Wan 2.7 ref-to-video and Kling video) reject any
 * input image whose smallest side is below 240 pixels:
 *   "image resolution must be at least 240x240, got 225x225"
 * Logos and small upload thumbnails commonly fall below this. We upscale any
 * such image to a safe 512×512-fit before submission, preserving aspect ratio.
 * Returns the original buffer + mime when no resize was needed.
 */
async function ensureMinResolution(buf: Buffer, mime: string): Promise<{ buf: Buffer; mime: string }> {
  const minSide = 256; // a small safety margin above WaveSpeed's 240 floor
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w >= minSide && h >= minSide) return { buf, mime };

    // Scale the smallest side up to 512 while preserving aspect ratio. Use
    // lanczos3 for sharp edges on logos. Always emit PNG to keep alpha if any.
    const targetMin = 512;
    const scale = targetMin / Math.max(1, Math.min(w || targetMin, h || targetMin));
    const newW = Math.max(targetMin, Math.round((w || targetMin) * scale));
    const newH = Math.max(targetMin, Math.round((h || targetMin) * scale));
    const resized = await sharp(buf)
      .resize(newW, newH, { fit: "inside", kernel: "lanczos3" })
      .png()
      .toBuffer();
    console.log(`[WaveSpeed] upscaled small ref image ${w}x${h} → ${newW}x${newH} (required >=${minSide})`);
    return { buf: resized, mime: "image/png" };
  } catch (err) {
    // If sharp can't read it, return the original — WaveSpeed will return its
    // own error which we already surface in the orchestrator logs.
    console.warn(`[WaveSpeed] ensureMinResolution failed:`, (err as Error).message);
    return { buf, mime };
  }
}

/**
 * WaveSpeed's servers must be able to FETCH any reference URL we pass.
 * Local `/uploads/...` paths and `http://localhost:*` URLs from our own dev
 * server are not reachable from WaveSpeed's cloud, so we read them off disk
 * and inline them as base64 data URIs. We also upscale anything below 256px
 * on its smallest side so video models don't reject the input. Truly public
 * http(s) URLs and existing data URIs pass through.
 */
export async function resolveImageForWaveSpeed(url: string | undefined | null): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;

  // Detect localhost / private-network URLs and strip them down to the path
  // so we can read the file from disk.
  let localPath: string | null = null;
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      const host = u.hostname;
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host === "::1" ||
        host.endsWith(".local") ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host);
      if (!isLocal) return url; // genuinely public URL — pass through
      localPath = u.pathname;
    } catch {
      return url; // malformed URL, let WaveSpeed try it
    }
  } else {
    localPath = url; // already a relative path
  }

  // Treat as a path relative to `public/`. Strip query string and leading slash.
  const cleanPath = localPath.split("?")[0].replace(/^\/+/, "");
  const absPath = path.join(process.cwd(), "public", cleanPath);

  try {
    const raw = await fs.readFile(absPath);
    const ext = path.extname(cleanPath).toLowerCase();
    const initialMime =
      ext === ".png" ? "image/png" :
      ext === ".webp" ? "image/webp" :
      ext === ".gif" ? "image/gif" :
      "image/jpeg";
    const { buf, mime } = await ensureMinResolution(raw, initialMime);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (err) {
    throw new Error(`[WaveSpeed] could not read local upload "${url}" from ${absPath}: ${(err as Error).message}`);
  }
}

/** Same as above, but for an array (skips empty entries). */
export async function resolveImagesForWaveSpeed(urls: ReadonlyArray<string | undefined | null> | undefined): Promise<string[]> {
  if (!urls?.length) return [];
  const resolved = await Promise.all(urls.map((u) => resolveImageForWaveSpeed(u)));
  return resolved.filter((u): u is string => !!u);
}

export interface WaveSpeedSubmitResponse {
  code: number;
  message: string;
  data: {
    id: string;
    status: "created" | "processing" | "completed" | "failed";
    urls?: { get: string };
  };
}

export interface WaveSpeedResultResponse {
  code: number;
  message: string;
  data: {
    id: string;
    status: "created" | "processing" | "completed" | "failed";
    outputs?: string[];
    error?: string;
    timings?: { inference?: number };
  };
}

export interface WaveSpeedResult {
  /** Buffer of the first output (image/video). */
  buffer: Buffer;
  /** Public URL of the first output (usable as input to other models, e.g. i2v). */
  sourceUrl: string;
  /** Inference time in milliseconds, when reported. */
  inferenceMs?: number;
}

function getApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY required");
  return key;
}

/**
 * Submit a generation task to WaveSpeed and wait for the output URL.
 *
 * @param modelId  WaveSpeed model path, e.g. "google/nano-banana-2/text-to-image"
 * @param body     Model-specific request body (the model's "input" object)
 * @param opts     Polling options
 */
export async function runWaveSpeedTask(
  modelId: string,
  body: Record<string, unknown>,
  opts: {
    maxWaitMs?: number;
    intervalMs?: number;
    label?: string;
  } = {}
): Promise<WaveSpeedResult> {
  const apiKey = getApiKey();
  const maxWaitMs = opts.maxWaitMs ?? 360_000; // 6 minutes (videos can take a while)
  const intervalMs = opts.intervalMs ?? 3_000;
  const label = opts.label ?? modelId;

  // 1. Submit
  const submitRes = await fetch(`${WS_BASE}/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`[WaveSpeed:${label}] submit failed (${submitRes.status}): ${errText.slice(0, 300)}`);
  }

  const submitData = (await submitRes.json()) as WaveSpeedSubmitResponse;
  if (submitData.code !== 200 || !submitData.data?.id) {
    throw new Error(`[WaveSpeed:${label}] unexpected submit response: ${JSON.stringify(submitData).slice(0, 300)}`);
  }

  const taskId = submitData.data.id;
  const resultUrl = submitData.data.urls?.get ?? `${WS_BASE}/predictions/${taskId}`;

  // 2. Poll for completion
  const startTime = Date.now();
  let lastStatus = "";
  let inferenceMs: number | undefined;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const statusRes = await fetch(resultUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!statusRes.ok) continue; // transient errors — keep polling

    const statusData = (await statusRes.json()) as WaveSpeedResultResponse;
    const status = statusData.data?.status;

    if (status !== lastStatus) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[WaveSpeed:${label}] status=${status} (${elapsed}s)`);
      lastStatus = status || "";
    }

    if (status === "completed") {
      const outputUrl = statusData.data.outputs?.[0];
      if (!outputUrl) {
        throw new Error(`[WaveSpeed:${label}] completed but no output URL: ${JSON.stringify(statusData.data).slice(0, 300)}`);
      }
      inferenceMs = statusData.data.timings?.inference;

      // 3. Download
      const downloadRes = await fetch(outputUrl);
      if (!downloadRes.ok) {
        throw new Error(`[WaveSpeed:${label}] download failed (${downloadRes.status})`);
      }
      const buffer = Buffer.from(await downloadRes.arrayBuffer());
      return { buffer, sourceUrl: outputUrl, inferenceMs };
    }

    if (status === "failed") {
      const errMsg = statusData.data?.error || "unknown error";
      throw new Error(`[WaveSpeed:${label}] generation failed: ${errMsg}`);
    }
  }

  throw new Error(`[WaveSpeed:${label}] timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Maps standard aspect ratio (width x height) to WaveSpeed's enum strings.
 * Most models accept these: 1:1, 4:3, 3:4, 16:9, 9:16
 *
 * NOTE: Different models support different subsets. Pass `allowed` to constrain
 * the choice to what the specific model accepts; the function picks the closest
 * supported ratio by numeric distance.
 */
export function aspectRatioFromDimensions(
  width: number,
  height: number,
  allowed?: readonly string[]
): string {
  const targetRatio = width / height;
  const candidates: Array<{ name: string; value: number }> = [
    { name: "21:9", value: 21 / 9 },
    { name: "16:9", value: 16 / 9 },
    { name: "3:2", value: 3 / 2 },
    { name: "4:3", value: 4 / 3 },
    { name: "5:4", value: 5 / 4 },
    { name: "1:1", value: 1 },
    { name: "4:5", value: 4 / 5 },
    { name: "3:4", value: 3 / 4 },
    { name: "2:3", value: 2 / 3 },
    { name: "9:16", value: 9 / 16 },
    { name: "9:21", value: 9 / 21 },
  ];

  // Default allow-list if none provided: the broad common set
  const list = allowed ?? ["1:1", "16:9", "9:16", "4:3", "3:4"];

  // Filter candidates to those the model allows, then pick by numeric closeness
  const filtered = candidates.filter((c) => list.includes(c.name));
  if (filtered.length === 0) return list[0]; // fallback

  let best = filtered[0];
  let bestDist = Math.abs(filtered[0].value - targetRatio);
  for (const c of filtered) {
    const d = Math.abs(c.value - targetRatio);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best.name;
}

/**
 * Allowed aspect ratios per WaveSpeed model (the subset that model actually accepts).
 * Keep this in sync with the WaveSpeed API. When a model isn't listed here,
 * `aspectRatioFromDimensions` falls back to a safe common set.
 */
export const ASPECT_RATIO_ALLOW: Record<string, readonly string[]> = {
  // Z-Image Turbo
  "wavespeed-ai/z-image/turbo": ["1:1", "4:3", "3:4", "16:9", "9:16"],
  // Nano Banana text-to-image variants accept a wider set
  "google/nano-banana-2/text-to-image": ["1:1", "3:2", "2:3", "4:3", "3:4", "4:5", "5:4", "9:16", "16:9", "21:9"],
  "google/nano-banana-pro/text-to-image": ["1:1", "3:2", "2:3", "4:3", "3:4", "4:5", "5:4", "9:16", "16:9", "21:9"],
  // Nano Banana EDIT variants are stricter — they reject 16:9 and 1:1
  "google/nano-banana-2/edit": ["3:2", "2:3", "4:3", "3:4"],
  "google/nano-banana-pro/edit": ["3:2", "2:3", "4:3", "3:4"],
  "google/nano-banana-pro/edit-multi": ["3:2", "2:3", "3:4", "4:3"],
  // ByteDance Seedream V4 Edit
  "bytedance/seedream-v4/edit": ["1:1", "4:3", "16:9", "3:2", "21:9", "3:4", "9:16", "2:3"],
  // ByteDance Seedance video models
  "bytedance/seedance-2.0/image-to-video": ["auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
  "bytedance/seedance-2.0/text-to-video": ["auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
  "bytedance/seedance-2.0-fast/image-to-video": ["auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
  "bytedance/seedance-2.0-fast/text-to-video": ["auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
  "bytedance/seedance-v1-lite/reference-to-video": ["auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
  // Kling video models
  "kwaivgi/kling-v2.5-turbo-pro/image-to-video": ["16:9", "9:16", "1:1"],
  "kwaivgi/kling-v2.5-turbo-pro/text-to-video": ["16:9", "9:16", "1:1"],
  "kwaivgi/kling-v2.1-i2v-pro": ["16:9", "9:16", "1:1"],
  "kwaivgi/kling-v2.1-i2v-standard": ["16:9", "9:16", "1:1"],
  "kwaivgi/kling-v2.1-i2v-master": ["16:9", "9:16", "1:1"],
  "kwaivgi/kling-v2.1-t2v-master": ["16:9", "9:16", "1:1"],
  // Wan models
  "wavespeed-ai/wan-2.2/i2v-720p": ["16:9", "9:16", "1:1"],
  "wavespeed-ai/wan-2.2/t2v-720p": ["16:9", "9:16", "1:1"],
  "alibaba/wan-2.7/reference-to-video": ["16:9", "9:16", "1:1", "4:3", "3:4"],
};
