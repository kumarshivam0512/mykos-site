import type { Scene, BrandKit, CameraSettings } from "@/lib/types";

export function buildImagePrompt(
  scene: Scene,
  brandKit: BrandKit,
  cameraSettings: CameraSettings,
  adStyle: string
): string {
  const parts: string[] = [];

  // Core visual
  parts.push("photorealistic commercial advertising photography");
  parts.push(scene.visualPrompt);

  // Camera
  parts.push(`${scene.cameraAngle}`);
  if (cameraSettings.focalLength) parts.push(`${cameraSettings.focalLength} lens`);
  if (cameraSettings.aperture) parts.push(`${cameraSettings.aperture} aperture`);

  // Lighting & mood
  parts.push(`${scene.lighting}`);
  if (cameraSettings.colorGrade) parts.push(`${cameraSettings.colorGrade} color grade`);

  // Motion hint
  if (scene.motion && scene.motion !== "static") {
    parts.push(`sense of ${scene.motion}`);
  }

  // Brand colors
  if (brandKit.colors.length > 0) {
    parts.push(`brand color palette: ${brandKit.colors.join(", ")}`);
  }

  // Style modifier
  const styleMap: Record<string, string> = {
    cinematic_lifestyle: "cinematic, emotional, human-centric, warm tones",
    animated_explainer: "clean, minimal, tech-forward, flat design aesthetic",
    product_showcase: "studio lighting, product hero shot, premium feel",
    testimonial_ugc: "authentic, natural, candid, casual photography",
    minimalist_editorial: "editorial, negative space, muted elegance, soft diffusion",
    energetic_sports: "dynamic, high contrast, bold, action photography",
  };
  if (styleMap[adStyle]) parts.push(styleMap[adStyle]);

  parts.push("8K resolution, ultra sharp, professional advertising, no text overlay");

  return parts.filter(Boolean).join(", ");
}

export function buildEndCardPrompt(
  productName: string,
  tagline: string,
  brandKit: BrandKit
): string {
  const parts = [
    "minimalist advertising end card",
    `product: ${productName}`,
    `tagline: "${tagline}"`,
    "clean typography, centered composition",
    "dark elegant background",
  ];

  if (brandKit.colors.length > 0) {
    parts.push(`accent colors: ${brandKit.colors.join(", ")}`);
  }

  parts.push("professional, premium feel, 8K");
  return parts.join(", ");
}
