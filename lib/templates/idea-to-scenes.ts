// ─── Idea-to-Scenes Orchestrator ─────────────────────────────────
// Takes a free-text user idea + ad type + brand context, picks the best
// Golden Template, then adapts it into fully-filled Scene Builder inputs.
//
// Two Gemini calls:
//   1. Classifier (Flash Lite, ~1s) — chooses the template id
//   2. Adapter   (Flash Lite, ~3s, JSON schema) — fills every field
//
// The adapter writes:
//   - 3-4 scenes (each with mood/setting/cameraAngle/lighting/colorGrade/motion/duration/+hints)
//   - one character draft (omitted if template.needsCharacter is false)
//   - one location draft
//   - tier / realism / aspect ratio (from template defaults, can be overridden)
//   - voiceover segments paced to per-scene duration
//   - music brief + end card (tagline + CTA)
//
// Fields use the EXACT strings from app/creative/page.tsx dropdowns so the UI
// populates without manual coercion.

import { GoogleGenerativeAI, type Schema, SchemaType } from "@google/generative-ai";
import type { QualityTier } from "@/lib/types";
import type { Character } from "@/lib/db/characters";
import type { Location } from "@/lib/db/locations";
import {
  GOLDEN_TEMPLATES,
  type AdType,
  type GoldenTemplate,
  getTemplate,
  pickTemplateByKeywords,
  templateClassifierSummary,
} from "./golden-templates";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─────────────────────────────────────────────────────────────────
// Output types — what the Scene Builder receives and renders
// ─────────────────────────────────────────────────────────────────

export interface FilledScene {
  mood: string;
  setting: string;            // includes @LocationName mention
  characterAction: string;    // includes @CharacterName mention if needsCharacter
  productPlacement: string;
  cameraAngle: string;
  lighting: string;
  colorGrade: string;
  motion: string;             // camera move id
  duration: number;
}

export interface VoiceoverSegment {
  sceneIndex: number;
  text: string;
  targetWords: number;
}

export interface FilledSceneInputs {
  templateId: string;
  templateLabel: string;            // e.g. "B2B SaaS · Launch · Dark canvas product spotlight"
  referenceAds: string[];
  tier: QualityTier;
  realismPreset: "off" | "photo" | "cinematic" | "raw";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  scenes: FilledScene[];
  character?: Omit<Character, "id" | "createdAt"> | null;
  location: Omit<Location, "id" | "createdAt">;
  voiceoverScript: string;          // full concatenated text (legacy compat)
  voiceoverSegments: VoiceoverSegment[]; // per-scene segments (Phase 2)
  voiceoverStyle: string;
  musicStyle: string;
  endCardTagline: string;
  endCardCta: string;
}

// ─────────────────────────────────────────────────────────────────
// Step 1 — Classifier (picks template id)
// ─────────────────────────────────────────────────────────────────

const classifierSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    templateId: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER }, // 0-1
    reasoning: { type: SchemaType.STRING },
  },
  required: ["templateId", "confidence"],
};

async function classifyTemplate(idea: string, adType?: AdType): Promise<string> {
  // If user pinned an adType, restrict candidates to that adType only.
  const candidates = adType
    ? GOLDEN_TEMPLATES.filter((t) => t.adType === adType)
    : GOLDEN_TEMPLATES;

  // If only one candidate after filtering, skip the Gemini call entirely.
  if (candidates.length === 1) return candidates[0].id;

  const summary = (candidates.length === GOLDEN_TEMPLATES.length)
    ? templateClassifierSummary()
    : candidates
        .map((t) => `- id: "${t.id}" — ${t.vertical} · ${t.adType}. ${t.description}`)
        .join("\n");

  const prompt = `You are an ad-creative routing classifier. Pick the SINGLE BEST template id for the user's idea.

User idea: "${idea}"
${adType ? `User-pinned ad type: ${adType}` : ""}

Available templates:
${summary}

Return ONLY the template id that best matches the vertical AND ad type of the idea. Confidence should reflect how clearly the idea maps to that template's vertical and ad type. If the idea is ambiguous, prefer the more general template.`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: classifierSchema,
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { templateId: string; confidence: number };
    // Validate the id exists; if not, fall back to keyword matcher.
    if (getTemplate(parsed.templateId)) return parsed.templateId;
    console.warn(`[idea-to-scenes] classifier returned unknown id ${parsed.templateId}, falling back to keywords`);
    return pickTemplateByKeywords(idea, adType).id;
  } catch (err) {
    console.warn(`[idea-to-scenes] classifier failed, falling back to keywords:`, (err as Error).message);
    return pickTemplateByKeywords(idea, adType).id;
  }
}

