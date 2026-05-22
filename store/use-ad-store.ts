import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ProductInput,
  BrandKit,
  CreativeBrief,
  GeneratedAssets,
  PipelineStatus,
  PipelineStep,
  VideoMode,
  QualityTier,
  AspectRatio,
} from "@/lib/types";

interface AdStore {
  // State
  productInput: ProductInput;
  brandKit: BrandKit;
  brief: CreativeBrief | null;
  assets: GeneratedAssets;
  pipeline: PipelineStatus;
  selectedAspectRatio: AspectRatio;
  videoMode: VideoMode;
  /** Currently selected quality tier — drives WaveSpeed model routing. */
  selectedTier: QualityTier;
  /** Active workspace IDs (Workspace UX sprint). Source of truth lives in the
   *  URL `?c=` param; the store keeps a mirror so deep links + sidebar reads
   *  stay in sync without re-parsing on every render. Null = no active. */
  activeBrandId: string | null;
  activeCampaignId: string | null;
  /** Global save status — written by useCampaignMutation so the TopBar can show
   *  "Saving…" / "Saved 2s ago" regardless of which page is open. */
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: number | null;
  saveError: string | null;

  // Actions
  setProductInput: (input: Partial<ProductInput>) => void;
  setBrandKit: (kit: Partial<BrandKit>) => void;
  setBrief: (brief: CreativeBrief) => void;
  updateBrief: (updates: Partial<CreativeBrief>) => void;
  setAssets: (assets: Partial<GeneratedAssets>) => void;
  setPipelineStep: (step: PipelineStep, message?: string) => void;
  setPipelineProgress: (progress: number) => void;
  setPipelineError: (error: string) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setVideoMode: (mode: VideoMode) => void;
  setTier: (tier: QualityTier) => void;
  setActiveIds: (brandId: string | null, campaignId: string | null) => void;
  /** Broadcasts mutation status so the TopBar's save indicator stays in sync
   *  no matter which page triggered the save. */
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error", lastSavedAt?: number | null, error?: string | null) => void;
  /** Hydrate the entire campaign-scoped slice from a fetched Campaign record.
   *  Used by useActiveCampaign() on mount and after switch. */
  hydrateCampaign: (campaign: {
    productInput: ProductInput;
    brandKit: BrandKit;
    brief: CreativeBrief | null;
    assets?: GeneratedAssets;
    preferences?: {
      tier?: QualityTier;
      aspectRatio?: AspectRatio;
      videoMode?: VideoMode;
    };
  }) => void;
  reset: () => void;
}

const initialState = {
  productInput: { name: "", description: "" },
  brandKit: { colors: [], fonts: [] },
  brief: null,
  assets: { images: [], variants: [] },
  pipeline: { step: "idle" as PipelineStep, progress: 0, message: "" },
  selectedAspectRatio: "16:9" as AspectRatio,
  videoMode: "slideshow" as VideoMode,
  selectedTier: "premium" as QualityTier,
  activeBrandId: null,
  activeCampaignId: null,
  saveStatus: "idle" as "idle" | "saving" | "saved" | "error",
  lastSavedAt: null as number | null,
  saveError: null as string | null,
};

export const useAdStore = create<AdStore>()(
  persist(
    (set) => ({
      ...initialState,

      setProductInput: (input) =>
        set((s) => ({ productInput: { ...s.productInput, ...input } })),

      setBrandKit: (kit) =>
        set((s) => ({ brandKit: { ...s.brandKit, ...kit } })),

      setBrief: (brief) => set({ brief }),

      updateBrief: (updates) =>
        set((s) => ({
          brief: s.brief ? { ...s.brief, ...updates } : null,
        })),

      setAssets: (assets) =>
        set((s) => ({ assets: { ...s.assets, ...assets } })),

      setPipelineStep: (step, message = "") =>
        set({ pipeline: { step, progress: 0, message } }),

      setPipelineProgress: (progress) =>
        set((s) => ({ pipeline: { ...s.pipeline, progress } })),

      setPipelineError: (error) =>
        set({ pipeline: { step: "error", progress: 0, message: "", error } }),

      setAspectRatio: (ratio) => set({ selectedAspectRatio: ratio }),

      setVideoMode: (mode) => set({ videoMode: mode }),

      setTier: (tier) => set({ selectedTier: tier }),

      setActiveIds: (brandId, campaignId) =>
        set({ activeBrandId: brandId, activeCampaignId: campaignId }),

      setSaveStatus: (status, lastSavedAt, error) =>
        set((s) => ({
          saveStatus: status,
          lastSavedAt: lastSavedAt !== undefined ? lastSavedAt : s.lastSavedAt,
          saveError: error !== undefined ? error : (status === "error" ? s.saveError : null),
        })),

      hydrateCampaign: (campaign) =>
        set((s) => ({
          productInput: campaign.productInput,
          brandKit: campaign.brandKit,
          brief: campaign.brief,
          assets: campaign.assets ?? { images: [], variants: [] },
          // Per-campaign preferences override the global defaults but only for
          // this hydration — global tier/aspect ratio are kept as fallback.
          selectedTier: campaign.preferences?.tier ?? s.selectedTier,
          selectedAspectRatio: campaign.preferences?.aspectRatio ?? s.selectedAspectRatio,
          videoMode: campaign.preferences?.videoMode ?? s.videoMode,
          pipeline: { step: "idle", progress: 0, message: "" },
        })),

      reset: () => set(initialState),
    }),
    {
      name: "mykos-ad-store",
      // On rehydrate: if pipeline was mid-run, reset to idle (keep assets)
      onRehydrateStorage: () => (state) => {
        if (state && state.pipeline.step !== "complete" && state.pipeline.step !== "idle") {
          state.pipeline = { step: "idle", progress: 0, message: "Restored from previous session" };
        }
      },
    }
  )
);
