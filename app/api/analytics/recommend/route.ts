import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

const recommendationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    recommendations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          channel: { type: SchemaType.STRING },
          currentSpend: { type: SchemaType.NUMBER },
          recommendedSpend: { type: SchemaType.NUMBER },
          changePercent: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING },
        },
        required: ["channel", "currentSpend", "recommendedSpend", "changePercent", "reason"],
      },
    },
    keyInsights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    riskFactors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["summary", "recommendations", "keyInsights", "riskFactors"],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channels, totalBudget, goal } = body;

    if (!channels?.length) {
      return NextResponse.json({ error: "Channel data required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
      },
    });

    const channelSummary = channels
      .map((c: { channel: string; spend: number; impressions: number; clicks: number; conversions: number; revenue: number }) => {
        const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0";
        const cpa = c.conversions > 0 ? (c.spend / c.conversions).toFixed(2) : "N/A";
        const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : "0";
        return `- ${c.channel}: Spend=$${c.spend}, Impressions=${c.impressions}, Clicks=${c.clicks}, CTR=${ctr}%, Conversions=${c.conversions}, CPA=$${cpa}, Revenue=$${c.revenue}, ROAS=${roas}x`;
      })
      .join("\n");

    const prompt = `You are a performance marketing analyst. Analyze this ad performance data and recommend budget reallocation.

Total budget: $${totalBudget || channels.reduce((s: number, c: { spend: number }) => s + c.spend, 0)}
Goal: ${goal || "Maximize ROAS while maintaining conversion volume"}

Channel performance:
${channelSummary}

Provide:
1. A brief summary of overall performance
2. For EACH channel: recommended spend change (increase/decrease/maintain) with percentage and specific reason
3. 3-5 key insights from the data
4. 2-3 risk factors to watch

Be specific with numbers. If a channel has poor ROAS, recommend reducing. If a channel has strong ROAS but low spend, recommend scaling up.`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());
    return NextResponse.json(data);
  } catch (error) {
    console.error("Budget recommendation error:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