// ─────────────────────────────────────────────────────────────────
// Step 2 — Adapter (fills template with product specifics)
// ─────────────────────────────────────────────────────────────────

/** Strings allowed in the Scene Builder UI dropdowns. */
const MOOD_VALUES = ["Aspirational", "Energetic", "Calm", "Luxurious", "Playful", "Gritty", "Professional", "Warm", "Dramatic", "Minimal"];
const CAMERA_ANGLE_VALUES = ["Close-up, eye-level", "Wide shot, eye-level", "Medium shot, three-quarter", "Low angle, heroic", "Overhead, top-down", "Macro detail", "Profile, side view", "Over-the-shoulder"];
const LIGHTING_VALUES = ["Golden hour backlight", "Studio softbox, key + fill", "Natural window light", "Dramatic rim light", "Neon-lit, moody", "Bright and airy", "Warm practical lamps", "Cool clinical"];
const COLOR_GRADE_VALUES = ["Warm cinematic", "Cool clinical", "Orange-teal", "Desaturated matte", "Vibrant saturated", "Warm desaturated", "Moody dark", "Bright pastel"];
const MOTION_VALUES = ["static", "push in", "dolly out", "orbit", "pan left", "pan right", "crane up", "crane down", "handheld", "drone"];

function buildAdapterSchema(needsCharacter: boolean): Schema {
  const sceneSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      mood: { type: SchemaType.STRING, format: "enum", enum: MOOD_VALUES },
      setting: { type: SchemaType.STRING },
      characterAction: { type: SchemaType.STRING },
      productPlacement: { type: SchemaType.STRING },
      cameraAngle: { type: SchemaType.STRING, format: "enum", enum: CAMERA_ANGLE_VALUES },
      lighting: { type: SchemaType.STRING, format: "enum", enum: LIGHTING_VALUES },
      colorGrade: { type: SchemaType.STRING, format: "enum", enum: COLOR_GRADE_VALUES },
      motion: { type: SchemaType.STRING, format: "enum", enum: MOTION_VALUES },
      duration: { type: SchemaType.NUMBER },
    },
    required: ["mood", "setting", "characterAction", "productPlacement", "cameraAngle", "lighting", "colorGrade", "motion", "duration"],
  };

  const characterSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      gender: { type: SchemaType.STRING },
      age: { type: SchemaType.NUMBER },
      ethnicity: { type: SchemaType.STRING },
      build: { type: SchemaType.STRING },
      face: { type: SchemaType.STRING },
      hair: { type: SchemaType.STRING },
      outfit: { type: SchemaType.STRING },
      skinDetails: { type: SchemaType.STRING },
      expression: { type: SchemaType.STRING },
      accessories: { type: SchemaType.STRING },
    },
    required: ["name", "gender", "age", "ethnicity", "build", "face", "hair", "outfit", "skinDetails", "expression", "accessories"],
  };

  const locationSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      type: { type: SchemaType.STRING },
      setting: { type: SchemaType.STRING },
      timeOfDay: { type: SchemaType.STRING },
      lighting: { type: SchemaType.STRING },
      surfaces: { type: SchemaType.STRING },
      atmosphere: { type: SchemaType.STRING },
      props: { type: SchemaType.STRING },
      colorPalette: { type: SchemaType.STRING },
      soundscape: { type: SchemaType.STRING },
      weatherCondition: { type: SchemaType.STRING },
    },
    required: ["name", "type", "setting", "timeOfDay", "lighting", "surfaces", "atmosphere", "props", "colorPalette", "soundscape", "weatherCondition"],
  };

  const voiceoverSegmentSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      sceneIndex: { type: SchemaType.NUMBER },
      text: { type: SchemaType.STRING },
      targetWords: { type: SchemaType.NUMBER },
    },
    required: ["sceneIndex", "text", "targetWords"],
  };

  const properties: Record<string, Schema> = {
    scenes: { type: SchemaType.ARRAY, items: sceneSchema },
    location: locationSchema,
    voiceoverScript: { type: SchemaType.STRING },
    voiceoverSegments: { type: SchemaType.ARRAY, items: voiceoverSegmentSchema },
    endCardTagline: { type: SchemaType.STRING },
    endCardCta: { type: SchemaType.STRING },
  };
  const required = ["scenes", "location", "voiceoverScript", "voiceoverSegments", "endCardTagline", "endCardCta"];

  if (needsCharacter) {
    properties.character = characterSchema;
    required.push("character");
  }

  return {
    type: SchemaType.OBJECT,
    properties,
    required,
  };
}

