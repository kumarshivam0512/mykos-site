// ─── Brand data access (Workspace UX sprint) ────────────────────
//
// Brands are user-scoped (partition key /userId where userId = email).
// All queries hit a single partition per user — fast and cheap.
//
// Conventions:
//   - id format: `brand_<timestamp>_<random6>` for sortability + collision safety
//   - never delete; set `archived: true` so old campaigns can still resolve their brand
//   - one user can own many brands; max ~50 brands per user is the practical UX cap

import { getBrandsContainer } from "./cosmos";
import type { Brand, BrandKit } from "@/lib/types";
import crypto from "crypto";

function newBrandId(): string {
  return `brand_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

/** Create a brand owned by `userId`. */
export async function createBrand(
  input: Omit<Brand, "id" | "createdAt" | "updatedAt">
): Promise<Brand> {
  const container = await getBrandsContainer();
  const now = new Date().toISOString();
  const brand: Brand = {
    ...input,
    id: newBrandId(),
    createdAt: now,
    updatedAt: now,
  };
  await container.items.create(brand);
  return brand;
}

/** Read a single brand by id. Requires userId because /userId is the partition key. */
export async function getBrand(id: string, userId: string): Promise<Brand | null> {
  const container = await getBrandsContainer();
  try {
    const { resource } = await container.item(id, userId).read<Brand>();
    return resource ?? null;
  } catch {
    return null;
  }
}

/** List all brands owned by `userId`. Most-recent first.
 *  By default excludes archived brands; pass `includeArchived` to override. */
export async function listBrandsForUser(
  userId: string,
  opts: { includeArchived?: boolean; limit?: number } = {}
): Promise<Brand[]> {
  const container = await getBrandsContainer();
  const limit = opts.limit ?? 100;
  const where = opts.includeArchived ? "" : "AND (NOT IS_DEFINED(c.archived) OR c.archived = false)";
  const { resources } = await container.items
    .query(
      {
        query: `SELECT * FROM c WHERE c.userId = @userId ${where} ORDER BY c.updatedAt DESC OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: "@userId", value: userId },
          { name: "@limit", value: limit },
        ],
      },
      { partitionKey: userId }
    )
    .fetchAll();
  return resources as Brand[];
}

/** Partial update. Always bumps `updatedAt`. Uses upsert so we never race on read-modify-write. */
export async function updateBrand(
  id: string,
  userId: string,
  patch: Partial<Omit<Brand, "id" | "userId" | "createdAt">>
): Promise<Brand | null> {
  const container = await getBrandsContainer();
  const current = await getBrand(id, userId);
  if (!current) return null;
  const next: Brand = {
    ...current,
    ...patch,
    // Deep-merge kit so callers can patch single fields like {kit: {primaryColor: "#fff"}}
    kit: patch.kit ? { ...current.kit, ...patch.kit } : current.kit,
    id,
    userId,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await container.items.upsert<Brand>(next);
  return (resource as Brand) ?? next;
}

/** Soft-archive a brand. Existing campaigns continue to resolve it. */
export async function archiveBrand(id: string, userId: string): Promise<void> {
  await updateBrand(id, userId, { archived: true });
}

/** Hard-delete — only used for cleanup of empty brands. Callers should
 *  ensure no campaigns reference the brand before calling. */
export async function hardDeleteBrand(id: string, userId: string): Promise<void> {
  const container = await getBrandsContainer();
  await container.item(id, userId).delete();
}

/**
 * Helper: derive a default-named Brand from a legacy nested BrandKit so we
 * can migrate campaigns that pre-date the Brand entity.
 */
export function brandFromLegacyKit(
  userId: string,
  brandName: string,
  kit: BrandKit
): Omit<Brand, "id" | "createdAt" | "updatedAt"> {
  return {
    userId,
    name: brandName || "Untitled Brand",
    kit: {
      colors: kit.colors || [],
      fonts: kit.fonts || [],
      logoUrl: kit.logoUrl,
      primaryColor: kit.primaryColor,
      secondaryColor: kit.secondaryColor,
      accentColor: kit.accentColor,
      displayFont: kit.displayFont,
      bodyFont: kit.bodyFont,
      toneOfVoice: kit.toneOfVoice,
      guidelines: kit.guidelines,
    },
  };
}
