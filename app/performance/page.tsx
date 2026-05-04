"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, BarChart3, FolderOpen, Sparkles, ArrowRight } from "lucide-react";

export default function PerformancePage() {
  const router = useRouter();

  const modules = [
    { title: "Analytics", description: "Track spend, ROAS, CPA, and channel performance", icon: <BarChart3 className="w-6 h-6" />, href: "/performance/analytics", color: "bg-blue-500/10 text-blue-400" },
    { title: "Campaigns", description: "View and manage saved campaign briefs", icon: <FolderOpen className="w-6 h-6" />, href: "/performance/campaigns", color: "bg-green-500/10 text-green-400" },
    { title: "AI Recommendations", description: "Get AI-powered budget allocation and spend optimization", icon: <Sparkles className="w-6 h-6" />, href: "/performance/recommendations", color: "bg-purple-500/10 text-purple-400" },
  ];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" /> Performance Hub</h1>
          <p className="text-muted-foreground text-sm">Track ad performance, optimize budgets, and measure campaign impact.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <button key={mod.title} onClick={() => router.push(mod.href)}
              className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/30 transition-colors group">
              <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center`}>{mod.icon}</div>
              <h3 className="font-semibold mt-3">{mod.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
              <ArrowRight className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
