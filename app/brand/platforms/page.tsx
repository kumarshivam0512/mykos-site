"use client";

import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import { Globe, ArrowLeft } from "lucide-react";

export default function PlatformsPage() {
  const router = useRouter();
  const { brief, productInput } = useAdStore();

  if (!brief?.platformBriefs?.length) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Set up your brand first to see platform strategies.</p>
          <button onClick={() => router.push("/brand")} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl">Go to Brand Setup</button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <button onClick={() => router.push("/brand")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Brand Hub
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-6 h-6 text-primary" /> Platform Strategy</h1>
          <p className="text-muted-foreground text-sm">Platform-specific ad strategies for {productInput.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {brief.platformBriefs.map((pb, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-medium text-lg">{pb.platform}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-xs text-muted-foreground block">Format</span><span>{pb.format}</span></div>
                <div><span className="text-xs text-muted-foreground block">Duration</span><span>{pb.duration}s</span></div>
                <div className="col-span-2"><span className="text-xs text-muted-foreground block">Tone</span><span>{pb.tone}</span></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Hook (first 3s)</span>
                <p className="text-sm italic mt-1">&ldquo;{pb.hook}&rdquo;</p>
              </div>
              <div className="bg-primary/10 text-primary text-sm px-3 py-2 rounded-xl text-center font-medium">{pb.ctaText}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
