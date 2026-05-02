import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt } from "@/lib/prompts/prompt-engine";

export async function generateImageReplicate(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean
): Promise<Buffer> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN not configured");

  const prompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, hasProductImage);

  // Submit prediction
  const submitRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt,
        go_fast: true,
        num_outputs: 1,
        aspect_ratio: getAspectString(width, height),
        output_format: "png",
        output_quality: 90,
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

  // Poll for completion (FLUX Schnell is fast, ~3-10s)
  const pollUrl = `https://api.replicate.com/v1/predictions/${predictionId}`;
  const maxWait = 60000;
  const pollInterval = 2000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();

    if (statusData.status === "succeeded") {
      const imageUrl = Array.isArray(statusData.output)
        ? statusData.output[0]
        : statusData.output;
      if (!imageUrl) throw new Error("No image URL in Replicate output");

      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) throw new Error("Failed to download image from Replicate");
      return Buffer.from(await imageRes.arrayBuffer());
    }

    if (statusData.status === "failed" || statusData.status === "canceled") {
      throw new Error(`Replicate image ${statusData.status}: ${statusData.error || "unknown"}`);
    }
  }

  throw new Error("Replicate image generation timed out");
}

function getAspectString(width: number, height: number): string {
  if (width === height) return "1:1";
  if (width > height) return "16:9";
  return "9:16";
}
