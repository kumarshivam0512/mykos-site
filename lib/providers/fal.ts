import type { Scene, BrandKit } from "@/lib/types";

export async function generateImageFal(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576
): Promise<Buffer> {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_KEY not configured");

  const prompt = buildFalPrompt(scene, brandKit);

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

function buildFalPrompt(scene: Scene, brandKit: BrandKit): string {
  const parts = [
    "photorealistic commercial photography",
    scene.visualPrompt,
    `${scene.cameraAngle} camera angle`,
    `${scene.lighting} lighting`,
  ];

  if (brandKit.colors.length > 0) {
    parts.push(`color palette: ${brandKit.colors.join(", ")}`);
  }

  parts.push("8K, sharp detail, professional advertising");
  return parts.filter(Boolean).join(", ");
}
