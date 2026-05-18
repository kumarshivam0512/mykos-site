"use client";

import type { QualityTier } from "@/lib/types";
import { Zap, Sparkles, Crown } from "lucide-react";

interface TierOption {
  id: QualityTier;
  label: string;
  icon: React.ReactNode;
  imageModel: string;
  videoModel: string;
  perScene: string;
  per5SecClip: string;
  bestFor: string;
  accentClass: string; // border color when selected
}

const TIERS: TierOption[] = [
  {
    id: "budget",
    label: "Budget",
    icon: <Zap className="w-4 h-4" />,
    imageModel: "Z-Image Turbo",
    videoModel: "Wan 2.2 Ultra Fast",
    perScene: "$0.005",
    per5SecClip: "$0.05",
    bestFor: "Drafts, A/B variants, bulk",
    accentClass: "border-emerald-500 bg-emerald-500/10",
  },
  {
    id: "premium",
    label: "Premium",
    icon: <Sparkles className="w-4 h-4" />,
    imageModel: "Nano Banana 2",
    videoModel: "Kling v2.5 Turbo Pro",
    perScene: "$0.07",
    per5SecClip: "$0.42",
    bestFor: "Production ads — photoreal, character consistency, native audio",
    accentClass: "border-primary bg-primary/10",
  },
  {
    id: "ultra",
    label: "Ultra",
    icon: <Crown className="w-4 h-4" />,
    imageModel: "Nano Banana Pro",
    videoModel: "Seedance 2.0",
    perScene: "$0.14",
    per5SecClip: "$0.75",
    bestFor: "Hero campaigns — broadcast quality, director-level control",
    accentClass: "border-amber-500 bg-amber-500/10",
  },
];

interface QualityTierSelectorProps {
  value: QualityTier;
  onChange: (tier: QualityTier) => void;
  /** Compact variant hides the description / cost lines. */
  compact?: boolean;
  /** Override the section title. */
  title?: string;
}

export function QualityTierSelector({ value, onChange, compact = false, title = "Quality Tier" }: QualityTierSelectorProps) {
  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            System auto-picks the best model per use case
          </span>
        </div>
      )}
      <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3"} gap-2`}>
        {TIERS.map((tier) => {
          const isSelected = value === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              className={`text-left rounded-xl border-2 transition-all p-3 ${
                isSelected ? tier.accentClass : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-medium text-sm">
                  {tier.icon}
                  {tier.label}
                </div>
                {!compact && (
                  <span className="text-[10px] text-muted-foreground">
                    {tier.perScene}/img · {tier.per5SecClip}/clip
                  </span>
                )}
              </div>
              {!compact && (
                <>
                  <div className="text-[11px] text-muted-foreground mb-1">
                    <span className="text-foreground/70">Image:</span> {tier.imageModel}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">
                    <span className="text-foreground/70">Video:</span> {tier.videoModel}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 leading-tight">{tier.bestFor}</div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
