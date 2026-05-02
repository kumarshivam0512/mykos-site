import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

const variantSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    variants: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          personaName: { type: SchemaType.STRING },
          hook: { type: SchemaType.STRING },
          openingScene: { type: SchemaType.STRING },
          voiceoverOpener: { type: SchemaType.STRING },
          ctaText: { type: SchemaType.STRING },
          tone: { type: SchemaType.STRING },
        },
        required: ["personaName", "hook", "openingScene", "voiceoverOpener", "ctaText", "tone"],
      },
    },
  },
  required: ["variants"],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, productDescription, personas, adFormat } = body;

    if (!productName || !personas?.length) {
      return NextResponse.json({ error: "Product and personas required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: variantSchema,
      },
    });

    const personaDescriptions = personas
      .map((p: { name: string; adAngle: string; painPoints: string[] }) =>
        `- ${p.name}: angle="${p.adAngle}", pain points: ${p.painPoints.join(", ")}`
      )
      .join("\n");

    const prompt = `Generate A/B ad variants for "${productName}" (${productDescription}).
Ad format: ${adFormat}

For each of these personas, create a unique ad variant:
${personaDescriptions}

Each variant should have:
1. A unique hook (first 3 seconds to stop the scroll — completely different approach per persona)
2. An opening scene description (what the viewer sees first)
3. A voiceover opener (first sentence of narration)
4. A CTA text (tailored to this persona's purchase triggers)
5. Overall tone

Make each variant feel like a DIFFERENT ad targeting a DIFFERENT person. Don't just rephrase — fundamentally change the creative approach.`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    return NextResponse.json(data);
  } catch (error) {
    console.error("Variant generation error:", error);
    return NextResponse.json({ error: "Failed to generate variants" }, { status: 500 });
  }
}
