import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";
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
  hasProductImage?: boolean
): Promise<Buffer> {
  const errors: string[] = [];

  // 1. Pollinations (free, no key needed)
  try {
    return await generateImage(scene, brandKit, width, height, seed, cameraSettings, adFormat, hasProductImage);
  } catch (err) {
    const msg = (err as Error).message;
    errors.push(`Pollinations: ${msg}`);
    console.warn("Pollinations failed:", msg);
  }

  // 2. Replicate FLUX Schnell (fast, $0.003/image)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      return await generateImageReplicate(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage);
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Replicate: ${msg}`);
      console.warn("Replicate image failed:", msg);
    }
  }

  // 3. Gemini image (requires billing, ~$0.04/image)
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateImageGemini(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage);
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Gemini: ${msg}`);
      console.warn("Gemini image failed:", msg);
    }
  }

  // 4. Fal.ai (requires FAL_KEY)
  if (process.env.FAL_KEY) {
    try {
      return await generateImageFal(scene, brandKit, width, height, cameraSettings, adFormat, hasProductImage);
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`Fal.ai: ${msg}`);
      console.warn("Fal.ai failed:", msg);
    }
  }

  throw new Error(`All image providers failed:\n${errors.join("\n")}`);
}
