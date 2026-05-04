"use client";

import { Image, Palette } from "lucide-react";

export default function PosterStudioPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
          <Image className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold">Poster Studio</h1>
        <p className="text-muted-foreground max-w-md">
          Generate scenes first in the Scene Builder, then convert them into posters with text overlays, logo placement, and multi-format export.
        </p>
      </div>
    </main>
  );
}
