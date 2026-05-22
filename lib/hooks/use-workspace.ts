"use client";

// ─── Workspace hooks (Workspace UX sprint) ──────────────────────
//
// The SINGLE READ/WRITE/SWITCH SURFACE. Every page that touches campaign data
// must go through these hooks — never raw Zustand reads or direct fetch calls.
// This contract prevents the clobbering bugs the audit found.
//
//   useActiveCampaign()      → { brand, campaign, isLoading, error, refresh }
//   useCampaignMutation()    → { save, status, lastSavedAt }
//   useWorkspaceSwitch()     → switchCampaign(id), switchBrand(id), clear()
//   useActiveBrand()         → { brand, isLoading, refresh } — for chrome-only pages
//
// Rules enforced by these hooks:
//   • URL `?c=<id>` is the source of truth for the active campaign
//   • Zustand mirrors URL state but never leads — URL writes win
//   • Cosmos owns durable state; Zustand is a render-time cache
//   • All writes are debounced (1s) and surfaced via `status` for UI affordance

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import {
  getCampaign,
  patchCampaign,
  getBrand,
  type CampaignRecord,
  ApiError,
} from "@/lib/workspace-client";
import type { Brand } from "@/lib/types";

// ─── Active campaign read path ──────────────────────────────────

export interface UseActiveCampaignResult {
  campaign: CampaignRecord | null;
  brand: Brand | null;
  isLoading: boolean;
  error: string | null;
  /** Force re-fetch from Cosmos. Use after a write you want immediately reflected. */
  refresh: () => Promise<void>;
}

/**
 * Resolve the active campaign by reading `?c=` from the URL, falling back to
 * the last-active id mirrored in Zustand. Fetches the full Campaign record
 * from Cosmos and hydrates the legacy slice of Zustand so existing code keeps
 * working during the migration.
 *
 * Reads/writes are idempotent — calling this hook in 3 components at once will
 * not 3× the fetch (in-flight requests are deduped via a module-level cache).
 */
export function useActiveCampaign(): UseActiveCampaignResult {
  const searchParams = useSearchParams();
  const urlCampaignId = searchParams.get("c");
  const storeCampaignId = useAdStore((s) => s.activeCampaignId);
  const hydrateCampaign = useAdStore((s) => s.hydrateCampaign);
  const setActiveIds = useAdStore((s) => s.setActiveIds);

  // URL wins. If absent, fall back to mirrored store value.
  const effectiveId = urlCampaignId ?? storeCampaignId;

  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const campaignRecord = await dedupedGetCampaign(id);
        setCampaign(campaignRecord);
        setActiveIds(campaignRecord.brandId ?? null, campaignRecord.id);
        hydrateCampaign({
          productInput: campaignRecord.productInput,
          brandKit: campaignRecord.brandKit,
          brief: campaignRecord.brief,
          assets: campaignRecord.assets,
          preferences: campaignRecord.preferences,
        });
        if (campaignRecord.brandId) {
          try {
            const b = await dedupedGetBrand(campaignRecord.brandId);
            setBrand(b);
          } catch {
            // Brand fetch failure is non-fatal — campaign still loads with nested kit.
            setBrand(null);
          }
        } else {
          setBrand(null);
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load campaign";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateCampaign, setActiveIds]
  );

  useEffect(() => {
    if (!effectiveId) {
      setCampaign(null);
      setBrand(null);
      return;
    }
    load(effectiveId);
  }, [effectiveId, load]);

  const refresh = useCallback(async () => {
    if (effectiveId) {
      invalidateCampaignCache(effectiveId);
      await load(effectiveId);
    }
  }, [effectiveId, load]);

  return { campaign, brand, isLoading, error, refresh };
}

// ─── Active brand (without requiring a campaign) ────────────────

export function useActiveBrand(brandIdOverride?: string | null): {
  brand: Brand | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const storeBrandId = useAdStore((s) => s.activeBrandId);
  const id = brandIdOverride ?? storeBrandId;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (brandId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const b = await dedupedGetBrand(brandId);
      setBrand(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load brand");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setBrand(null);
      return;
    }
    load(id);
  }, [id, load]);

  const refresh = useCallback(async () => {
    if (id) {
      invalidateBrandCache(id);
      await load(id);
    }
  }, [id, load]);

  return { brand, isLoading, error, refresh };
}

// ─── Mutation hook with debounced auto-save ─────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseCampaignMutationResult {
  /** Schedule a partial save. Debounced by `debounceMs`. */
  save: (patch: Partial<CampaignRecord>) => void;
  /** Force-flush any pending debounced save and wait for it. */
  flush: () => Promise<void>;
  status: SaveStatus;
  /** Timestamp of last successful save, or null. */
  lastSavedAt: number | null;
  /** Last error message if status === 'error'. */
  error: string | null;
}

/**
 * Debounced mutation hook. Coalesces rapid edits into one PATCH per debounce
 * window. Returns status the UI can show as "Saving… → Saved 2s ago".
 *
 * Patch payloads are MERGED on the client side too — if you call save({preferences: {tier: 'ultra'}})
 * then save({preferences: {aspectRatio: '9:16'}}) before the debounce fires,
 * one PATCH goes out with both fields, not just the last one.
 */
