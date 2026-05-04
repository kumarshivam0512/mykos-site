"use client";

import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import { Swords, ArrowLeft } from "lucide-react";

export default function CompetitorsPage() {
  const router = useRouter();
  const { brief, productInput } = useAdStore();

  if (!brief?.competitorAnalysis) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Set up your brand first to see competitor analysis.</p>
          <button onClick={() => router.push("/brand")} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl">Go to Brand Setup</button>
        </div>
      </main>
    );
  }

  const ca = brief.competitorAnalysis;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <button onClick={() => router.push("/brand")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Brand Hub
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Swords className="w-6 h-6 text-primary" /> Competitor Analysis</h1>
          <p className="text-muted-foreground text-sm">{productInput.name} vs {ca.competitorName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-medium mb-3">Their Positioning</h3>
            <p className="text-sm text-muted-foreground">{ca.theirPositioning}</p>
            <h3 className="font-medium mt-4 mb-2">Their Audience</h3>
            <p className="text-sm text-muted-foreground">{ca.theirAudience}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-medium mb-3 text-green-400">Your Differentiators</h3>
            <ul className="space-y-2">
              {ca.differentiators.map((d, i) => (
                <li key={i} className="text-sm flex items-start gap-2"><span className="text-green-400 font-bold mt-0.5">+</span> {d}</li>
              ))}
            </ul>
            <h3 className="font-medium mt-4 mb-2 text-primary">Attack Angles</h3>
            <ul className="space-y-2">
              {ca.attackAngles.map((a, i) => (
                <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary font-bold mt-0.5">→</span> {a}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
