import { CosmosClient, Container } from "@azure/cosmos";

let container: Container | null = null;

function getContainer(): Container {
  if (!container) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    if (!endpoint || !key) throw new Error("COSMOS_ENDPOINT and COSMOS_KEY required");
    container = new CosmosClient({ endpoint, key }).database("mykos").container("characters");
  }
  return container;
}

export interface Character {
  id: string;
  brandName: string;
  name: string;        // e.g., "Fitness Priya"
  gender: string;
  age: number;
  ethnicity: string;
  build: string;       // e.g., "athletic lean, 175cm, 72kg"
  face: string;        // e.g., "angular jawline, short stubble, thick dark eyebrows, brown eyes"
  hair: string;        // e.g., "black, cropped short sides, longer on top, matte styled"
  outfit: string;      // e.g., "charcoal compression tee, black training shorts, white Nike mid-tops"
  skinDetails: string; // e.g., "medium-brown, slight perspiration sheen"
  expression: string;  // e.g., "focused, confident, slight half-smile"
  accessories: string; // e.g., "black digital watch, wireless earbuds"
  createdAt: string;
}

export function characterToSheet(char: Character): string {
  return [
    `${char.gender}, ${char.age} years old, ${char.ethnicity}, ${char.build}`,
    `Face: ${char.face}`,
    `Hair: ${char.hair}`,
    `Outfit: ${char.outfit}`,
    `Skin: ${char.skinDetails}`,
    `Expression: ${char.expression}`,
    char.accessories ? `Accessories: ${char.accessories}` : "",
  ].filter(Boolean).join(". ");
}

export async function saveCharacter(char: Omit<Character, "id" | "createdAt">): Promise<Character> {
  const doc: Character = {
    ...char,
    id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  await getContainer().items.create(doc);
  return doc;
}

export async function listCharacters(brandName?: string): Promise<Character[]> {
  const query = brandName
    ? { query: "SELECT * FROM c WHERE c.brandName = @brand ORDER BY c.createdAt DESC", parameters: [{ name: "@brand", value: brandName }] }
    : { query: "SELECT * FROM c ORDER BY c.createdAt DESC" };
  const { resources } = await getContainer().items.query(query).fetchAll();
  return resources as Character[];
}

export async function getCharacter(id: string): Promise<Character | null> {
  const { resources } = await getContainer().items.query({
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: id }],
  }).fetchAll();
  return (resources[0] as Character) || null;
}

export async function deleteCharacter(id: string, brandName: string): Promise<void> {
  await getContainer().item(id, brandName).delete();
}
