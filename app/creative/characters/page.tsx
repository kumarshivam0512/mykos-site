"use client";

import { UserCircle } from "lucide-react";

export default function CharacterLibraryPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
          <UserCircle className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">Character Library</h1>
        <p className="text-muted-foreground max-w-md">
          Create and save reusable character profiles with detailed descriptions for consistent appearance across all your ad scenes.
        </p>
      </div>
    </main>
  );
}
