import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";

// ─── Unified Prompt Engine ───────────────────────────────────────
// Single source of truth for ALL image and video prompts.
// Uses full brief context: scene, camera settings, ad format, brand kit.

const FORMAT_STYLES: Record<AdFormat, { visual: string; mood: string }> = {
  cinematic_lifestyle: {
    visual: "cinematic commercial photography, emotional storytelling, human subjects in aspirational settings",
    mood: "warm, emotive, aspirational, shallow depth of field with beautiful bokeh",
  },
  animated_explainer: {
    visual: "clean modern product photography, minimalist composition, technology-forward aesthetic",
    mood: "professional, trustworthy, clean, bright and airy",
  },
  product_showcase: {
    visual: "premium product photography, studio-lit hero shot, dramatic lighting on product",
    mood: "luxurious, premium, detailed, tactile textures visible",
  },
  testimonial_ugc: {
    visual: "authentic casual photography, natural unposed moments, real-world settings",
    mood: "relatable, genuine, warm, everyday life context",
  },
  minimalist_editorial: {
    visual: "high-fashion editorial photography, generous negative space, restrained color palette",
    mood: "sophisticated, understated, elegant, gallery-quality composition",
  },
  energetic_sports: {
    visual: "dynamic action photography, bold colors, high-energy movement captured mid-action",
    mood: "powerful, motivational, intense, peak performance",
  },
};

// ─── Image Prompt Builder ────────────────────────────────────────

export function buildImagePrompt(
  scene: Scene,
  brandKit: BrandKit,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean
): string {
  const lines: string[] = [];
  const style = adFormat ? FORMAT_STYLES[adFormat] : null;

  // 1. Style anchor
  lines.push(style ? style.visual : "Professional commercial advertising photography");

  // 2. Scene description
  lines.push(scene.visualPrompt);

  // 3. Camera optics
  const cam: string[] = [`${scene.cameraAngle} shot`];
  if (cameraSettings?.focalLength) cam.push(`shot on ${cameraSettings.focalLength} lens`);
  if (cameraSettings?.aperture) cam.push(`${cameraSettings.aperture} aperture`);
  lines.push(cam.join(", "));

  // 4. Lighting
  lines.push(`${scene.lighting} lighting`);

  // 5. Color grading
  if (cameraSettings?.colorGrade) {
    lines.push(`${cameraSettings.colorGrade} color grade`);
  }

  // 6. Mood
  if (style) lines.push(style.mood);

  // 7. Motion hint
  if (scene.motion && scene.motion.toLowerCase() !== "static") {
    lines.push(`implied sense of ${scene.motion} — captured at the peak moment`);
  }

  // 8. Brand colors
  if (brandKit.colors.length > 0) {
    lines.push(`Color palette incorporating brand colors: ${brandKit.colors.join(", ")}`);
  }

  // 9. Product preservation
  if (hasProductImage) {
    lines.push("The product must be clearly visible, accurately represented, and the hero of the composition");
  }

  // 10. Quality
  lines.push("8K resolution, ultra-sharp detail, professional retouching, no text overlays, no watermarks");

  return lines.join(". ") + ".";
}

// ─── Video Motion Prompt Builder ─────────────────────────────────

const MOTION_MAP: Record<string, string> = {
  "static": "Camera holds perfectly steady. Only subtle ambient motion — hair sways gently, fabric shifts, light particles drift, liquid steams",
  "slow dolly forward": "Camera slowly dollies forward toward the subject, creating an intimate push-in that draws the viewer closer",
  "dolly forward": "Camera slowly dollies forward toward the subject, creating an intimate push-in that draws the viewer closer",
  "dolly": "Camera performs a smooth dolly movement, gliding forward to reveal detail",
  "push in": "Camera pushes in slowly and steadily toward the hero product, magnifying its presence",
  "push": "Camera pushes in slowly and steadily toward the hero product, magnifying its presence",
  "pull back": "Camera pulls back smoothly and gradually, revealing the full scene and broader context",
  "pull": "Camera pulls back smoothly and gradually, revealing the full scene and broader context",
  "reveal": "Camera pulls back to reveal the complete scene in a dramatic unveiling motion",
  "orbit": "Camera smoothly orbits around the subject in a 90-degree arc, showcasing it from multiple angles with consistent lighting",
  "arc": "Camera arcs around the subject, creating a dynamic perspective shift while keeping the subject centered",
  "pan": "Camera pans slowly from left to right in a controlled horizontal sweep, revealing the scene progressively",
  "pan left": "Camera pans from right to left, following the scene's natural flow",
  "pan right": "Camera pans from left to right, following the scene's natural flow",
  "tilt": "Camera tilts smoothly upward, transitioning from ground-level detail to the wider environment",
  "tilt up": "Camera tilts smoothly upward, transitioning from product detail to the wider scene",
  "tilt down": "Camera tilts downward, descending from wide environment to focus on the product",
  "crane": "Camera cranes upward in a grand sweeping motion, elevating from subject level to an aerial perspective",
  "crane up": "Camera cranes upward in a grand sweeping motion, elevating the perspective dramatically",
  "handheld": "Handheld camera with natural, organic micro-movements adds authenticity and energy to the shot",
  "tracking": "Camera tracks alongside the subject with smooth lateral movement, maintaining consistent framing",
  "handheld tracking": "Handheld camera gently tracks the subject with natural micro-movements and organic energy",
  "zoom": "Smooth optical zoom into the subject, drawing the viewer's eye to the key details and textures",
  "slow zoom": "Very slow, almost imperceptible zoom drawing the viewer deeper into the scene",
  "zoom in": "Smooth zoom pushing into the subject to highlight key details",
  "zoom out": "Smooth zoom pulling out to reveal the broader scene context",
  "rotation": "Subject slowly rotates (or camera rotates around subject), showcasing the product from all angles",
  "360": "Full 360-degree rotation around the subject, showcasing every angle and detail",
  "slow motion": "Scene plays in cinematic slow motion, emphasizing every detail of the motion and texture",
};

