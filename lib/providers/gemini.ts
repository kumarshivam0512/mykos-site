import { GoogleGenerativeAI, type Schema, SchemaType } from "@google/generative-ai";
import type { CreativeBrief } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const briefSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    productCategory: { type: SchemaType.STRING },
    targetAudience: {
      type: SchemaType.OBJECT,
      properties: {
        ageRange: { type: SchemaType.STRING },
        gender: { type: SchemaType.STRING },
        platforms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        psychographics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ["ageRange", "gender", "platforms", "psychographics"],
    },
    personas: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          age: { type: SchemaType.NUMBER },
          income: { type: SchemaType.STRING },
          location: { type: SchemaType.STRING },
          painPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          motivations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          contentPreferences: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          purchaseTriggers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          adAngle: { type: SchemaType.STRING },
        },
        required: ["name", "age", "income", "location", "painPoints", "motivations", "contentPreferences", "purchaseTriggers", "adAngle"],
      },
    },
    platformBriefs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          platform: { type: SchemaType.STRING },
          format: { type: SchemaType.STRING },
          duration: { type: SchemaType.NUMBER },
          hook: { type: SchemaType.STRING },
          tone: { type: SchemaType.STRING },
          ctaText: { type: SchemaType.STRING },
        },
        required: ["platform", "format", "duration", "hook", "tone", "ctaText"],
      },
    },
    competitorAnalysis: {
      type: SchemaType.OBJECT,
      properties: {
        competitorName: { type: SchemaType.STRING },
        theirPositioning: { type: SchemaType.STRING },
        theirAudience: { type: SchemaType.STRING },
        differentiators: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        attackAngles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ["competitorName", "theirPositioning", "theirAudience", "differentiators", "attackAngles"],
    },
    adFormat: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [
        "cinematic_lifestyle",
        "animated_explainer",
        "product_showcase",
        "testimonial_ugc",
        "minimalist_editorial",
        "energetic_sports",
      ],
    },
    sceneBackdrop: { type: SchemaType.STRING },
    characterSheet: { type: SchemaType.STRING },
    duration: { type: SchemaType.NUMBER },
    scenes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          index: { type: SchemaType.NUMBER },
          visualPrompt: { type: SchemaType.STRING },
          cameraAngle: { type: SchemaType.STRING },
          motion: { type: SchemaType.STRING },
          lighting: { type: SchemaType.STRING },
          duration: { type: SchemaType.NUMBER },
          // Per-scene on-camera dialogue (lip-synced by native-audio video
          // models like Seedance 2.0 / Kling 2.5 Turbo Pro). Empty string
          // is valid for silent / product-only scenes.
          dialog: { type: SchemaType.STRING },
          voiceTone: { type: SchemaType.STRING },
        },
        required: ["index", "visualPrompt", "cameraAngle", "motion", "lighting", "duration", "dialog", "voiceTone"],
      },
    },
    voiceoverScript: { type: SchemaType.STRING },
    musicDirection: { type: SchemaType.STRING },
    cameraSettings: {
      type: SchemaType.OBJECT,
      properties: {
        focalLength: { type: SchemaType.STRING },
        aperture: { type: SchemaType.STRING },
        colorGrade: { type: SchemaType.STRING },
      },
      required: ["focalLength", "aperture", "colorGrade"],
    },
    endCard: {
      type: SchemaType.OBJECT,
      properties: {
        tagline: { type: SchemaType.STRING },
        ctaText: { type: SchemaType.STRING },
      },
      required: ["tagline", "ctaText"],
    },
  },
  required: [
    "productCategory",
    "targetAudience",
    "personas",
    "platformBriefs",
    "adFormat",
    "sceneBackdrop",
    "characterSheet",
    "duration",
    "scenes",
    "voiceoverScript",
    "musicDirection",
    "cameraSettings",
    "endCard",
  ],
};

