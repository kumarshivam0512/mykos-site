// ─── Workspace API client (Workspace UX sprint) ─────────────────
//
// Thin typed fetchers for /api/brands and /api/campaigns. Centralized so:
//   1. Every page hits the same surface (no scattered fetch() with subtle bugs)
//   2. Error handling is uniform
//   3. Swapping in SWR / react-query later is a single-file change
//
// Keep this isomorphic-friendly — no React imports, no Next.js imports.

import type { Brand, BrandKit, ProductInput, CreativeBrief, GeneratedAssets, QualityTier, AspectRatio, VideoMode } from "@/lib/types";

export interface CampaignRecord {
  id: string;
  brandName: string;
  brandId?: string;
  userId?: string;
  productInput: ProductInput;
  brandKit: BrandKit;
  brief: CreativeBrief;
  competitorName?: string;
  sceneMotions?: {
    cameraMove?: string;
    motionPrompt?: string;
    duration?: number;
    overlayText?: string;
    overlayPosition?: "top" | "center" | "lower-third" | "bottom";
    overlayWithBar?: boolean;
  }[];
  assets?: GeneratedAssets;
  preferences?: {
    tier?: QualityTier;
    aspectRatio?: AspectRatio;
    videoMode?: VideoMode;
    voiceTone?: "polished" | "casual" | "gritty" | "ugc-authentic";
    musicChoice?: string;
    ambientChoice?: string;
    ambientVolume?: number;
    captionStyle?: "modern" | "tiktok" | "cinematic";
    burnCaptions?: boolean;
    useBrandedChrome?: boolean;
    openerStyle?: "minimal" | "scale" | "particle";
    openerDurationSec?: number;
    endCardDurationSec?: number;
    endCardBackground?: "solid" | "dark" | "light";
  };
  status?: "draft" | "in_progress" | "complete" | "archived";
  createdAt: string;
  updatedAt: string;
}

class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: { error?: string; code?: string } = {};
    try { body = await res.json(); } catch { /* non-json */ }
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.code);
  }
  return (await res.json()) as T;
}

// ─── Brands ─────────────────────────────────────────────────────

export async function listBrands(opts?: { includeArchived?: boolean }): Promise<Brand[]> {
  const q = opts?.includeArchived ? "?archived=true" : "";
  const data = await request<{ brands: Brand[] }>(`/api/brands${q}`);
  return data.brands;
}

export async function createBrand(input: {
  name: string;
  description?: string;
  kit?: Partial<BrandKit>;
  tagline?: string;
  websiteUrl?: string;
}): Promise<Brand> {
  const data = await request<{ brand: Brand }>("/api/brands", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.brand;
}

export async function getBrand(id: string): Promise<Brand> {
  const data = await request<{ brand: Brand }>(`/api/brands/${id}`);
  return data.brand;
}

export async function patchBrand(id: string, patch: Partial<Brand>): Promise<Brand> {
  const data = await request<{ brand: Brand }>(`/api/brands/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.brand;
}

export async function archiveBrand(id: string): Promise<void> {
  await request(`/api/brands/${id}`, { method: "DELETE" });
}

// ─── Campaigns ──────────────────────────────────────────────────

export async function listMyCampaigns(): Promise<CampaignRecord[]> {
  return request<CampaignRecord[]>(`/api/campaigns?mine=true`);
}

export async function listCampaignsByBrand(brandId: string): Promise<CampaignRecord[]> {
  return request<CampaignRecord[]>(`/api/campaigns?brandId=${encodeURIComponent(brandId)}`);
}

export async function getCampaign(id: string): Promise<CampaignRecord> {
  return request<CampaignRecord>(`/api/campaigns/${id}`);
}

export async function createCampaign(input: {
  productInput: ProductInput;
  brandKit?: BrandKit;
  brief: CreativeBrief;
  competitorName?: string;
  brandId?: string;
  sceneMotions?: CampaignRecord["sceneMotions"];
  assets?: GeneratedAssets;
  preferences?: CampaignRecord["preferences"];
  status?: CampaignRecord["status"];
}): Promise<CampaignRecord> {
  return request<CampaignRecord>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function patchCampaign(id: string, patch: Partial<CampaignRecord>): Promise<CampaignRecord> {
  return request<CampaignRecord>(`/api/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await request(`/api/campaigns/${id}`, { method: "DELETE" });
}

export { ApiError };
