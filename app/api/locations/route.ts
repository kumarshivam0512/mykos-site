import { NextRequest, NextResponse } from "next/server";
import { saveLocation, listLocations } from "@/lib/db/locations";

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get("brand") || undefined;
    const locations = await listLocations(brand);
    return NextResponse.json(locations);
  } catch (error) {
    console.error("List locations error:", error);
    return NextResponse.json({ error: "Failed to load locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandName, name, type, setting, timeOfDay, lighting, surfaces, atmosphere, props, colorPalette, soundscape, weatherCondition } = body;

    if (!brandName || !name || !setting) {
      return NextResponse.json({ error: "brandName, name, and setting are required" }, { status: 400 });
    }

    const location = await saveLocation({
      brandName, name, type: type || "indoor",
      setting: setting || "", timeOfDay: timeOfDay || "natural daylight",
      lighting: lighting || "", surfaces: surfaces || "", atmosphere: atmosphere || "",
      props: props || "", colorPalette: colorPalette || "", soundscape: soundscape || "",
      weatherCondition: weatherCondition || "",
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Save location error:", error);
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
  }
}
