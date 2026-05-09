import { getLocationsContainer } from "./cosmos";
import type { Container } from "@azure/cosmos";

async function getContainer(): Promise<Container> {
  return getLocationsContainer();
}

export interface Location {
  id: string;
  brandName: string;
  name: string;           // e.g., "Urban Rooftop Gym"
  type: string;           // e.g., "indoor", "outdoor", "studio", "mixed"
  setting: string;        // e.g., "A modern rooftop gym with floor-to-ceiling windows overlooking a city skyline"
  timeOfDay: string;      // e.g., "golden hour", "midday", "night", "overcast morning"
  lighting: string;       // e.g., "Warm golden hour backlight streaming through west-facing windows"
  surfaces: string;       // e.g., "polished concrete floors, exposed steel beams, matte black equipment"
  atmosphere: string;     // e.g., "Slight haze from morning fog, dust motes in light beams"
  props: string;          // e.g., "dumbbells on rack, yoga mats rolled by wall, water bottles on bench"
  colorPalette: string;   // e.g., "warm greys, matte black, brushed steel, pops of neon orange"
  soundscape: string;     // e.g., "Low ambient music, distant city traffic, occasional clinking weights"
  weatherCondition: string; // e.g., "Clear sky, gentle breeze" (outdoor only)
  createdAt: string;
}

export function locationToSheet(loc: Location): string {
  return [
    `${loc.type} location: ${loc.setting}`,
    `Time: ${loc.timeOfDay}`,
    `Lighting: ${loc.lighting}`,
    `Surfaces: ${loc.surfaces}`,
    loc.atmosphere ? `Atmosphere: ${loc.atmosphere}` : "",
    loc.props ? `Props: ${loc.props}` : "",
    loc.colorPalette ? `Colors: ${loc.colorPalette}` : "",
    loc.weatherCondition ? `Weather: ${loc.weatherCondition}` : "",
  ].filter(Boolean).join(". ");
}

export async function saveLocation(loc: Omit<Location, "id" | "createdAt">): Promise<Location> {
  const doc: Location = {
    ...loc,
    id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  await (await getContainer()).items.create(doc);
  return doc;
}

export async function listLocations(brandName?: string): Promise<Location[]> {
  const query = brandName
    ? { query: "SELECT * FROM c WHERE c.brandName = @brand ORDER BY c.createdAt DESC", parameters: [{ name: "@brand", value: brandName }] }
    : { query: "SELECT * FROM c ORDER BY c.createdAt DESC" };
  const { resources } = await (await getContainer()).items.query(query).fetchAll();
  return resources as Location[];
}

export async function getLocation(id: string): Promise<Location | null> {
  const { resources } = await (await getContainer()).items.query({
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: id }],
  }).fetchAll();
  return (resources[0] as Location) || null;
}

export async function deleteLocation(id: string, brandName: string): Promise<void> {
  await (await getContainer()).item(id, brandName).delete();
}
