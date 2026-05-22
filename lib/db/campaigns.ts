import { getCampaignsContainer } from "./cosmos";
import type {
  CreativeBrief,
  ProductInput,
  BrandKit,
  GeneratedAssets,
  QualityTier,
  AspectRatio,
  VideoMode,
} from "@/lib/types";
import { createBrand, brandFromLegacyKit, getBrand } from "./brands";

/**
 * Campaign — the unit of work for a single product/ad in a single brand.
 *
 * Schema versioning:
 *   - v1 (legacy): nested `brandKit`, no `brandId`, no `assets`/`sceneMotions`/`preferences`
 *   - v2 (Workspace UX sprint): `brandId` resolves to a Brand record; nested `brandKit`
 *     kept as a fallback for one-tap rollback and back-compat with older clients
 *
 * Partition key is `/brandName` (cannot be changed on existing container — Cosmos
 * limitation). For new campaigns we set `brandName = brand.name` so queries by
 * brandName keep working. Cross-partition queries are used when looking up by id.
 */
export interface Campaign {
  id: string;
  brandName: string;                            // partition key — mirrors brand.name
  /** v2: link to the owning Brand. Optional only for legacy records. */
  brandId?: string;
  /** v2: who owns this campaign. Optional only for legacy records. */
  userId?: string;
  productInput: ProductInput;
  /** Legacy nested kit — v2 prefers reading via brandId. Kept for back-compat. */
  brandKit: BrandKit;
  brief: CreativeBrief;
  competitorName?: string;

  // ─── v2 fields (Workspace UX sprint) — all optional for back-compat ─────
  /** Per-scene motion settings persisted alongside the campaign so reloads
   *  bring back camera moves, durations, on-screen text overlays. */
  sceneMotions?: {
    cameraMove?: string;
    motionPrompt?: string;
    duration?: number;
    overlayText?: string;
    overlayPosition?: "top" | "center" | "lower-third" | "bottom";
    overlayWithBar?: boolean;
  }[];
  /** Asset URLs (NOT binaries). Binaries live in /public/output today,
   *  Cloudflare R2 in Phase 6. URLs make the swap free of app rewrites. */
  assets?: GeneratedAssets;
  /** Per-campaign preferences. Distinct from global UI prefs (which stay in localStorage). */
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
  /** Lifecycle: draft (no clips), in-progress (some clips), complete (finalVideo exists), archived. */
  status?: "draft" | "in_progress" | "complete" | "archived";

  createdAt: string;
  updatedAt: string;
}

export async function saveCampaign(
  campaign: Omit<Campaign, "id" | "createdAt" | "updatedAt">
): Promise<Campaign> {
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

/** List campaigns owned by a specific user across all their brands.
 *  Cross-partition query — fine at our scale (≤ few-hundred-per-user). */
export async function listCampaignsForUser(userId: string, limit = 100): Promise<Campaign[]> {
  const container = await getCampaignsContainer();
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC OFFSET 0 LIMIT @limit",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@limit", value: limit },
      ],
    })
    .fetchAll();
  return resources as Campaign[];
}

/** List campaigns under a specific brand. Most-recent-edited first. */
export async function listCampaignsForBrand(brandId: string, limit = 100): Promise<Campaign[]> {
  const container = await getCampaignsContainer();
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.brandId = @brandId ORDER BY c.updatedAt DESC OFFSET 0 LIMIT @limit",
      parameters: [
        { name: "@brandId", value: brandId },
        { name: "@limit", value: limit },
      ],
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

/**
 * Partial update — deep-merges nested fields like preferences/brief/assets so
 * callers can patch a single sub-field without round-tripping the whole doc.
 * Always bumps updatedAt. Uses upsert to avoid lost-update races.
 */
export async function updateCampaign(
  id: string,
  patch: Partial<Omit<Campaign, "id" | "createdAt" | "brandName">>
): Promise<Campaign | null> {
  const current = await getCampaign(id);
  if (!current) return null;
  const container = await getCampaignsContainer();
  const next: Campaign = {
    ...current,
    ...patch,
    id: current.id,
    brandName: current.brandName, // partition key is immutable per doc
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    // Deep merges for nested objects so a patch like {preferences: {tier: "ultra"}}
    // doesn't blow away every other preference.
    productInput: patch.productInput
      ? { ...current.productInput, ...patch.productInput }
      : current.productInput,
    brandKit: patch.brandKit
      ? { ...current.brandKit, ...patch.brandKit }
      : current.brandKit,
    brief: patch.brief ? { ...current.brief, ...patch.brief } : current.brief,
    assets: patch.assets
      ? { ...(current.assets ?? { images: [], variants: [] }), ...patch.assets }
      : current.assets,
    preferences: patch.preferences
      ? { ...(current.preferences ?? {}), ...patch.preferences }
      : current.preferences,
  };
  const { resource } = await container.items.upsert<Campaign>(next);
  return (resource as Campaign) ?? next;
}

export async function deleteCampaign(id: string, brandName: string): Promise<void> {
  const container = await getCampaignsContainer();
  await container.item(id, brandName).delete();
}

/**
 * Migration helper: take a legacy v1 campaign (no `brandId`) and ensure a
 * matching Brand record exists for `userId`. Returns the brandId to patch
 * back onto the campaign. Idempotent — if the campaign already has a brandId
 * that resolves, just returns it.
 *
 * Strategy:
 *   1. If campaign.brandId exists and resolves → return it
 *   2. Else look for an existing Brand under userId with the same name
 *   3. Else create a fresh Brand from the campaign's nested brandKit
 */
export async function ensureBrandForLegacyCampaign(
  campaign: Campaign,
  userId: string
): Promise<string> {
  if (campaign.brandId) {
    const existing = await getBrand(campaign.brandId, userId);
    if (existing) return existing.id;
  }
  // Lookup-by-name within user's brands. Lazy-imported to avoid circular dep.
  const { listBrandsForUser } = await import("./brands");
  const usersBrands = await listBrandsForUser(userId);
  const byName = usersBrands.find(
    (b) => b.name.toLowerCase() === (campaign.brandName || "").toLowerCase()
  );
  if (byName) return byName.id;
  // Fresh brand from the legacy kit
  const seed = brandFromLegacyKit(userId, campaign.brandName, campaign.brandKit);
  const created = await createBrand(seed);
  return created.id;
}
