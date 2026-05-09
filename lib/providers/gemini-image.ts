import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import { buildImagePrompt, type RealismSettings } from "@/lib/prompts/prompt-engine";

export async function generateImageGemini(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const prompt = buildImagePrompt(scene, brandKit, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism);

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
