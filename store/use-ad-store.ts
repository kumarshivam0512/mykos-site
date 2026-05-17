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
} from "@/lib/types";

interface AdStore {
  // State
  productInput: ProductInput;
  brandKit: BrandKit;
  brief: CreativeBrief | null;
  assets: GeneratedAssets;
  pipeline: PipelineStatus;
  selectedAspectRatio: string;
  videoMode: VideoMode;
  /** Currently selected quality tier — drives WaveSpeed model routing. */
  selectedTier: QualityTier;

  // Actions
  setProductInput: (input: Partial<ProductInput>) => void;
  setBrandKit: (kit: Partial<BrandKit>) => void;
  setBrief: (brief: CreativeBrief) => void;
  updateBrief: (updates: Partial<CreativeBrief>) => void;
  setAssets: (assets: Partial<GeneratedAssets>) => void;
  setPipelineStep: (step: PipelineStep, message?: string) => void;
  setPipelineProgress: (progress: number) => void;
  setPipelineError: (error: string) => void;
  setAspectRatio: (ratio: string) => void;
  setVideoMode: (mode: VideoMode) => void;
  setTier: (tier: QualityTier) => void;
  reset: () => void;
}

const initialState = {
  productInput: { name: "", description: "" },
  brandKit: { colors: [], fonts: [] },
  brief: null,
  assets: { images: [], variants: [] },
  pipeline: { step: "idle" as PipelineStep, progress: 0, message: "" },
  selectedAspectRatio: "16:9",
  videoMode: "slideshow" as VideoMode,
  selectedTier: "premium" as QualityTier,
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
