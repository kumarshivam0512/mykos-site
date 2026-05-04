import { NextRequest, NextResponse } from "next/server";
import { saveCharacter, listCharacters } from "@/lib/db/characters";

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get("brand") || undefined;
    const characters = await listCharacters(brand);
    return NextResponse.json(characters);
  } catch (error) {
    console.error("List characters error:", error);
    return NextResponse.json({ error: "Failed to load characters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandName, name, gender, age, ethnicity, build, face, hair, outfit, skinDetails, expression, accessories } = body;

    if (!brandName || !name || !gender) {
      return NextResponse.json({ error: "brandName, name, and gender are required" }, { status: 400 });
    }

    const character = await saveCharacter({
      brandName, name, gender, age: age || 25, ethnicity: ethnicity || "",
      build: build || "", face: face || "", hair: hair || "", outfit: outfit || "",
      skinDetails: skinDetails || "", expression: expression || "neutral", accessories: accessories || "",
    });

    return NextResponse.json(character);
  } catch (error) {
    console.error("Save character error:", error);
    return NextResponse.json({ error: "Failed to save character" }, { status: 500 });
  }
}
