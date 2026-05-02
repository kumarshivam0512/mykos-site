import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt } from "@/lib/prompts/prompt-engine";

export async function generateImageFal(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  characterDescription?: string
): Promise<Buffer> {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_KEY not configured");

  const prompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, hasProductImage, characterDescription);

  const res = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_images: 1,
    }),
  });

  if (!res.ok) throw new Error(`Fal.ai error: ${res.status}`);

  const data = await res.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("No image returned from Fal.ai");

  const imageRes = await fetch(imageUrl);
  const arrayBuffer = await imageRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
