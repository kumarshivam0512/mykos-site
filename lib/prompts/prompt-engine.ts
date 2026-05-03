import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";

// ─── Production-Grade Prompt Engine ──────────────────────────────
// Aligned with Higgsfield Ad Prompting Playbook:
// - Image prompt owns LOOK (composition, subject, lighting, materials, mood)
// - Video prompt owns MOTION ONLY (camera move, subject action, timing)
// - One job per prompt. No re-describing identity in video.

// ─── Negative prompt block (reusable) ────────────────────────────
const NEGATIVE_BLOCK = "no text overlays, no watermarks, no warping, no distortion, no extra fingers, no extra limbs, no facial drift, no identity changes, no flickering, no plastic skin, no over-saturation, no off-brand colors, no cluttered background, no motion blur on the product";

// ─── Image type by ad format ─────────────────────────────────────
const FORMAT_IMAGE_TYPE: Record<AdFormat, string> = {
  cinematic_lifestyle: "editorial commercial photography",
  animated_explainer: "flat design 2D illustration, motion graphics style, clean geometric shapes",
  product_showcase: "studio product photography",
  testimonial_ugc: "editorial lifestyle photography",
  minimalist_editorial: "high-fashion editorial photography",
  energetic_sports: "dynamic sports commercial photography",
};

const FORMAT_MOOD: Record<AdFormat, string> = {
  cinematic_lifestyle: "warm, emotive, aspirational",
  animated_explainer: "professional, trustworthy, clean, bright pastels",
  product_showcase: "luxurious, premium, tactile textures",
  testimonial_ugc: "relatable, genuine, warm, authentic",
  minimalist_editorial: "sophisticated, understated, restrained elegance",
  energetic_sports: "powerful, motivational, high-energy",
};

// ─── IMAGE PROMPT (owns: composition, subject, lighting, mood) ──
// Order: type → subject → setting → lighting → lens → color → composition → quality
// NO camera moves. NO motion. This is a STILL frame.

export function buildImagePrompt(
  scene: Scene,
  brandKit: BrandKit,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string
): string {
  const lines: string[] = [];
  const isAnimated = adFormat === "animated_explainer";

  // 1. Image type / medium (FRONT-LOADED — highest weight)
  lines.push(FORMAT_IMAGE_TYPE[adFormat || "cinematic_lifestyle"] || "professional commercial photography");

  // 2. Subject (character + product interaction from scene)
  if (characterSheet) {
    lines.push(characterSheet);
  }
  lines.push(scene.visualPrompt);

  // 3. Setting / context (backdrop)
  if (sceneBackdrop) {
    lines.push(sceneBackdrop);
  }

  // 4. Lighting (specific setup, not just "good lighting")
  lines.push(scene.lighting);

  // 5. Lens / camera language
  const cam: string[] = [scene.cameraAngle];
  if (cameraSettings?.focalLength) cam.push(`${cameraSettings.focalLength} lens`);
  if (cameraSettings?.aperture) cam.push(`${cameraSettings.aperture}`);
  lines.push(cam.join(", "));

  // 6. Color & mood
  if (cameraSettings?.colorGrade) {
    lines.push(`${cameraSettings.colorGrade} color palette`);
  }
  lines.push(FORMAT_MOOD[adFormat || "cinematic_lifestyle"] + " mood");

  // 7. Composition / negative space
  if (hasProductImage) {
    lines.push("product centered and hero of the composition, product label faces camera, negative space for copy");
  }

  // 8. Brand colors
  if (brandKit.colors.length > 0) {
    lines.push(`brand palette: ${brandKit.colors.join(", ")}`);
  }

  // 9. Quality cues
  if (isAnimated) {
    lines.push("vector-style flat design, no photorealism, 2D motion graphics aesthetic");
  } else {
    lines.push("hyper-detailed textures, photorealistic, 4K, ultra-sharp");
  }

  // 10. Negative
  lines.push(`Avoid: ${NEGATIVE_BLOCK}`);

  return lines.join(", ");
}

// ─── VIDEO PROMPT (owns: MOTION ONLY) ────────────────────────────
// Timeline format with time beats. Single named camera move.
// NO re-describing identity — source image IS the identity.
// NO lighting/mood — locked from source frame.

