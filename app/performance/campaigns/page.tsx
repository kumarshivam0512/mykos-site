"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import type { Campaign } from "@/lib/db/campaigns";
import {
  ArrowLeft,
  Folder,
  Trash2,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function CampaignsPage() {
  const router = useRouter();
  const { setProductInput, setBrandKit, setBrief, setAssets, setPipelineStep } = useAdStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCampaigns(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadCampaign = (campaign: Campaign) => {
    setProductInput(campaign.productInput);
    setBrandKit(campaign.brandKit);
    setBrief(campaign.brief);
    setAssets({ images: [], variants: [], voiceoverUrl: undefined, videoUrl: undefined });
    setPipelineStep("idle");
    router.push("/creative/brief");
  };

  const handleDelete = async (id: string, brandName: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
      }
    } catch { /* ignore */ }
    setDeleting(null);
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/workspace")}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-primary" /> Campaign Library
            </h1>
            <p className="text-muted-foreground text-sm">
              {campaigns.length} saved campaign{campaigns.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/workspace")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2.5 rounded-xl flex items-center gap-2"
          >
            New Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No campaigns yet</p>
            <button
              onClick={() => router.push("/workspace")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl"
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadCampaign(campaign)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {campaign.brandName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{campaign.brandName}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {campaign.brief.productCategory} · {campaign.brief.adFormat.replace(/_/g, " ")} · {campaign.brief.duration}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 ml-13">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                    {campaign.brief.personas?.length > 0 && (
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                        {campaign.brief.personas.length} personas
                      </span>
                    )}
                    {campaign.brief.platformBriefs?.length > 0 && (
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                        {campaign.brief.platformBriefs.length} platforms
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => loadCampaign(campaign)}
                    className="bg-secondary hover:bg-secondary/80 text-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id, campaign.brandName)}
                    disabled={deleting === campaign.id}
                    className="text-muted-foreground hover:text-red-400 p-2 rounded-lg"
                  >
                    {deleting === campaign.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
