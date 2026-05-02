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
    characterDescription: { type: SchemaType.STRING },
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
        },
        required: ["index", "visualPrompt", "cameraAngle", "motion", "lighting", "duration"],
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

IMPORTANT for animated_explainer: If you select this format, scene visual prompts should describe flat design illustrations, motion graphics, clean UI mockups, and geometric shapes — NOT photorealistic scenes. Think Notion/Stripe style ads with 2D illustrations.

## 7. CHARACTER DESCRIPTION (if the ad features a human)
If any scene involves a human character, provide a SINGLE detailed character description that stays IDENTICAL across ALL scenes. Include:
- Gender, approximate age, ethnicity
- Hair (color, length, style)
- Clothing (specific items, colors)
- Build and distinguishing features
This ensures visual consistency when each scene is generated separately.
If the ad is product-only (no humans), set characterDescription to an empty string.

## 8. SCENES (3-5 scenes for 15-30s)
Each scene: detailed visual prompt, camera angle, motion, lighting, duration.
CRITICAL: If a character was described above, reference them in EVERY scene using the EXACT same description. Do NOT change their appearance between scenes.
For animated_explainer format: describe flat 2D illustrations, screen mockups, and motion graphics — not photos.

## 9. VOICEOVER SCRIPT
Compelling narration timed to scenes

## 10. MUSIC DIRECTION
Genre, tempo (BPM), mood, instruments

## 11. CAMERA SETTINGS
Focal length, aperture, color grade

## 12. END CARD
Memorable tagline + CTA text

CALIBRATION EXAMPLES:

Product: "Nike Air Max" → 3 personas: "Jake" (18, sneakerhead), "Priya" (25, fitness runner), "Marcus" (32, streetwear collector)
Platform briefs: Instagram Reels (9:16, 15s, energetic), YouTube (16:9, 30s, cinematic), TikTok (9:16, 10s, trend-driven)

Product: "Notion" → 3 personas: "Sarah" (28, startup PM), "David" (35, engineering lead), "Maya" (22, freelancer)
Platform briefs: YouTube (16:9, 30s, tutorial-style), LinkedIn (1:1, 15s, professional), Twitter/X (16:9, 6s, quick demo)

Generate the complete brief now.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as CreativeBrief;
}