// Named camera moves (use Higgsfield's vocabulary verbatim)
const NAMED_MOVES: Record<string, string> = {
  "static": "camera_fixed",
  "dolly in": "dolly-in",
  "dolly out": "dolly-out",
  "dolly forward": "dolly-in",
  "dolly left": "dolly-left",
  "dolly right": "dolly-right",
  "push in": "push-in",
  "push": "push-in",
  "pull back": "dolly-out",
  "pull": "dolly-out",
  "orbit": "orbit_360_slow",
  "360": "orbit_360_slow",
  "arc": "orbit_360_slow",
  "pan": "dolly-right",
  "pan left": "dolly-left",
  "pan right": "dolly-right",
  "tilt up": "crane-up",
  "tilt down": "crane-down",
  "tilt": "crane-up",
  "crane up": "crane-up",
  "crane down": "crane-down",
  "crane": "crane-up",
  "handheld": "handheld",
  "tracking": "dolly-right",
  "handheld tracking": "handheld",
  "zoom": "push-in",
  "zoom in": "push-in",
  "zoom out": "dolly-out",
  "slow zoom": "push-in",
  "crash zoom": "crash-zoom",
  "rotation": "orbit_360_slow",
  "slow motion": "camera_fixed",
  "reveal": "dolly-out",
  "fpv": "fpv-drone",
  "drone": "fpv-drone",
  "bullet time": "bullet-time",
};

function getNamedMove(motion: string): string {
  const lower = motion.toLowerCase().trim();
  if (NAMED_MOVES[lower]) return NAMED_MOVES[lower];
  for (const [key, val] of Object.entries(NAMED_MOVES)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return "push-in"; // safe default
}

function describeSubjectMotion(scene: Scene): string {
  // Keep subject motion SMALL — big motion breaks physics
  const motionLower = (scene.motion || "").toLowerCase();
  if (motionLower === "static" || !motionLower) {
    return "Subject holds position. Only subtle ambient motion — hair shifts, fabric settles, light plays on surfaces";
  }
  // Extract any subject action from the visual prompt (first action verb phrase)
  return "Subject performs the action described in the source frame with minimal movement — small, controlled, natural";
}

export function buildVideoPrompt(
  scene: Scene,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean,
  sceneBackdrop?: string,
  characterSheet?: string
): string {
  const namedMove = getNamedMove(scene.motion || "push in");
  const isStatic = namedMove === "camera_fixed";

  // Timeline format — Higgsfield reads this best
  const lines: string[] = [];

  lines.push(`Shot intent: ${scene.visualPrompt.substring(0, 100)}`);
  lines.push("");

  // Time beats
  if (isStatic) {
    lines.push("0-1s: Frame as shown in source image, subject settled");
    lines.push("1-4s: Subtle ambient motion only — fabric shifts, light plays, atmosphere breathes");
    lines.push("4-5s: Hold on the composition, natural settling");
  } else {
    lines.push("0-1s: Opening frame as shown in source image");
    lines.push(`1-4s: Camera performs ${namedMove.replace(/-/g, " ")}; subject has minimal controlled movement`);
    lines.push("4-5s: Camera settles, composition resolves");
  }

  lines.push("");
  lines.push(`Camera: ${namedMove.replace(/-/g, " ")}`);
  lines.push(`Subject motion: ${describeSubjectMotion(scene)}`);
  lines.push("Lighting: stable from source frame, no changes");

  // Product preservation (keep minimal in video prompt)
  if (hasProductImage) {
    lines.push("Product: must remain sharp, unwarped, and recognizable in every frame");
  }

  // Negatives
  lines.push(`Negatives: ${NEGATIVE_BLOCK}, no background chatter, no extra music`);

  return lines.join("\n");
}

// ─── End Card Prompt ─────────────────────────────────────────────

export function buildEndCardPrompt(
  productName: string,
  tagline: string,
  brandKit: BrandKit,
  adFormat?: AdFormat
): string {
  const lines = [
    "Studio product photography end card",
    `product: ${productName}`,
    `tagline text: "${tagline}"`,
    "clean centered composition, premium feel",
    adFormat ? `${FORMAT_MOOD[adFormat]} mood` : "dark elegant background",
  ];
  if (brandKit.colors.length > 0) {
    lines.push(`brand colors: ${brandKit.colors.join(", ")}`);
  }
  lines.push("professional quality, no placeholder text");
  lines.push(`Avoid: ${NEGATIVE_BLOCK}`);
  return lines.join(", ");
}