export function buildVideoPrompt(
  scene: Scene,
  cameraSettings?: CameraSettings,
  adFormat?: AdFormat,
  hasProductImage?: boolean
): string {
  const lines: string[] = [];
  const style = adFormat ? FORMAT_STYLES[adFormat] : null;

  // 1. Scene description
  lines.push(scene.visualPrompt);

  // 2. Camera motion — intelligent mapping
  const motionLower = (scene.motion || "static").toLowerCase().trim();
  lines.push(findBestMotionMatch(motionLower));

  // 3. Shot framing
  lines.push(`Shot framing: ${scene.cameraAngle}`);

  // 4. Lighting
  lines.push(`Lighting: ${scene.lighting}`);

  // 5. Lens character
  if (cameraSettings?.focalLength) {
    lines.push(`Lens: ${cameraSettings.focalLength} — ${getLensCharacter(cameraSettings.focalLength)}`);
  }

  // 6. Color mood
  if (cameraSettings?.colorGrade) {
    lines.push(`Color mood: ${cameraSettings.colorGrade}`);
  }

  // 7. Product preservation
  if (hasProductImage) {
    lines.push(
      "CRITICAL INSTRUCTION: The product shown in this image is the hero subject. " +
      "It MUST remain completely unchanged throughout — " +
      "exact same shape, colors, logo placement, text, packaging, and proportions. " +
      "Do NOT morph, warp, redesign, recolor, or obscure any part of the product. " +
      "The product must be clearly recognizable as identical to the input image in every frame."
    );
  }

  // 8. Style from ad format
  if (style) {
    lines.push(`Visual style: ${style.mood}`);
  }

  // 9. Quality constraints
  lines.push(
    "Output quality: Professional cinematic commercial. " +
    "Smooth 24fps-quality motion with no sudden jumps, frame skips, or warping artifacts. " +
    "Photorealistic rendering with natural physics — gravity, fabric drape, liquid behavior, light refraction all physically accurate."
  );

  return lines.join(". ");
}

// ─── End Card Prompt ─────────────────────────────────────────────

export function buildEndCardPrompt(
  productName: string,
  tagline: string,
  brandKit: BrandKit,
  adFormat?: AdFormat
): string {
  const style = adFormat ? FORMAT_STYLES[adFormat] : null;
  const parts = [
    "Minimalist advertising end card design",
    `Hero product: ${productName}`,
    `Tagline: "${tagline}"`,
    "Clean, centered typography composition",
    style ? `Style: ${style.mood}` : "Dark elegant background",
  ];

  if (brandKit.colors.length > 0) {
    parts.push(`Accent colors: ${brandKit.colors.join(", ")}`);
  }

  parts.push("Professional quality, no placeholder text, ready for commercial use");
  return parts.join(". ") + ".";
}

// ─── Helpers ─────────────────────────────────────────────────────

function findBestMotionMatch(motion: string): string {
  if (MOTION_MAP[motion]) return MOTION_MAP[motion];
  for (const [key, desc] of Object.entries(MOTION_MAP)) {
    if (motion.includes(key) || key.includes(motion)) return desc;
  }
  if (motion && motion !== "static") {
    return `Camera movement: ${motion}. Executed smoothly and cinematically with no sudden changes.`;
  }
  return MOTION_MAP["static"];
}

function getLensCharacter(focalLength: string): string {
  const mm = parseInt(focalLength);
  if (isNaN(mm)) return "natural perspective";
  if (mm <= 24) return "wide-angle, environmental context, dramatic space";
  if (mm <= 35) return "natural wide, slight environmental context";
  if (mm <= 50) return "natural human-eye perspective, balanced";
  if (mm <= 85) return "portrait compression, subject isolation, creamy bokeh";
  if (mm <= 135) return "telephoto, strong subject isolation";
  return "extreme telephoto, heavy background compression";
}
