import { getCampaignsContainer } from "./cosmos";
import type { CreativeBrief, ProductInput, BrandKit } from "@/lib/types";

export interface Campaign {
  id: string;
  brandName: string;
  productInput: ProductInput;
  brandKit: BrandKit;
  brief: CreativeBrief;
  competitorName?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveCampaign(campaign: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<Campaign> {
  const container = await getCampaignsContainer();
  const now = new Date().toISOString();
  const doc: Campaign = {
    ...campaign,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  await container.items.create(doc);
  return doc;
}

export async function listCampaigns(limit = 50): Promise<Campaign[]> {
  const container = await getCampaignsContainer();
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit",
      parameters: [{ name: "@limit", value: limit }],
    })
    .fetchAll();
  return resources as Campaign[];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const container = await getCampaignsContainer();
  // Need to query since we don't know the partition key value
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();
  return (resources[0] as Campaign) || null;
}

export async function deleteCampaign(id: string, brandName: string): Promise<void> {
  const container = await getCampaignsContainer();
  await container.item(id, brandName).delete();
}