export async function generateBrief(
  productName: string,
  productDescription: string,
  brandColors?: string[],
  competitorName?: string
): Promise<CreativeBrief> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: briefSchema,
    },
  });

  const brandContext = brandColors?.length
    ? `Brand colors: ${brandColors.join(", ")}. Incorporate these colors into the visual direction.`
    : "";

  const competitorContext = competitorName
    ? `\nCompetitor to differentiate from: "${competitorName}". Analyze their likely positioning, their target audience, and provide specific differentiators and attack angles for our product vs theirs.`
    : "";

  const prompt = `You are an elite AI Creative Director and Marketing Strategist. Given a product, generate a comprehensive creative brief as JSON.

Product: "${productName}"
Description: "${productDescription}"
${brandContext}${competitorContext}

Generate ALL of the following:

## 1. PRODUCT ANALYSIS
- Detect the product category (SaaS, fashion, luxury, fitness, baby/family, fintech, fragrance, food, electronics, etc.)

## 2. TARGET AUDIENCE
- Overall audience: age range, gender split, social platforms, psychographic traits

## 3. BUYER PERSONAS (generate exactly 3)
Create 3 distinct buyer personas with:
- A realistic first name (e.g., "Priya", "Marcus", "Sarah")
- Age (specific number)
- Income level (e.g., "$40K-60K/year", "₹6-10 LPA")
- Location type (e.g., "Metro Tier-1 India", "Suburban US", "Urban Southeast Asia")  
- 2-3 pain points this persona has that the product solves
- 2-3 motivations for purchasing
- Content preferences (what type of content they engage with)
- Purchase triggers (what makes them buy NOW)
- A specific ad angle/hook tailored to THIS persona

## 4. PLATFORM-SPECIFIC BRIEFS (generate for 3 platforms)
For each of the 3 most relevant platforms, provide:
- Platform name (e.g., "Instagram Reels", "YouTube Pre-roll", "LinkedIn Feed")
- Optimal format for that platform
- Optimal duration in seconds for that platform
- A platform-specific hook (first 3 seconds to stop the scroll)
- Tone appropriate for that platform
- CTA text optimized for that platform

## 5. COMPETITOR ANALYSIS (${competitorName ? `analyze vs "${competitorName}"` : "identify the most likely competitor and analyze"})
- Competitor name
- Their likely positioning
- Their likely target audience
- 3 specific differentiators for our product
- 2-3 attack angles (how to position against them in ads)

## 6. AD FORMAT
Select the BEST format from: cinematic_lifestyle, animated_explainer, product_showcase, testimonial_ugc, minimalist_editorial, energetic_sports

IMPORTANT for animated_explainer: scene prompts should describe flat 2D illustrations, motion graphics, UI mockups — NOT photorealistic scenes.

## 7. SCENE BACKDROP (sceneBackdrop field — EXTREMELY DETAILED)
Create ONE detailed environment description that ALL scenes share. This is the physical location/setting. Include:
- Location type and specific details (e.g., "modern minimalist gym with floor-to-ceiling windows facing east")
- Floor material, wall material, wall colors with finish (e.g., "polished concrete floors, matte charcoal walls with subtle grain texture")
- Furniture/equipment (specific items, materials, colors)
- Lighting setup: natural light sources (direction, time of day, color temperature in Kelvin), artificial lights (type, color, position)
- Atmospheric elements (dust particles in light beams, steam, condensation, ambient haze)
- Color temperature of the environment (warm/cool, specific Kelvin if relevant)
This backdrop is referenced by all scenes — it must be ONE consistent location.
If using animated_explainer format, describe a flat design workspace/digital environment instead.

## 8. CHARACTER SHEET (characterSheet field — EXTREMELY DETAILED)
If any scene involves a human, create ONE comprehensive character description used in ALL scenes. Include:
- Gender, exact age, ethnicity, height (cm), weight (kg), build type
- Face: jawline shape, facial hair, eyebrow thickness, eye color, skin tone (be specific e.g., "medium olive-brown")
- Hair: color, length on top/sides, texture, styling product used
- Outfit: EXACT clothing items with colors, fit, brand style (e.g., "fitted charcoal compression tee showing arm definition, black mid-thigh training shorts, white Nike Air Force 1 mid-tops with grey swoosh")
- Skin details: sheen, perspiration level, any visible features
- Default expression and energy
If the ad is product-only with no human character, set characterSheet to an empty string.

## 9. SCENES (3-5 scenes for 15-30s) — EXTREMELY DETAILED
Each scene's visualPrompt should be 200-400 characters and describe ONLY what is visible in the STILL frame:
- What the character is doing (specific action, hand positions, body language) — keep actions SMALL and contained
- Where exactly in the backdrop they are
- Product interaction details (which hand holds it, label facing camera)
- Expression/emotion in this specific moment
- DO NOT describe camera movement in the visualPrompt — that goes in the motion field

Camera angle: Be cinematically specific (e.g., "three-quarter front view, eye-level" not just "close-up")

Motion: Use ONE of these named camera moves EXACTLY:
dolly in, dolly out, dolly left, dolly right, push in, orbit, 360, pan, crane up, crane down, handheld, crash zoom, static
Keep motion field to a single named move. The video prompt engine will handle timing.

Lighting: Specific setup referencing the backdrop (e.g., "softbox key light camera-left, warm rim light from behind")

IMPORTANT: Each scene is a 5-second clip. Subject motion must be SMALL — what the source image physically supports. No scene should require the character to walk, run, dance, or dramatically change position.

DIALOG (per scene — spoken ON CAMERA by the character, lip-synced by the video model):
For each scene, write 1–2 short sentences the character says out loud. Pacing budget = ~2.4 words per second of scene duration (a 5s scene = ~12 words MAX; a 10s scene = ~24 words). Going over makes the lip-sync rush and sound robotic.
- Match the adFormat:
  - testimonial_ugc: casual, first-person, use contractions and small filler words ("like", "honestly", "okay so"). Talk about a specific moment, feeling, or result — not the product abstractly. Example: "Okay so I've been using this for like three weeks and honestly my skin's never looked better."
  - cinematic_lifestyle / minimalist_editorial: sparse, evocative, one sentence max per scene. Often best with no dialog at all on the middle scenes, just opening/closing lines.
  - product_showcase / energetic_sports: confident second-person, action verbs. Example: "Built for the work that builds you."
  - animated_explainer: clear declarative sentences explaining ONE benefit per scene.
- BANNED phrases (never write these): "experience the difference", "unleash your potential", "discover", "introducing", "revolutionary", "game-changing", "transform your life", any sentence starting with "In a world where".
- If the scene has no human character (product-only, abstract shots), set dialog to empty string "".
- The opening scene and closing scene are highest priority for dialog; middle scenes can be silent for cinematic breathing room.

VOICE TONE (per scene — 8–15 words describing the voice that delivers the dialog):
Describe gender, age range, accent, delivery style. Be specific.
Examples:
  - UGC: "Young woman, late 20s, warm casual American English, slightly breathy, friendly, selfie-cam intimate"
  - Cinematic: "Mature male voiceover, deep resonant English, calm and confident, BBC documentary tone"
  - Sports: "Male, early 30s, energetic American English, slightly raspy, motivational coach delivery"
If dialog is empty, set voiceTone to empty string too.

## 10. VOICEOVER SCRIPT (legacy single-blob narration for post-production TTS)
Compilation of all per-scene dialogs concatenated, OR a separate narrator script if the ad uses a non-character narrator (cinematic_lifestyle often does). Used as fallback when native-audio video model isn't selected.

## 11. MUSIC DIRECTION
Genre, tempo (BPM), mood, instruments, reference tracks

## 12. CAMERA SETTINGS
Focal length with lens character, aperture for DOF, color grade name (e.g., "orange-teal", "warm desaturated", "cool clinical")

## 13. END CARD
Memorable tagline + CTA text

CALIBRATION EXAMPLES:

Product: "Avvatar Whey Protein" →
sceneBackdrop: "Modern industrial gym with exposed brick walls, rubber flooring, chrome free-weight racks, floor-to-ceiling windows facing east with early morning golden light (5500K) streaming in, creating long diagonal shadows across the floor. LED strip lights along ceiling edges emit cool 4000K accent light. Slight dust particles visible in window light beams."
characterSheet: "Indian male, 28 years old, 175cm/72kg, athletic lean build with visible arm definition. Angular jawline, short dark stubble, thick dark eyebrows, brown eyes, medium-brown skin with slight perspiration sheen. Black hair cropped short on sides, slightly longer on top styled with matte product. Wearing fitted charcoal compression tee, black mid-thigh training shorts, white Nike mid-top sneakers. Expression: focused, confident, slight half-smile."

Product: "Nike Air Max" → 3 personas, sceneBackdrop about urban nighttime street with neon
Product: "Notion" → animated_explainer, no character needed, digital workspace backdrop

Generate the complete brief now.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as CreativeBrief;
}
