"use client";

import { Video } from "lucide-react";

export default function VideoStudioPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
          <Video className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold">Video Studio</h1>
        <p className="text-muted-foreground max-w-md">
          Select scenes from the Scene Builder, add camera motion, generate AI video clips, and assemble your final ad with voiceover.
        </p>
      </div>
    </main>
  );
}
