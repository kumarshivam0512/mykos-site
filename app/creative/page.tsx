"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import {
  Palette,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SceneInput {
  id: string;
  mood: string;
  setting: string;
  characterAction: string;
  productPlacement: string;
  cameraAngle: string;
  lighting: string;
  colorGrade: string;
}

const MOODS = ["Aspirational", "Energetic", "Calm", "Luxurious", "Playful", "Gritty", "Professional", "Warm", "Dramatic", "Minimal"];
const CAMERA_ANGLES = ["Close-up, eye-level", "Wide shot, eye-level", "Medium shot, three-quarter", "Low angle, heroic", "Overhead, top-down", "Macro detail", "Profile, side view", "Over-the-shoulder"];
const LIGHTING_PRESETS = ["Golden hour backlight", "Studio softbox, key + fill", "Natural window light", "Dramatic rim light", "Neon-lit, moody", "Bright and airy", "Warm practical lamps", "Cool clinical"];
const COLOR_GRADES = ["Warm cinematic", "Cool clinical", "Orange-teal", "Desaturated matte", "Vibrant saturated", "Warm desaturated", "Moody dark", "Bright pastel"];

function createEmptyScene(): SceneInput {
  return {
    id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    mood: "Aspirational",
    setting: "",
    characterAction: "",
    productPlacement: "",
    cameraAngle: "Medium shot, three-quarter",
    lighting: "Studio softbox, key + fill",
    colorGrade: "Warm cinematic",
  };
}

export default function SceneBuilderPage() {
  const router = useRouter();
  const { productInput, brandKit, brief } = useAdStore();

  const [scenes, setScenes] = useState<SceneInput[]>([createEmptyScene()]);
  const [expandedScene, setExpandedScene] = useState<string | null>(scenes[0]?.id);
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ sceneId: string; url: string; sourceUrl?: string }[]>([]);
  const [error, setError] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const addScene = () => {
    const newScene = createEmptyScene();
    setScenes([...scenes, newScene]);
    setExpandedScene(newScene.id);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 1) return;
    setScenes(scenes.filter((s) => s.id !== id));
    setGeneratedImages(generatedImages.filter((g) => g.sceneId !== id));
  };

  const updateScene = (id: string, updates: Partial<SceneInput>) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const generateSceneImages = useCallback(async () => {
    if (!productInput.name) {
      setError("Set up your brand first in the Brand Hub");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      // Upload product image if provided
      if (productImage && !productImageUrl) {
        const formData = new FormData();
        formData.append("file", productImage);
        formData.append("type", "product");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          setProductImageUrl(url);
        }
      }

      // Generate image for each scene using the scene-to-prompt API
      const res = await fetch("/api/scene-to-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes,
          productName: productInput.name,
          productDescription: productInput.description,
          brandColors: brandKit.colors,
          sceneBackdrop: brief?.sceneBackdrop,
          characterSheet: brief?.characterSheet,
          hasProductImage: !!productImageUrl || !!productImage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate scenes");
      }

      const data = await res.json();
      setGeneratedImages(
        data.images.map((img: { url: string; sourceUrl?: string }, i: number) => ({
          sceneId: scenes[i]?.id || `scene_${i}`,
          url: img.url,
          sourceUrl: img.sourceUrl,
        }))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [scenes, productInput, brandKit, brief, productImage, productImageUrl]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-2">
            <Palette className="w-3 h-3" /> Creative Hub
          </div>
          <h1 className="text-2xl font-bold">Scene Builder</h1>
          <p className="text-muted-foreground text-sm">
            Build scenes with creative control. Each scene becomes a poster or video clip.
            {productInput.name && (
              <span className="text-primary ml-1">Brand: {productInput.name}</span>
            )}
          </p>
        </div>

        {/* Product & Logo Upload */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Assets</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Product Image</label>
              <label className="flex items-center gap-2 bg-secondary border border-dashed border-border rounded-xl px-3 py-2 cursor-pointer hover:border-primary/50 text-sm">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground truncate">{productImage ? productImage.name : "Upload product photo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Logo</label>
              <label className="flex items-center gap-2 bg-secondary border border-dashed border-border rounded-xl px-3 py-2 cursor-pointer hover:border-primary/50 text-sm">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground truncate">{logoFile ? logoFile.name : "Upload logo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
        </div>

        {/* Scenes */}
        <div className="space-y-3">
          {scenes.map((scene, idx) => {
            const isExpanded = expandedScene === scene.id;
            const generatedImg = generatedImages.find((g) => g.sceneId === scene.id);

            return (
              <div key={scene.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Scene Header */}
                <button
                  onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">
                      S{idx + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {scene.mood} · {scene.cameraAngle.split(",")[0]}
                    </span>
                    {generatedImg && (
                      <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Generated</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {scenes.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                        className="text-muted-foreground hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Scene Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Mood */}
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Mood</label>
                        <select value={scene.mood} onChange={(e) => updateScene(scene.id, { mood: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      {/* Camera Angle */}
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Camera Angle</label>
                        <select value={scene.cameraAngle} onChange={(e) => updateScene(scene.id, { cameraAngle: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {CAMERA_ANGLES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* Lighting */}
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Lighting</label>
                        <select value={scene.lighting} onChange={(e) => updateScene(scene.id, { lighting: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {LIGHTING_PRESETS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Color Grade */}
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Color Grade</label>
                        <select value={scene.colorGrade} onChange={(e) => updateScene(scene.id, { colorGrade: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {COLOR_GRADES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Setting */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Setting / Environment</label>
                      <textarea value={scene.setting} onChange={(e) => updateScene(scene.id, { setting: e.target.value })}
                        placeholder="e.g., Modern gym with floor-to-ceiling windows, polished concrete floors, morning light"
                        rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                    </div>

                    {/* Character Action */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Character / Subject Action</label>
                      <textarea value={scene.characterAction} onChange={(e) => updateScene(scene.id, { characterAction: e.target.value })}
                        placeholder="e.g., Athletic man holds protein shaker at chest height, looking at camera with confident expression"
                        rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                    </div>

                    {/* Product Placement */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Product Placement</label>
                      <textarea value={scene.productPlacement} onChange={(e) => updateScene(scene.id, { productPlacement: e.target.value })}
                        placeholder="e.g., Product held in right hand, label facing camera, centered in frame"
                        rows={1} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                    </div>

                    {/* Generated Image Preview */}
                    {generatedImg && (
                      <div className="rounded-xl overflow-hidden border border-border">
                        <img src={generatedImg.url} alt={`Scene ${idx + 1}`} className="w-full aspect-video object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Scene */}
          <button onClick={addScene}
            className="w-full border border-dashed border-border rounded-2xl py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30">
            <Plus className="w-4 h-4" /> Add Scene
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Generate Button */}
        <button onClick={generateSceneImages} disabled={generating}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg">
          {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating scenes...</>
            : <><Sparkles className="w-5 h-5" /> Generate Scene Images</>}
        </button>

        {/* Actions after generation */}
        {generatedImages.length > 0 && !generating && (
          <div className="flex gap-3">
            <button onClick={() => router.push("/creative/poster")}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" /> Create Poster
            </button>
            <button onClick={() => router.push("/creative/video")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" /> Create Video
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