export function useCampaignMutation(opts: { debounceMs?: number } = {}): UseCampaignMutationResult {
  const debounceMs = opts.debounceMs ?? 1000;
  const activeId = useAdStore((s) => s.activeCampaignId);
  const broadcast = useAdStore((s) => s.setSaveStatus);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingPatch = useRef<Partial<CampaignRecord>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const flushNow = useCallback(async (): Promise<void> => {
    if (!activeId) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const patch = pendingPatch.current;
    pendingPatch.current = {};
    if (Object.keys(patch).length === 0) return;

    setStatus("saving");
    broadcast("saving");
    setError(null);
    try {
      const updated = await patchCampaign(activeId, patch);
      // Refresh cache so the next useActiveCampaign read returns the new state.
      campaignCache.set(activeId, { value: updated, fetchedAt: Date.now() });
      const now = Date.now();
      setStatus("saved");
      setLastSavedAt(now);
      broadcast("saved", now, null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setStatus("error");
      setError(msg);
      broadcast("error", undefined, msg);
    }
  }, [activeId, broadcast]);

  const save = useCallback(
    (patch: Partial<CampaignRecord>) => {
      // Merge into pending — deep-merge for known nested objects so two rapid
      // edits to different sub-fields don't clobber each other.
      pendingPatch.current = {
        ...pendingPatch.current,
        ...patch,
        productInput: patch.productInput
          ? { ...pendingPatch.current.productInput, ...patch.productInput }
          : pendingPatch.current.productInput,
        brandKit: patch.brandKit
          ? { ...pendingPatch.current.brandKit, ...patch.brandKit }
          : pendingPatch.current.brandKit,
        preferences: patch.preferences
          ? { ...pendingPatch.current.preferences, ...patch.preferences }
          : pendingPatch.current.preferences,
        assets: patch.assets
          ? { ...pendingPatch.current.assets, ...patch.assets }
          : pendingPatch.current.assets,
      };
      setStatus("saving");
      broadcast("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const p = flushNow();
        inFlight.current = p;
        p.finally(() => { inFlight.current = null; });
      }, debounceMs);
    },
    [debounceMs, flushNow, broadcast]
  );

  // Flush on unmount so a fast navigation away doesn't strand edits.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        // Best-effort — don't wait; the browser may already be tearing down.
        flushNow().catch(() => {});
      }
    };
  }, [flushNow]);

  return { save, flush: flushNow, status, lastSavedAt, error };
}

// ─── Switch hook ────────────────────────────────────────────────

export interface UseWorkspaceSwitchResult {
  switchCampaign: (campaignId: string) => void;
  switchBrand: (brandId: string) => void;
  /** Clear active campaign — used by "Start fresh" affordance. */
  clear: () => void;
}

/**
 * Switch the active campaign or brand. Updates the URL (`?c=`), the Zustand
 * mirror, and triggers a refetch in any mounted useActiveCampaign hook.
 *
 * NOTE: Switching a brand alone doesn't change the campaign — use this when
 * the user picks a brand for a NEW campaign, then call switchCampaign once
 * the campaign is created.
 */
export function useWorkspaceSwitch(): UseWorkspaceSwitchResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setActiveIds = useAdStore((s) => s.setActiveIds);
  const activeBrandId = useAdStore((s) => s.activeBrandId);

  const switchCampaign = useCallback(
    (campaignId: string) => {
      // Update URL — preserves the user's current page (Scene Builder, Video
      // Studio, etc.) but swaps the active campaign id.
      const params = new URLSearchParams(searchParams.toString());
      params.set("c", campaignId);
      router.push(`${pathname}?${params.toString()}`);
      // Update mirror immediately for snappy UI; useActiveCampaign will re-fetch.
      setActiveIds(activeBrandId, campaignId);
      invalidateCampaignCache(campaignId);
    },
    [router, pathname, searchParams, setActiveIds, activeBrandId]
  );

  const switchBrand = useCallback(
    (brandId: string) => {
      setActiveIds(brandId, null);
      invalidateBrandCache(brandId);
      // Strip campaign id from URL — brand changes implicitly mean "no active campaign"
      const params = new URLSearchParams(searchParams.toString());
      params.delete("c");
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams, setActiveIds]
  );

  const clear = useCallback(() => {
    setActiveIds(null, null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("c");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, searchParams, setActiveIds]);

  return { switchCampaign, switchBrand, clear };
}

// ─── Dedup + cache (module-level) ───────────────────────────────
// Prevents N components mounted at once from all firing the same GET.
// 30s TTL — short enough that fresh switches feel live, long enough that
// re-renders from setState don't refetch on every keystroke.

interface CacheEntry<T> { value: T; fetchedAt: number }
const CACHE_TTL_MS = 30_000;

const campaignCache = new Map<string, CacheEntry<CampaignRecord>>();
const campaignInFlight = new Map<string, Promise<CampaignRecord>>();

async function dedupedGetCampaign(id: string): Promise<CampaignRecord> {
  const cached = campaignCache.get(id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.value;
  const existing = campaignInFlight.get(id);
  if (existing) return existing;
  const p = getCampaign(id)
    .then((v) => {
      campaignCache.set(id, { value: v, fetchedAt: Date.now() });
      return v;
    })
    .finally(() => { campaignInFlight.delete(id); });
  campaignInFlight.set(id, p);
  return p;
}

function invalidateCampaignCache(id: string): void {
  campaignCache.delete(id);
}

const brandCache = new Map<string, CacheEntry<Brand>>();
const brandInFlight = new Map<string, Promise<Brand>>();

async function dedupedGetBrand(id: string): Promise<Brand> {
  const cached = brandCache.get(id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.value;
  const existing = brandInFlight.get(id);
  if (existing) return existing;
  const p = getBrand(id)
    .then((v) => {
      brandCache.set(id, { value: v, fetchedAt: Date.now() });
      return v;
    })
    .finally(() => { brandInFlight.delete(id); });
  brandInFlight.set(id, p);
  return p;
}

function invalidateBrandCache(id: string): void {
  brandCache.delete(id);
}
