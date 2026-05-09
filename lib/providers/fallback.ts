import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
import type { RealismSettings } from "@/lib/prompts/prompt-engine";
import { generateImageHiggsfield } from "./higgsfield-image";
import { generateImage } from "./pollinations";
import { generateImageReplicate } from "./replicate-image";
import { generateImageGemini } from "./gemini-image";
import { generateImageFal } from "./fal";

export async function generateImageWithFallback(
  scene: Scene,
  brandKit: BrandKit,
  width = 1024,
  height = 576,
  seed?: number,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string,
  realism?: RealismSettings
): Promise<Buffer> {
  const errors: string[] = [];

  // 1. Higgsfield Soul 2.0 (best quality, uses same API key as video)
  if (process.env.HIGGSFIELD_KEY && process.env.HIGGSFIELD_SECRET) {
    try {
      const result = await generateImageHiggsfield(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism);
      return result.buffer;
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Higgsfield: ${msg}`);
      console.warn("Higgsfield image failed:", msg);
    }
  }

  // 2. Pollinations (free, no key needed)
  try {
    return await generateImage(scene, brandKit, width, height, seed, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism);
  } catch (err) {
    const msg = (err as Error).message;
    errors.push(`Pollinations: ${msg}`);
    console.warn("Pollinations failed:", msg);
  }

  // 2. Replicate FLUX Schnell (fast, $0.003/image)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      return await generateImageReplicate(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism);
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Replicate: ${msg}`);
      console.warn("Replicate image failed:", msg);
    }
  }

  // 3. Gemini image (requires billing, ~$0.04/image)
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateImageGemini(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism);
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Gemini: ${msg}`);
      console.warn("Gemini image failed:", msg);
    }
  }

  // 4. Fal.ai (requires FAL_KEY)
  if (process.env.FAL_KEY) {
    try {
      return await generateImageFal(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage, sceneBackdrop, characterSheet, realism);
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Fal.ai: ${msg}`);
      console.warn("Fal.ai failed:", msg);
    }
  }

  throw new Error(`All image providers failed:\n${errors.join("\n")}`);
}
