import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Scene, BrandKit } from "@/lib/types";

export async function generateImageGemini(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const prompt = buildGeminiImagePrompt(scene, brandKit, width, height);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"] as unknown as undefined,
    } as Record<string, unknown>,
  });

  const parts = result.response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No response from Gemini image generation");

  for (const part of parts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inlineData = (part as any).inlineData;
    if (inlineData?.data && inlineData.mimeType?.startsWith("image/")) {
      return Buffer.from(inlineData.data, "base64");
    }
  }

  throw new Error("No image data in Gemini response");
}

function buildGeminiImagePrompt(
  scene: Scene,
  brandKit: BrandKit,
  width: number,
  height: number
): string {
  const parts = [
    `Generate a photorealistic commercial advertising photograph.`,
    `Scene: ${scene.visualPrompt}`,
    `Camera angle: ${scene.cameraAngle}`,
    `Lighting: ${scene.lighting}`,
    `Style: professional advertising photography, 8K quality, sharp detail`,
  ];

  if (brandKit.colors.length > 0) {
    parts.push(`Incorporate brand colors: ${brandKit.colors.join(", ")}`);
  }

  parts.push(`Aspect ratio: ${width}:${height}. No text overlays.`);

  return parts.join("\n");
}
