// ─── Model-Specific Prompt Optimization ──────────────────────────
// Takes a generic prompt from prompt-engine.ts and adds model-specific
// instructions/keywords to unlock that model's unique capabilities.
//
// The base prompt stays compatible across all providers — this layer
// is purely additive, so if optimization fails, the base prompt still works.

import type { RealismSettings } from "@/lib/prompts/prompt-engine";

export type TargetModel =
  | "z-image-turbo"
  | "nano-banana-2"
  | "nano-banana-pro"
  | "nano-banana-2-edit"
  | "nano-banana-pro-edit"
  | "seedream-v4-edit"
  | "wan-2.2"
  | "kling-3.0"
  | "seedance-2.0"
  | "seedance-2.0-ref"
  | "higgsfield-soul"
  | "higgsfield-kling-2.1"
  | "generic";

/**
 * Append model-specific guidance to a base prompt.
 * The base prompt should already be a complete generic prompt from prompt-engine.ts.
 */
export function optimizePromptForModel(basePrompt: string, model: TargetModel, realism?: RealismSettings): string {
  switch (model) {
    case "nano-banana-pro":
    case "nano-banana-2": {
      // Google Nano Banana models: instruction-following photoreal, multi-image fusion,
      // sharp typography. They respond well to natural-language editing instructions.
      const cues = [
        "rendered with photographic accuracy",
        "preserve fine details like skin pores, fabric weave, surface micro-texture",
        "sharp typography if any text is present",
      ];
      if (realism?.depthOfField) cues.push("genuine optical depth of field with proper bokeh falloff");
      if (realism?.skinDetail) cues.push("realistic human skin including subsurface scattering");
      return `${basePrompt}\n\nModel guidance: ${cues.join(". ")}.`;
    }

    case "nano-banana-pro-edit":
    case "nano-banana-2-edit": {
      // Edit mode: explicitly instruct the model how to handle multi-reference fusion
      return `${basePrompt}\n\nEdit instructions: Treat the provided reference images as ground truth. Render every visual element to match the references exactly — same character face, same product appearance, same logo style. Do not invent new variations of these elements. Compose them naturally into the scene described above.`;
    }

    case "seedream-v4-edit": {
      // ByteDance Seedream V4 Edit: image-to-image, single ref
      return `${basePrompt}\n\nReference instruction: Preserve the subject and key visual elements from the reference image while transforming the scene to match the prompt above.`;
    }

    case "z-image-turbo": {
      // Z-Image Turbo: fast, lower quality — keep prompt short, emphasize key visuals
      // Truncate to ~500 chars and prepend the most important elements
      const lines = basePrompt.split(",").map((s) => s.trim());
      const essential = lines.slice(0, 8).join(", "); // keep top 8 weighted elements
      return essential;
    }

    case "seedance-2.0":
    case "seedance-2.0-ref": {
      // Seedance 2.0: cinematic, supports genre + director-level camera control
      // Maps mood to genre when possible
      const genre = detectGenreFromPrompt(basePrompt);
      const cues = [
        `cinematic ${genre} genre`,
        "real-world physics and natural motion",
        "broadcast-quality color grade",
      ];
      if (realism?.naturalMotion) cues.push("micro-motion in ambient elements: hair wisps, fabric edges, dust particles");
      return `${basePrompt}\n\nCinematic direction: ${cues.join(". ")}.`;
    }

    case "kling-3.0": {
      // Kling 3.0: fluid motion, native audio generation, multi-shot support
      return `${basePrompt}\n\nMotion direction: smooth fluid camera movement, natural physical motion that respects gravity and momentum, consistent lighting throughout the clip.`;
    }

    case "wan-2.2": {
      // Wan 2.2 Ultra Fast: budget model, prefers concise prompts
      const lines = basePrompt.split("\n");
      return lines.slice(0, 6).join("\n"); // truncate to first 6 lines
    }

    case "higgsfield-soul":
    case "higgsfield-kling-2.1":
    case "generic":
    default:
      return basePrompt;
  }
}

/**
 * Simple heuristic to infer Seedance "genre" from prompt content.
 * Seedance 2.0 accepts: auto, action, horror, comedy, noir, drama, epic
 */
function detectGenreFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(noir|moody|shadow|dark alley|smoke)/.test(lower)) return "noir";
  if (/(action|chase|run|fight|dynamic|fast)/.test(lower)) return "action";
  if (/(epic|grand|sweeping|landscape|aerial|drone)/.test(lower)) return "epic";
  if (/(playful|fun|comedy|bright|cheerful)/.test(lower)) return "comedy";
  if (/(drama|emotive|intimate|portrait)/.test(lower)) return "drama";
  return "auto"; // safe default
}
