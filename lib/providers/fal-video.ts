import type { Scene } from "@/lib/types";

// ─── Multi-provider video generation (Replicate or Fal.ai) ──────

function buildMotionPrompt(scene: Scene): string {
  const parts = [
    scene.visualPrompt,
    `camera: ${scene.cameraAngle}`,
    scene.motion !== "static" ? `motion: ${scene.motion}` : "",
    `lighting: ${scene.lighting}`,
    "smooth cinematic camera movement, professional commercial",
  ];
  return parts.filter(Boolean).join(", ");
}

export async function generateVideoClip(
  imageUrl: string,
  scene: Scene,
  duration: number = 5
): Promise<Buffer> {
  // Priority: Higgsfield > Replicate > Fal.ai
  if (process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET) {
    return generateViaHiggsfield(imageUrl, scene, duration);
  }
  if (process.env.REPLICATE_API_TOKEN) {
    return generateViaReplicate(imageUrl, scene);
  }
  if (process.env.FAL_KEY) {
    return generateViaFal(imageUrl, scene, duration);
  }
  throw new Error("No video API key configured. Add HIGGSFIELD_KEY+HIGGSFIELD_SECRET, REPLICATE_API_TOKEN, or FAL_KEY to .env.local");
}

// ─── Higgsfield (Kling 2.1 Pro i2v) ──────────────────────────────

async function generateViaHiggsfield(
  imageUrl: string,
  scene: Scene,
  duration: number
): Promise<Buffer> {
  const apiKey = process.env.HIGGSFIELD_KEY!;
  const apiSecret = process.env.HIGGSFIELD_SECRET!;
  const prompt = buildMotionPrompt(scene);

  const submitRes = await fetch("https://platform.higgsfield.ai/kling-video/v2.1/pro/image-to-video", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}:${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      duration: String(Math.min(duration, 10)),
      aspect_ratio: "16:9",
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield submit failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;
  if (!requestId) throw new Error("No request_id from Higgsfield");

  // Poll for completion
  const statusUrl = `https://platform.higgsfield.ai/requests/${requestId}/status`;
  const resultUrl = `https://platform.higgsfield.ai/requests/${requestId}`;
  const maxWait = 300000;
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}:${apiSecret}` },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();

    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}:${apiSecret}` },
      });
      if (!resultRes.ok) throw new Error("Failed to fetch Higgsfield result");
      const resultData = await resultRes.json();
      const videoUrl = resultData.video?.url;
      if (!videoUrl) throw new Error("No video URL in Higgsfield result");

      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Failed to download video from Higgsfield");
      return Buffer.from(await videoRes.arrayBuffer());
    }

    if (statusData.status === "FAILED") {
      throw new Error("Higgsfield video generation failed");
    }
  }

  throw new Error("Higgsfield video generation timed out (5 minutes)");
}

// ─── Replicate (Wan 2.2 i2v — ~$0.05/video) ──────────────────────

async function generateViaReplicate(
  imageUrl: string,
  scene: Scene
): Promise<Buffer> {
  const apiToken = process.env.REPLICATE_API_TOKEN!;
  const prompt = buildMotionPrompt(scene);

  const submitRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "wan-video/wan-2.2-i2v-fast",
      input: {
        prompt,
        first_frame_image: imageUrl,
      },
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Replicate submit failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const predictionId = submitData.id;
  if (!predictionId) throw new Error("No prediction ID from Replicate");

  const pollUrl = `https://api.replicate.com/v1/predictions/${predictionId}`;
  const maxWait = 300000;
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();

    if (statusData.status === "succeeded") {
      const videoUrl = typeof statusData.output === "string"
        ? statusData.output
        : statusData.output?.[0];
      if (!videoUrl) throw new Error("No video URL in Replicate output");

      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Failed to download video from Replicate");
      return Buffer.from(await videoRes.arrayBuffer());
    }

    if (statusData.status === "failed" || statusData.status === "canceled") {
      throw new Error(`Replicate video ${statusData.status}: ${statusData.error || "unknown"}`);
    }
  }

  throw new Error("Replicate video generation timed out (5 minutes)");
}

// ─── Fal.ai (Kling 2.5 i2v — $0.07/sec) ─────────────────────────

const FAL_QUEUE_URL = "https://queue.fal.run/fal-ai/kling-video/v2/master/image-to-video";

async function generateViaFal(
  imageUrl: string,
  scene: Scene,
  duration: number
): Promise<Buffer> {
  const apiKey = process.env.FAL_KEY!;
  const prompt = buildMotionPrompt(scene);

  const submitRes = await fetch(FAL_QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      duration: String(duration),
      aspect_ratio: "16:9",
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Fal.ai submit failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;
  if (!requestId) throw new Error("No request_id returned from Fal.ai");

  const statusUrl = `${FAL_QUEUE_URL}/requests/${requestId}/status`;
  const resultUrl = `${FAL_QUEUE_URL}/requests/${requestId}`;
  const maxWait = 300000;
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();

    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      if (!resultRes.ok) throw new Error("Failed to fetch Fal.ai result");
      const resultData = await resultRes.json();
      const videoUrl = resultData.video?.url;
      if (!videoUrl) throw new Error("No video URL in Fal.ai result");

      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Failed to download video from Fal.ai");
      return Buffer.from(await videoRes.arrayBuffer());
    }

    if (statusData.status === "FAILED") {
      throw new Error("Fal.ai video generation failed");
    }
  }

  throw new Error("Fal.ai video generation timed out (5 minutes)");
}
