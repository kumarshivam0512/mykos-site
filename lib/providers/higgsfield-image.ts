import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt } from "@/lib/prompts/prompt-engine";

export async function generateImageHiggsfield(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  characterDescription?: string
): Promise<Buffer> {
  const apiKey = process.env.HIGGSFIELD_KEY;
  const apiSecret = process.env.HIGGSFIELD_SECRET;
  if (!apiKey || !apiSecret) throw new Error("HIGGSFIELD_KEY and HIGGSFIELD_SECRET required");

  const prompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, hasProductImage, characterDescription);
  const aspectRatio = getAspectRatio(width, height);

  // Submit to Higgsfield Soul 2.0
  const submitRes = await fetch("https://platform.higgsfield.ai/higgsfield-ai/soul/standard", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}:${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield Soul failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();

  // Check if images returned directly (some models return immediately)
  if (submitData.images?.[0]?.url) {
    const imgRes = await fetch(submitData.images[0].url);
    if (!imgRes.ok) throw new Error("Failed to download image from Higgsfield");
    return Buffer.from(await imgRes.arrayBuffer());
  }

  // Otherwise poll for completion
  const requestId = submitData.request_id;
  if (!requestId) throw new Error("No request_id from Higgsfield Soul");

  const maxWait = 300000; // 5 min max
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    // Poll every 3s for first 30s, then every 5s
    const elapsed = Date.now() - startTime;
    const interval = elapsed < 30000 ? 3000 : 5000;
    await new Promise((r) => setTimeout(r, interval));

    try {
      const statusRes = await fetch(`https://platform.higgsfield.ai/requests/${requestId}/status`, {
        headers: { Authorization: `Key ${apiKey}:${apiSecret}` },
      });
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = (statusData.status || "").toUpperCase();
      console.log(`[Higgsfield Image] Status: ${statusData.status} (${Math.round(elapsed/1000)}s)`);

      if (status === "COMPLETED") {
        // Image URL may be in the status response itself
        console.log("[Higgsfield Image] Status response:", JSON.stringify(statusData).substring(0, 500));

        // Try extracting image URL from status response first
        const imageUrl = statusData.images?.[0]?.url
          || statusData.image?.url
          || statusData.output?.url
          || statusData.response_url
          || (typeof statusData.output === "string" ? statusData.output : null);

        if (imageUrl) {
          console.log("[Higgsfield Image] Downloading from status response:", imageUrl.substring(0, 100));
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status})`);
          return Buffer.from(await imgRes.arrayBuffer());
        }

        // Fallback: try fetching result from /requests/{id} endpoint
        const resultRes = await fetch(`https://platform.higgsfield.ai/requests/${requestId}`, {
          headers: { Authorization: `Key ${apiKey}:${apiSecret}` },
        });
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          console.log("[Higgsfield Image] Result data:", JSON.stringify(resultData).substring(0, 500));
          const url = resultData.images?.[0]?.url || resultData.image?.url || resultData.output?.url;
          if (url) {
            const imgRes = await fetch(url);
            if (!imgRes.ok) throw new Error("Failed to download image");
            return Buffer.from(await imgRes.arrayBuffer());
          }
        }

        throw new Error("No image URL found in Higgsfield response");
      }

      if (status === "FAILED") {
        throw new Error("Higgsfield image generation failed");
      }
    } catch (err) {
      const msg = (err as Error).message || "";
      // Re-throw actual failures, only retry on network errors
      if (msg.toLowerCase().includes("failed") || msg.includes("No image")) throw err;
      console.warn("[Higgsfield Image] Poll error (retrying):", msg);
    }
  }

  throw new Error("Higgsfield image generation timed out (5 min)");
}

function getAspectRatio(width: number, height: number): string {
  if (width === height) return "1:1";
  if (width === 576 && height === 1024) return "9:16";
  if (width === 819 && height === 1024) return "4:5";
  return "16:9";
}
