import { getAnalyticsContainer as getAnalyticsContainerFromCosmos } from "./cosmos";
import type { Container } from "@azure/cosmos";

async function getAnalyticsContainer(): Promise<Container> {
  return getAnalyticsContainerFromCosmos();
}

export interface ChannelData {
  channel: string; // "Meta Ads", "Google Ads", "TikTok", etc.
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface AnalyticsEntry {
  id: string;
  brandName: string;
  campaignId?: string;
  period: string; // "2026-W18", "2026-05-01"
  channels: ChannelData[];
  totalSpend: number;
  totalRevenue: number;
  notes?: string;
  createdAt: string;
}

export async function saveAnalytics(entry: Omit<AnalyticsEntry, "id" | "createdAt">): Promise<AnalyticsEntry> {
  const container = await getAnalyticsContainer();
  const doc: AnalyticsEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await container.items.create(doc);
  return doc;
}

export async function listAnalytics(brandName?: string, limit = 50): Promise<AnalyticsEntry[]> {
  const container = await getAnalyticsContainer();
  const query = brandName
    ? { query: "SELECT * FROM c WHERE c.brandName = @brand ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit", parameters: [{ name: "@brand", value: brandName }, { name: "@limit", value: limit }] }
    : { query: "SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit", parameters: [{ name: "@limit", value: limit }] };
  const { resources } = await container.items.query(query).fetchAll();
  return resources as AnalyticsEntry[];
}

export async function deleteAnalyticsEntry(id: string, brandName: string): Promise<void> {
  const container = await getAnalyticsContainer();
  await container.item(id, brandName).delete();
}
