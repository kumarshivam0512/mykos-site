import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt } from "@/lib/prompts/prompt-engine";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function generateImage(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576,
  seed?: number,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean
): Promise<Buffer> {
  const prompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, hasProductImage);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model: "flux",
    nologo: "true",
    ...(seed !== undefined && { seed: String(seed) }),
  });

  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params}`;

  // Retry up to 3 times with exponential backoff (Pollinations rate-limits aggressively)
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.status === 429) {
        clearTimeout(timeout);
        console.warn(`Pollinations 429, retrying in ${3 * (attempt + 1)}s...`);
        continue;
      }
      if (!res.ok) throw new Error(`Pollinations error: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === 2) throw err;
      console.warn(`Pollinations attempt ${attempt + 1} failed, retrying...`);
    }
  }
  throw new Error("Pollinations: all retries exhausted");
}
