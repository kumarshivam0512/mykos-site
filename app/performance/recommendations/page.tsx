"use client";

import { Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold">AI Recommendations</h1>
        <p className="text-muted-foreground max-w-md">
          Add performance data in Analytics first, then get AI-powered budget allocation, channel optimization, and spend recommendations.
        </p>
      </div>
    </main>
  );
}
