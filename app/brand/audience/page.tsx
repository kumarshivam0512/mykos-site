"use client";

import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import {
  ArrowLeft,
  UserCircle,
  Target,
  Globe,
  Swords,
  ShoppingCart,
  Heart,
  Zap,
  MessageCircle,
} from "lucide-react";

export default function AudiencePage() {
  const router = useRouter();
  const { brief, productInput } = useAdStore();

  if (!brief) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Generate a brief first to see audience insights.</p>
          <button onClick={() => router.push("/")} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl">
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push("/creative/brief")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Brief
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> Customer Intelligence
          </h1>
          <p className="text-muted-foreground">
            Deep audience analysis for <span className="text-primary font-medium">{productInput.name}</span>
          </p>
        </div>

        {/* Audience Overview */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Audience Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Age Range" value={brief.targetAudience.ageRange} />
            <StatCard label="Gender" value={brief.targetAudience.gender} />
            <StatCard label="Platforms" value={brief.targetAudience.platforms.length.toString()} sub={brief.targetAudience.platforms.join(", ")} />
            <StatCard label="Category" value={brief.productCategory} />
          </div>
          <div className="mt-4">
            <span className="text-xs text-muted-foreground">Psychographics</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {brief.targetAudience.psychographics.map((p) => (
                <span key={p} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Buyer Personas — Full Detail */}
        {brief.personas?.length > 0 && (
          <div>
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" /> Buyer Personas ({brief.personas.length})
            </h2>
            <div className="space-y-4">
              {brief.personas.map((persona, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                      {persona.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold">{persona.name}</h3>
                        <span className="text-sm text-muted-foreground">Age {persona.age}</span>
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{persona.location}</span>
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{persona.income}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Pain Points */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                            <Zap className="w-3 h-3" /> Pain Points
                          </h4>
                          <ul className="space-y-1">
                            {persona.painPoints.map((p, j) => (
                              <li key={j} className="text-sm flex items-start gap-2">
                                <span className="text-red-400 mt-0.5 shrink-0">•</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Motivations */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                            <Heart className="w-3 h-3" /> Motivations
                          </h4>
                          <ul className="space-y-1">
                            {persona.motivations.map((m, j) => (
                              <li key={j} className="text-sm flex items-start gap-2">
                                <span className="text-green-400 mt-0.5 shrink-0">•</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Content Preferences */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                            <MessageCircle className="w-3 h-3" /> Content Preferences
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {persona.contentPreferences.map((c, j) => (
                              <span key={j} className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded">{c}</span>
                            ))}
                          </div>
                        </div>

                        {/* Purchase Triggers */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                            <ShoppingCart className="w-3 h-3" /> Purchase Triggers
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {persona.purchaseTriggers.map((t, j) => (
                              <span key={j} className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Ad Angle */}
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                        <h4 className="text-xs font-medium text-primary mb-1">Recommended Ad Angle</h4>
                        <p className="text-sm italic">&ldquo;{persona.adAngle}&rdquo;</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Strategy */}
        {brief.platformBriefs?.length > 0 && (
          <div>
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Platform Strategy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {brief.platformBriefs.map((pb, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <h3 className="font-medium text-lg">{pb.platform}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Format</span>
                      <span>{pb.format}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Duration</span>
                      <span>{pb.duration}s</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block">Tone</span>
                      <span>{pb.tone}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Hook (first 3s)</span>
                    <p className="text-sm italic mt-1 text-foreground">&ldquo;{pb.hook}&rdquo;</p>
                  </div>
                  <div className="bg-primary/10 text-primary text-sm px-3 py-2 rounded-xl text-center font-medium">
                    {pb.ctaText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Analysis — Expanded */}
        {brief.competitorAnalysis && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" /> Competitive Analysis: {brief.competitorAnalysis.competitorName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Their Positioning</h4>
                <p className="text-sm">{brief.competitorAnalysis.theirPositioning}</p>
                <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">Their Audience</h4>
                <p className="text-sm">{brief.competitorAnalysis.theirAudience}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Differentiators</h4>
                <ul className="space-y-2">
                  {brief.competitorAnalysis.differentiators.map((d, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-400 mt-0.5 shrink-0 font-bold">+</span> {d}
                    </li>
                  ))}
                </ul>
                <h4 className="text-sm font-medium text-muted-foreground mt-4 mb-2">Attack Angles for Ads</h4>
                <ul className="space-y-2">
                  {brief.competitorAnalysis.attackAngles.map((a, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0 font-bold">→</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-secondary/50 rounded-xl p-3">
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="text-lg font-semibold capitalize">{value}</span>
      {sub && <span className="text-xs text-muted-foreground block mt-0.5">{sub}</span>}
    </div>
  );
}
