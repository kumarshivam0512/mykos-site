// ─── Motion Descriptions for Video Studio ────────────────────────
// Auto-fill per-scene motion direction (the textarea under each scene card
// in Video Studio) based on the scene image, the chosen camera move, and
// optional context (voiceover line for that scene, brief sceneBackdrop /
// characterSheet).
//
// One Gemini Flash Lite call per batch — returns a motionPrompt string per
// scene index. The user can still edit each line after.

import { GoogleGenerativeAI, type Schema, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface MotionFillScene {
  index: number;
  cameraMove: string;       // user-chosen — must be respected (e.g. "push in")
  duration: number;         // seconds
  /** Optional voiceover line for this scene — keeps motion in sync with VO. */
  voiceoverText?: string;
  /** Optional setting / character action from Scene Builder for grounding. */
  sceneContext?: string;
}

export interface MotionFillParams {
  scenes: MotionFillScene[];
  /** Shared brand / product context so motions stay on-brand. */
  brandName?: string;
  productDescription?: string;
  sceneBackdrop?: string;
  characterSheet?: string;
}

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    motions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sceneIndex: { type: SchemaType.NUMBER },
          motionPrompt: { type: SchemaType.STRING },
        },
        required: ["sceneIndex", "motionPrompt"],
      },
    },
  },
  required: ["motions"],
};

export interface MotionFillResult {
  sceneIndex: number;
  motionPrompt: string;
}

export async function generateMotionDescriptions(params: MotionFillParams): Promise<MotionFillResult[]> {
  const { scenes, brandName, productDescription, sceneBackdrop, characterSheet } = params;

  if (!scenes.length) return [];

  const sceneSpec = scenes
    .map((s) => {
      const lines = [
        `Scene ${s.index + 1} (${s.duration}s, camera move: "${s.cameraMove}"):`,
        s.sceneContext ? `  Context: ${s.sceneContext.slice(0, 240)}` : "",
        s.voiceoverText ? `  Voiceover line for this scene: "${s.voiceoverText}"` : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  const prompt = `You are a video motion designer. For each scene below, write a SINGLE motion description (2-4 sentences) that tells the AI video model exactly how to animate the source still image.

${brandName ? `BRAND: ${brandName}` : ""}
${productDescription ? `PRODUCT: ${productDescription}` : ""}
${sceneBackdrop ? `SCENE BACKDROP (shared across all scenes): ${sceneBackdrop.slice(0, 320)}` : ""}
${characterSheet ? `CHARACTER (shared across all scenes): ${characterSheet.slice(0, 320)}` : ""}

SCENES TO ANNOTATE:

${sceneSpec}

WRITING RULES:
1. RESPECT the camera move — if it's "push in", the motion description must describe a slow forward push. If "static", describe ambient micro-motion only (steam, fabric shift, dust).
2. KEEP subject motion SMALL — the source image is a still frame; large body movements (walking, running) create artifacts. Describe only what can plausibly happen in ${scenes[0].duration} seconds without changing the composition.
3. NAME specific organic motion cues — coffee steam, a hair strand catching the breeze, fabric settling, liquid swirling, condensation forming, light flickering. These make the AI video feel alive.
4. If a voiceover line is given, pace the motion to match it — describe what visual beat happens at the start vs end of the scene.
5. NO camera-move jargon ("dolly", "crane") — use plain language ("camera glides forward", "camera holds steady").
6. NO product hype, NO brand mentions in the motion prompt itself — just visual direction.
7. 2-4 sentences per scene, ~30-60 words each.

Return JSON with one entry per scene in the input order.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as { motions: MotionFillResult[] };
  return parsed.motions;
}
