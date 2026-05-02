import type { Scene, CameraSettings, AdFormat } from "@/lib/types";
import { buildVideoPrompt } from "@/lib/prompts/prompt-engine";

// ─── Video Model Tiers (user-selectable) ─────────────────────────
export type VideoModel =
  | "kling-2.1-standard"
  | "kling-2.1-pro"
  | "seedance-pro"
  | "wan-2.2"
  | "auto";

export const VIDEO_MODELS: { id: VideoModel; label: string; provider: string; tier: string }[] = [
  { id: "auto", label: "Auto (cheapest available)", provider: "Auto", tier: "Smart" },
  { id: "kling-2.1-standard", label: "Kling 2.1 Standard", provider: "Higgsfield", tier: "Good" },
  { id: "kling-2.1-pro", label: "Kling 2.1 Pro", provider: "Higgsfield", tier: "Better" },
  { id: "seedance-pro", label: "Seedance Pro", provider: "Higgsfield", tier: "Best" },
  { id: "wan-2.2", label: "Wan 2.2 Fast", provider: "Replicate", tier: "Budget" },
];

const HIGGSFIELD_ENDPOINTS: Record<string, string> = {
  "kling-2.1-standard": "kling-video/v2.1/standard/image-to-video",
  "kling-2.1-pro": "kling-video/v2.1/pro/image-to-video",
  "seedance-pro": "bytedance/seedance/v1/pro/image-to-video",
};

export async function generateVideoClip(
  imageUrl: string,
  scene: Scene,
  duration: number = 5,
  model: VideoModel = "auto",
  aspectRatio: string = "16:9",
  hasProductImage: boolean = false,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  characterDescription?: string
): Promise<Buffer> {
  const resolvedModel = resolveModel(model);
  const prompt = buildVideoPrompt(scene, cameraSettings, adFormat, hasProductImage, characterDescription);

  console.log(`[Video] Model: ${resolvedModel}, Duration: ${duration}s, Prompt length: ${prompt.length}`);

  if (resolvedModel === "wan-2.2") {
    if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN required for Wan 2.2");
    return generateViaReplicate(imageUrl, prompt);
  }

  // Higgsfield models
  if (process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET) {
    return generateViaHiggsfield(imageUrl, prompt, resolvedModel, duration, aspectRatio);
  }

  // Fallback chain
  if (process.env.REPLICATE_API_TOKEN) {
    console.log("[Video] Falling back to Replicate");
    return generateViaReplicate(imageUrl, prompt);
  }
  if (process.env.FAL_KEY) {
    console.log("[Video] Falling back to Fal.ai");
    return generateViaFal(imageUrl, prompt, duration);
  }

  throw new Error("No video API key configured. Add HIGGSFIELD_KEY+HIGGSFIELD_SECRET to .env.local");
}

function resolveModel(model: VideoModel): string {
  if (model !== "auto") return model;
  if (process.env.HIGGSFIELD_KEY) return "kling-2.1-standard";
  if (process.env.REPLICATE_API_TOKEN) return "wan-2.2";
  if (process.env.FAL_KEY) return "kling-2.1-pro";
  return "kling-2.1-standard";
}

// ─── Higgsfield ──────────────────────────────────────────────────

async function generateViaHiggsfield(
  imageUrl: string,
  prompt: string,
  model: string,
  duration: number,
  aspectRatio: string
): Promise<Buffer> {
  const apiKey = process.env.HIGGSFIELD_KEY!;
  const apiSecret = process.env.HIGGSFIELD_SECRET!;
  const endpoint = HIGGSFIELD_ENDPOINTS[model] || HIGGSFIELD_ENDPOINTS["kling-2.1-standard"];

  const submitRes = await fetch(`https://platform.higgsfield.ai/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}:${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      duration: String(Math.min(duration, 10)),
      aspect_ratio: aspectRatio,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield ${model} failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;
  if (!requestId) throw new Error("No request_id from Higgsfield");

  return pollHiggsfield(requestId, apiKey, apiSecret);
}

async function pollHiggsfield(requestId: string, apiKey: string, apiSecret: string): Promise<Buffer> {
  const maxWait = 300000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const elapsed = Date.now() - startTime;
    const interval = elapsed < 60000 ? 10000 : 5000;
    await new Promise((r) => setTimeout(r, interval));

    const statusRes = await fetch(`https://platform.higgsfield.ai/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${apiKey}:${apiSecret}` },
    });
    if (!statusRes.ok) continue;

    const data = await statusRes.json();
    const hfStatus = (data.status || "").toUpperCase();

    if (hfStatus === "COMPLETED") {
      const resultRes = await fetch(`https://platform.higgsfield.ai/requests/${requestId}`, {
        headers: { Authorization: `Key ${apiKey}:${apiSecret}` },
      });
      if (!resultRes.ok) throw new Error("Failed to fetch result");
      const resultData = await resultRes.json();
      const videoUrl = resultData.video?.url;
      if (!videoUrl) throw new Error("No video URL in result");
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Failed to download video");
      return Buffer.from(await videoRes.arrayBuffer());
    }

    if (hfStatus === "FAILED") throw new Error("Higgsfield generation failed");
  }

  throw new Error("Video generation timed out (5 min)");
}

// ─── Replicate (Wan 2.2) ─────────────────────────────────────────

async function generateViaReplicate(imageUrl: string, prompt: string): Promise<Buffer> {
  const apiToken = process.env.REPLICATE_API_TOKEN!;

  const submitRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "wan-video/wan-2.2-i2v-fast",
      input: { prompt, first_frame_image: imageUrl },
    }),
  });

  if (!submitRes.ok) throw new Error(`Replicate failed (${submitRes.status})`);
  const { id: predictionId } = await submitRes.json();
  if (!predictionId) throw new Error("No prediction ID");

  const maxWait = 300000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) continue;
    const d = await res.json();
    if (d.status === "succeeded") {
      const url = Array.isArray(d.output) ? d.output[0] : d.output;
      if (!url) throw new Error("No video URL");
      const r = await fetch(url);
      return Buffer.from(await r.arrayBuffer());
    }
    if (d.status === "failed" || d.status === "canceled") throw new Error(`Replicate ${d.status}`);
  }
  throw new Error("Replicate timed out");
}

// ─── Fal.ai ──────────────────────────────────────────────────────

async function generateViaFal(imageUrl: string, prompt: string, duration: number): Promise<Buffer> {
  const apiKey = process.env.FAL_KEY!;
  const base = "https://queue.fal.run/fal-ai/kling-video/v2/master/image-to-video";

  const submitRes = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_url: imageUrl, duration: String(duration), aspect_ratio: "16:9" }),
  });
  if (!submitRes.ok) throw new Error(`Fal.ai failed (${submitRes.status})`);
  const { request_id } = await submitRes.json();

  const maxWait = 300000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${base}/requests/${request_id}/status`, { headers: { Authorization: `Key ${apiKey}` } });
    if (!res.ok) continue;
    const d = await res.json();
    if (d.status === "COMPLETED") {
      const rr = await fetch(`${base}/requests/${request_id}`, { headers: { Authorization: `Key ${apiKey}` } });
      const rd = await rr.json();
      if (!rd.video?.url) throw new Error("No video URL");
      const vr = await fetch(rd.video.url);
      return Buffer.from(await vr.arrayBuffer());
    }
    if (d.status === "FAILED") throw new Error("Fal.ai failed");
  }
  throw new Error("Fal.ai timed out");
}
