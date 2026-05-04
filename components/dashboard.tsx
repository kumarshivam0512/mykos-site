"use client";

import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import { useEffect, useState } from "react";
import type { Campaign } from "@/lib/db/campaigns";
import {
  Sparkles,
  BarChart3,
  FolderOpen,
  Target,
  ArrowRight,
  Zap,
  Clock,
  Building2,
  Palette,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { brief, productInput } = useAdStore();
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentCampaigns(data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const modules = [
    {
      title: "Brand Hub",
      description: "Set up your brand profile, audience personas, competitor analysis, and platform strategies",
      icon: <Building2 className="w-6 h-6" />,
      href: "/brand",
      color: "bg-blue-500/10 text-blue-400",
      status: brief ? `${productInput.name} active` : "Set up brand",
    },
    {
      title: "Creative Hub",
      description: "Build scenes, generate posters and video ads with AI — full creative control",
      icon: <Palette className="w-6 h-6" />,
      href: "/creative",
      color: "bg-purple-500/10 text-purple-400",
      status: "Scene Builder",
    },
    {
      title: "Performance Hub",
      description: "Track ad performance, optimize budgets, manage campaigns, get AI recommendations",
      icon: <TrendingUp className="w-6 h-6" />,
      href: "/performance",
      color: "bg-green-500/10 text-green-400",
      status: `${recentCampaigns.length} campaigns`,
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-3">
            <Zap className="w-3 h-3" /> AI-Powered Marketing Platform
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Mykos AI</h1>
          <p className="text-muted-foreground mt-1">
            Your virtual Digital Marketing Manager — strategy, creative, and performance in one place.
          </p>
        </div>

        {/* Quick Actions */}
        {!brief && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Get Started</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set up your brand and let AI analyze your audience, competitors, and platform strategies.
              </p>
            </div>
            <button
              onClick={() => router.push("/brand")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 rounded-xl flex items-center gap-2 shrink-0"
            >
              <Building2 className="w-4 h-4" /> Set Up Brand
            </button>
          </div>
        )}

        {/* Active Campaign */}
        {brief && (
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Current campaign</span>
              <h2 className="font-semibold text-lg">{productInput.name}</h2>
              <p className="text-sm text-muted-foreground">
                {brief.productCategory} · {brief.adFormat.replace(/_/g, " ")} · {brief.duration}s · {brief.personas?.length || 0} personas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/brand/audience")}
                className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl text-sm"
              >
                Brand Intel
              </button>
              <button
                onClick={() => router.push("/creative/generate")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Module Cards */}
        <div>
          <h2 className="font-medium text-muted-foreground text-sm mb-3">Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <button
                key={mod.title}
                onClick={() => router.push(mod.href)}
                className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center`}>
                    {mod.icon}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold mt-3">{mod.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                <span className="inline-block text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full mt-3">
                  {mod.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Campaigns */}
        {recentCampaigns.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-muted-foreground text-sm">Recent Campaigns</h2>
              <button
                onClick={() => router.push("/campaigns")}
                className="text-xs text-primary hover:text-primary/80"
              >
                View all
              </button>
            </div>
            <div className="space-y-2">
              {recentCampaigns.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    // Load campaign into store would go here
                    router.push("/campaigns");
                  }}
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {c.brandName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.brandName}</p>
                      <p className="text-xs text-muted-foreground">{c.brief.productCategory} · {c.brief.adFormat.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
