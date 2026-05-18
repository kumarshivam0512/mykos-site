import type { Scene, BrandKit, CameraSettings, AdFormat } from "@/lib/types";

// ─── Ultra-Realism Settings ─────────────────────────────────────
// Based on cinematic production techniques (Steven Wommack's 4-step workflow,
// robotbuilders.net guide, Dreamina best practices):
// Real cameras have imperfections. Real scenes have atmospheric effects.
// Real skin has pores. Real surfaces have wear. Enabling these cues
// breaks the "AI look" and pushes output toward photorealism.

export interface RealismSettings {
  filmGrain: boolean;
  lensImperfections: boolean;
  depthOfField: boolean;
  atmosphericEffects: boolean;
  skinDetail: boolean;
  environmentalDetail: boolean;
  naturalMotion: boolean;
  imperfectComposition: boolean;
}

function buildRealismBooster(r: RealismSettings): string {
  const cues: string[] = [];

  if (r.filmGrain) {
    cues.push("subtle 35mm film grain texture, slight color noise in shadows");
  }
  if (r.lensImperfections) {
    cues.push("mild chromatic aberration on edges, natural vignetting, subtle lens flare from light sources");
  }
  if (r.depthOfField) {
    cues.push("shallow depth of field with natural bokeh circles on background, foreground elements slightly soft");
  }
  if (r.atmosphericEffects) {
    cues.push("visible fine dust particles in light beams, faint atmospheric haze, volumetric light rays");
  }
  if (r.skinDetail) {
    cues.push("visible skin pores, fine facial hair, natural skin blemishes and uneven tone, fabric weave texture visible");
  }
  if (r.environmentalDetail) {
    cues.push("surface micro-scratches, fingerprints on glass, water stains, natural patina and wear on materials, scuff marks on floor");
  }
  if (r.naturalMotion) {
    cues.push("hair wisps floating, fabric edge settling, subtle breathing motion, ambient environmental micro-movement");
  }
  if (r.imperfectComposition) {
    cues.push("composed with rule-of-thirds tension, slightly off-center framing, natural asymmetry");
  }

  return cues.join(", ");
}

function buildRealismNegatives(r: RealismSettings): string {
  const negs: string[] = [];

  if (r.skinDetail) {
    negs.push("no plastic skin, no airbrushed complexion, no unnaturally smooth faces");
  }
  if (r.depthOfField) {
    negs.push("no uniformly sharp everything-in-focus look");
  }
  if (r.environmentalDetail) {
    negs.push("no brand-new pristine surfaces, no unrealistically clean environments");
  }
  if (r.filmGrain || r.lensImperfections) {
    negs.push("no digitally perfect noise-free rendering");
  }

  return negs.join(", ");
}

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
  characterSheet?: string,
  realism?: RealismSettings,
  /** Aspect ratio of the target frame — drives composition language so vertical
   *  outputs aren't just cropped landscapes. */
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:5"
): string {
  const lines: string[] = [];
  const isAnimated = adFormat === "animated_explainer";

  // 1. Image type / medium (FRONT-LOADED — highest weight)
  lines.push(FORMAT_IMAGE_TYPE[adFormat || "cinematic_lifestyle"] || "professional commercial photography");

  // 1a. Aspect-aware composition cue (BEFORE subject — heavy weight).
  // Models compose differently for vertical / square / landscape. Without this
  // they default to landscape composition and the subject gets cropped on 9:16.
  if (aspectRatio === "9:16") {
    lines.push("vertical 9:16 composition for mobile / Reels / TikTok / Shorts: portrait orientation, subject centred and full-body or head-and-shoulders, important elements in the central vertical strip, generous safe area top and bottom for captions and UI");
  } else if (aspectRatio === "1:1") {
    lines.push("square 1:1 composition for Instagram feed: subject centred, balanced composition with equal weight on all sides, no important elements at the very edges");
  } else if (aspectRatio === "4:5") {
    lines.push("vertical 4:5 composition for Facebook / Instagram tall feed: portrait orientation with slightly more headroom than 9:16, subject centred");
  }
  // 16:9 is the model default — no extra cue needed.

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

  // 9.5. Ultra-realism boosters (placed AFTER quality, BEFORE negatives — high weight zone)
  if (realism) {
    const booster = buildRealismBooster(realism);
    if (booster) lines.push(booster);
  }

  // 10. Negative
  const extraNegs = realism ? buildRealismNegatives(realism) : "";
  const fullNeg = extraNegs ? `${NEGATIVE_BLOCK}, ${extraNegs}` : NEGATIVE_BLOCK;
  lines.push(`Avoid: ${fullNeg}`);

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
  characterSheet?: string,
  realism?: RealismSettings
): string {
  const namedMove = getNamedMove(scene.motion || "push in");
  const isStatic = namedMove === "camera_fixed";

  // Timeline format — Higgsfield reads this best
  const lines: string[] = [];

  lines.push(`Shot intent: ${scene.visualPrompt.substring(0, 100)}`);
  lines.push("");

  // Time beats — scaled to the scene's actual duration. A 12s luxury hero shot
  // needs more breathing room than a 5s clip; hardcoding 0-1/1-4/4-5 makes
  // long clips feel back-loaded with dead air.
  const dur = Math.max(1, scene.duration || 5);
  const openEnd = (dur * 0.2).toFixed(1);     // first 20%: hold opening frame
  const moveEnd = (dur * 0.8).toFixed(1);     // next 60%: camera move / ambient motion
  const closeStart = moveEnd;                 // last 20%: settle
  const closeEnd = dur.toFixed(1);

  if (isStatic) {
    lines.push(`0-${openEnd}s: Frame as shown in source image, subject settled`);
    lines.push(`${openEnd}-${moveEnd}s: Subtle ambient motion only — fabric shifts, light plays, atmosphere breathes`);
    lines.push(`${closeStart}-${closeEnd}s: Hold on the composition, natural settling`);
  } else {
    lines.push(`0-${openEnd}s: Opening frame as shown in source image`);
    lines.push(`${openEnd}-${moveEnd}s: Camera performs ${namedMove.replace(/-/g, " ")}; subject has minimal controlled movement`);
    lines.push(`${closeStart}-${closeEnd}s: Camera settles, composition resolves`);
  }

  lines.push("");
  lines.push(`Camera: ${namedMove.replace(/-/g, " ")}`);
  lines.push(`Subject motion: ${describeSubjectMotion(scene)}`);
  lines.push("Lighting: stable from source frame, no changes");

  // Product preservation (keep minimal in video prompt)
  if (hasProductImage) {
    lines.push("Product: must remain sharp, unwarped, and recognizable in every frame");
  }

  // Ultra-realism video cues
  if (realism) {
    const videoCues: string[] = [];
    if (realism.naturalMotion) {
      videoCues.push("Add subtle natural micro-motion: hair wisps floating, fabric edges settling, ambient dust particles drifting");
    }
    if (realism.atmosphericEffects) {
      videoCues.push("Maintain atmospheric haze and volumetric light throughout motion");
    }
    if (realism.filmGrain) {
      videoCues.push("Consistent film grain texture across all frames");
    }
    if (videoCues.length) lines.push(videoCues.join(". "));
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
