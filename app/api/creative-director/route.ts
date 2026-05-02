import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/providers/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, brandColors, competitorName } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Product name and description are required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured. Add it to .env.local" },
        { status: 503 }
      );
    }

    const brief = await generateBrief(name, description, brandColors, competitorName);
    return NextResponse.json(brief);
  } catch (error) {
    console.error("Creative Director error:", error);
    return NextResponse.json(
      { error: "Failed to generate brief. Please try again." },
      { status: 503 }
    );
  }
}