interface AdapterResult {
  scenes: FilledScene[];
  character?: Omit<Character, "id" | "createdAt">;
  location: Omit<Location, "id" | "createdAt">;
  voiceoverScript: string;
  voiceoverSegments: VoiceoverSegment[];
  endCardTagline: string;
  endCardCta: string;
}

async function adaptTemplate(
  template: GoldenTemplate,
  idea: string,
  brandName: string,
  productDescription?: string,
): Promise<AdapterResult> {
  const totalSeconds = template.sceneSlots.reduce((sum, s) => sum + s.duration, 0);

  const slotSpec = template.sceneSlots
    .map((s, i) => {
      const lines = [
        `  Scene ${i + 1} (${s.purpose}, ${s.duration}s):`,
        `    mood: "${s.mood}" (locked)`,
        `    cameraAngle: "${s.cameraAngle}" (locked)`,
        `    lighting: "${s.lighting}" (locked)`,
        `    colorGrade: "${s.colorGrade}" (locked)`,
        `    motion: "${s.motion}" (locked)`,
        `    duration: ${s.duration} (locked)`,
        `    setting hint to adapt: ${s.settingHint}`,
        s.characterActionHint ? `    character action hint to adapt: ${s.characterActionHint}` : "",
        `    product placement hint to adapt: ${s.productPlacementHint}`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  const characterArchetypeText = template.characterArchetype
    ? `Character archetype:
    role: ${template.characterArchetype.role}
    gender hint: ${template.characterArchetype.genderHint}
    age range: ${template.characterArchetype.ageRange[0]}-${template.characterArchetype.ageRange[1]}
    expression: ${template.characterArchetype.expressionHint}
    style notes: ${template.characterArchetype.styleNotes}
    Write a fully realistic character with a believable first + last name (region-appropriate to the brand), specific facial features, hair, outfit, skin, accessories. Be very specific.`
    : "";

  const prompt = `You are adapting a proven ad template to a SPECIFIC product idea. Fill every field.

USER IDEA:
"${idea}"

BRAND:
name: "${brandName}"
${productDescription ? `description: "${productDescription}"` : ""}

TEMPLATE: ${template.vertical} · ${template.adType} (${template.formatLabel})
Reference ads this template channels: ${template.referenceAds.join("; ")}

SCENE STRUCTURE (the dropdown fields are LOCKED — do not change. Adapt only the setting / characterAction / productPlacement to this specific product):

${slotSpec}

LOCATION ARCHETYPE TO ADAPT INTO ONE CONCRETE LOCATION:
${JSON.stringify(template.locationArchetype, null, 2)}
Write a vivid, location-library-ready entry — give it a unique short name (e.g. "Tokyo Neon Street", "Cotswolds Estate at Dusk"). Include soundscape and weatherCondition even if 'N/A — controlled studio'.

${characterArchetypeText}

VOICEOVER:
Total video length: ${totalSeconds} seconds across ${template.sceneSlots.length} scenes.
Voiceover style: ${template.voiceoverStyle}
Write the voiceoverScript as a single block, then ALSO split it into voiceoverSegments, one per scene index (0-${template.sceneSlots.length - 1}).
Each segment's targetWords must equal scene.duration × 2.4 (rounded — about 140 words per minute conversational pace). For a 5s scene that is 12 words; for 10s it is 24 words.
The segments must concatenate to the full voiceoverScript with single spaces between.

MUSIC STYLE (for reference, you do not output music): ${template.musicStyle}

END CARD:
Tagline template: ${template.endCardTagline}
CTA template: ${template.endCardCtaTemplate}
Rewrite both to match the brand voice and the user idea. Replace any {brand} token with "${brandName}".

CRITICAL RULES:
1. Every scene's "setting" field MUST begin with a brief reference to the location like "@${template.locationArchetype.name}" then continue with the per-scene adapted environment detail.${template.needsCharacter ? `
2. Every scene's "characterAction" field MUST begin with "@<character name>" then continue with the per-scene action.` : `
2. Set every scene's "characterAction" to an empty string (this template has no character).`}
3. productPlacement must explicitly name "${brandName}" or the specific product at least once.
4. Use the exact enum strings shown — they map to UI dropdowns.

Return the JSON now.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: buildAdapterSchema(template.needsCharacter),
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as Omit<AdapterResult, "character"> & { character?: Omit<Character, "id" | "createdAt" | "brandName"> };

  // Inject brandName onto persistable records (the schema doesn't ask Gemini for it).
  const location: Omit<Location, "id" | "createdAt"> = {
    ...parsed.location,
    brandName,
  };
  const character: Omit<Character, "id" | "createdAt"> | undefined = parsed.character
    ? { ...parsed.character, brandName }
    : undefined;

  return {
    scenes: parsed.scenes,
    character,
    location,
    voiceoverScript: parsed.voiceoverScript,
    voiceoverSegments: parsed.voiceoverSegments,
    endCardTagline: parsed.endCardTagline,
    endCardCta: parsed.endCardCta,
  };
}

// ─────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────

export interface IdeaToScenesParams {
  idea: string;
  brandName: string;
  productDescription?: string;
  /** If user pins an ad type, the classifier picks only from that pool. */
  adType?: AdType;
  /** If user overrides the recommended tier, this wins. */
  tierOverride?: QualityTier;
}

export async function generateScenesFromIdea(params: IdeaToScenesParams): Promise<FilledSceneInputs> {
  const { idea, brandName, productDescription, adType, tierOverride } = params;

  if (!idea?.trim()) throw new Error("idea is required");
  if (!brandName?.trim()) throw new Error("brandName is required");

  const templateId = await classifyTemplate(idea, adType);
  const template = getTemplate(templateId) || pickTemplateByKeywords(idea, adType);

  const adapted = await adaptTemplate(template, idea, brandName, productDescription);

  return {
    templateId: template.id,
    templateLabel: `${template.vertical} · ${template.adType} · ${template.formatLabel}`,
    referenceAds: template.referenceAds,
    tier: tierOverride ?? template.recommendedTier,
    realismPreset: template.recommendedRealism,
    aspectRatio: template.recommendedAspectRatio,
    scenes: adapted.scenes,
    character: adapted.character ?? null,
    location: adapted.location,
    voiceoverScript: adapted.voiceoverScript,
    voiceoverSegments: adapted.voiceoverSegments,
    voiceoverStyle: template.voiceoverStyle,
    musicStyle: template.musicStyle,
    endCardTagline: adapted.endCardTagline,
    endCardCta: adapted.endCardCta,
  };
}
