"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import type { Character } from "@/lib/db/characters";
import type { Location } from "@/lib/db/locations";
import { QualityTierSelector } from "@/components/quality-tier-selector";
import { AD_TYPE_LABELS, type AdType } from "@/lib/templates/golden-templates";
import { estimatePreflightCost, formatDuration } from "@/lib/providers/tier-selector";
import { ASPECT_RATIO_LABELS, ASPECT_RATIO_CLASS, type AspectRatio } from "@/lib/types";
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
  UserCircle,
  MapPin,
  X,
  Camera,
  Wand2,
} from "lucide-react";

interface RealismSettings {
  filmGrain: boolean;
  lensImperfections: boolean; // chromatic aberration, vignette, subtle flare
  depthOfField: boolean;       // shallow DOF with bokeh
  atmosphericEffects: boolean; // dust particles, haze, light rays
  skinDetail: boolean;         // pores, blemishes, fine hair
  environmentalDetail: boolean; // scratches, wear, weathering on surfaces
  naturalMotion: boolean;       // micro-movement hints: fabric settling, hair wisps
  imperfectComposition: boolean; // slightly off-center, rule-of-thirds tension
}

const REALISM_DEFAULTS: RealismSettings = {
  filmGrain: false,
  lensImperfections: false,
  depthOfField: true,
  atmosphericEffects: false,
  skinDetail: true,
  environmentalDetail: false,
  naturalMotion: false,
  imperfectComposition: false,
};

const REALISM_PRESETS: Record<string, { label: string; desc: string; settings: RealismSettings }> = {
  off: {
    label: "Standard",
    desc: "Clean AI-optimized output",
    settings: { filmGrain: false, lensImperfections: false, depthOfField: false, atmosphericEffects: false, skinDetail: false, environmentalDetail: false, naturalMotion: false, imperfectComposition: false },
  },
  photo: {
    label: "Photorealistic",
    desc: "Depth of field + skin detail + natural surfaces",
    settings: { filmGrain: false, lensImperfections: false, depthOfField: true, atmosphericEffects: false, skinDetail: true, environmentalDetail: true, naturalMotion: false, imperfectComposition: false },
  },
  cinematic: {
    label: "Cinematic",
    desc: "Film grain + lens effects + atmospheric haze",
    settings: { filmGrain: true, lensImperfections: true, depthOfField: true, atmosphericEffects: true, skinDetail: true, environmentalDetail: true, naturalMotion: false, imperfectComposition: false },
  },
  raw: {
    label: "Ultra Raw",
    desc: "Maximum realism — all imperfections enabled",
    settings: { filmGrain: true, lensImperfections: true, depthOfField: true, atmosphericEffects: true, skinDetail: true, environmentalDetail: true, naturalMotion: true, imperfectComposition: true },
  },
};

interface SceneInput {
  id: string;
  mood: string;
  setting: string;
  characterAction: string;
  productPlacement: string;
  cameraAngle: string;
  lighting: string;
  colorGrade: string;
  /** Face/subject reference photo URL (Character Library or per-scene upload). */
  characterRefUrl?: string;
  /** Label for UI display: which character this ref came from, or "Your upload". */
  characterRefLabel?: string;
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

// ─── Helper: Convert library items to prompt-ready text ──────────
function characterToSheet(c: Character): string {
  return [
    `${c.gender}, ${c.age} years old, ${c.ethnicity}, ${c.build}`,
    c.face ? `Face: ${c.face}` : "",
    c.hair ? `Hair: ${c.hair}` : "",
    c.outfit ? `Outfit: ${c.outfit}` : "",
    c.skinDetails ? `Skin: ${c.skinDetails}` : "",
    c.expression ? `Expression: ${c.expression}` : "",
    c.accessories ? `Accessories: ${c.accessories}` : "",
  ].filter(Boolean).join(". ");
}

function locationToSheet(l: Location): string {
  return [
    `${l.type} location: ${l.setting}`,
    l.timeOfDay ? `Time: ${l.timeOfDay}` : "",
    l.lighting ? `Lighting: ${l.lighting}` : "",
    l.surfaces ? `Surfaces: ${l.surfaces}` : "",
    l.atmosphere ? `Atmosphere: ${l.atmosphere}` : "",
    l.props ? `Props: ${l.props}` : "",
    l.colorPalette ? `Colors: ${l.colorPalette}` : "",
    l.weatherCondition ? `Weather: ${l.weatherCondition}` : "",
  ].filter(Boolean).join(". ");
}

// ─── @ Mention Field Component ───────────────────────────────────
interface MentionItem { id: string; name: string; sheet: string; refUrl?: string; }

function MentionField({ value, onChange, placeholder, rows, mentionType, items, onMentionInsert }: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  rows: number;
  mentionType: "character" | "location";
  items: MentionItem[];
  onMentionInsert?: (item: MentionItem) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch && items.length > 0) {
      setShowDropdown(true);
      setFilter(atMatch[1].toLowerCase());
    } else {
      setShowDropdown(false);
    }
  };

  const insertMention = (item: MentionItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);

    // Replace the @query with the full sheet
    const atMatch = textBefore.match(/@(\w*)$/);
    const prefix = atMatch ? textBefore.slice(0, atMatch.index!) : textBefore;
    const newValue = `${prefix}[${item.name}] ${item.sheet}${textAfter}`;

    onChange(newValue);
    setShowDropdown(false);
    if (onMentionInsert) onMentionInsert(item);

    // Refocus
    setTimeout(() => {
      textarea.focus();
      const newPos = prefix.length + item.name.length + item.sheet.length + 3;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const filtered = items.filter((item) =>
    filter === "" || item.name.toLowerCase().includes(filter)
  );

  const icon = mentionType === "character"
    ? <UserCircle className="w-3.5 h-3.5 text-primary" />
    : <MapPin className="w-3.5 h-3.5 text-primary" />;

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
              className="w-full text-left px-3 py-2 hover:bg-secondary/80 flex items-center gap-2 border-b border-border/50 last:border-0"
            >
              {icon}
              <div>
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[400px]">{item.sheet}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SceneBuilderPage() {
  const router = useRouter();
  const { productInput, brandKit, brief, setAssets, selectedTier, setTier, updateBrief, setBrief, selectedAspectRatio, setAspectRatio } = useAdStore();

  const [scenes, setScenes] = useState<SceneInput[]>([createEmptyScene()]);
  const [expandedScene, setExpandedScene] = useState<string | null>(scenes[0]?.id);
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ sceneId: string; url: string; sourceUrl?: string }[]>([]);
  const [error, setError] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [realismPreset, setRealismPreset] = useState<string>("photo");
  const [realism, setRealism] = useState<RealismSettings>(REALISM_DEFAULTS);
  // Hero subject — drives reference-image ordering and prompt composition.
  // "auto" picks product for product_showcase/minimalist_editorial, character otherwise.
  const [hero, setHero] = useState<"auto" | "product" | "character">("auto");
  const [showRealismAdvanced, setShowRealismAdvanced] = useState(false);

  // Library data for @ mentions
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Multi-angle product images
  const [productAngles, setProductAngles] = useState<{ file: File; preview: string; label: string }[]>([]);

  // ── Idea-to-Scenes auto-fill ────────────────────────────────────
  const [ideaText, setIdeaText] = useState("");
  const [ideaAdType, setIdeaAdType] = useState<AdType>("brand_campaign");
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaTemplateUsed, setIdeaTemplateUsed] = useState<{ label: string; refs: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/characters").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setCharacters(d); }).catch(() => {});
    fetch("/api/locations").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setLocations(d); }).catch(() => {});
  }, []);

  /**
   * Auto-fill all scene inputs from a free-text idea using the Golden Dataset.
   * On success: replaces scenes, persists character + location to libraries,
   * sets tier + realism preset, and refreshes the @ mention dropdowns.
   */
  const handleGenerateFromIdea = async () => {
    if (!ideaText.trim()) {
      setError("Type an idea first — e.g. 'Launch ad for our minimalist B2B productivity app called Stride'");
      return;
    }
    if (!productInput.name) {
      setError("Set up your brand first in the Brand Hub so the AI knows what brand to write for");
      return;
    }

    setIdeaLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scenes-from-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaText,
          brandName: productInput.name,
          productDescription: productInput.description,
          adType: ideaAdType,
          tierOverride: selectedTier,
          persistToLibraries: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate scenes from idea");
      }
      const data = await res.json() as {
        templateLabel: string;
        referenceAds: string[];
        tier: "budget" | "premium" | "ultra";
        realismPreset: "off" | "photo" | "cinematic" | "raw";
        scenes: Array<{
          mood: string; setting: string; characterAction: string;
          productPlacement: string; cameraAngle: string; lighting: string;
          colorGrade: string; motion: string; duration: number;
        }>;
        voiceoverScript: string;
        voiceoverSegments: Array<{ sceneIndex: number; text: string; targetWords: number }>;
        musicStyle: string;
        endCardTagline: string;
        endCardCta: string;
      };

      // Build SceneInput[] from the adapter output.
      const newScenes: SceneInput[] = data.scenes.map((s, i) => ({
        id: `scene_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        mood: s.mood,
        setting: s.setting,
        characterAction: s.characterAction,
        productPlacement: s.productPlacement,
        cameraAngle: s.cameraAngle,
        lighting: s.lighting,
        colorGrade: s.colorGrade,
      }));

      setScenes(newScenes);
      setExpandedScene(newScenes[0]?.id ?? null);
      setGeneratedImages([]); // discard old generated images

      // Apply tier + realism preset from the template's recommendation.
      setTier(data.tier);
      const presetSettings = REALISM_PRESETS[data.realismPreset]?.settings;
      if (presetSettings) {
        setRealismPreset(data.realismPreset);
        setRealism(presetSettings);
      }

      // Propagate voiceover script + segments + end card to the brief so the
      // Video Studio can use them for pacing-aware TTS and the assemble step.
      if (brief) {
        updateBrief({
          voiceoverScript: data.voiceoverScript,
          voiceoverSegments: data.voiceoverSegments,
          musicDirection: data.musicStyle,
          endCard: { tagline: data.endCardTagline, ctaText: data.endCardCta },
        });
      } else {
        // No brief yet — scaffold a minimal one so downstream pages don't crash.
        setBrief({
          productCategory: "",
          targetAudience: { ageRange: "", gender: "", platforms: [], psychographics: [] },
          personas: [],
          platformBriefs: [],
          adFormat: "cinematic_lifestyle",
          sceneBackdrop: "",
          characterSheet: "",
          duration: data.scenes.reduce((sum, s) => sum + s.duration, 0),
          scenes: [],
          voiceoverScript: data.voiceoverScript,
          voiceoverSegments: data.voiceoverSegments,
          musicDirection: data.musicStyle,
          cameraSettings: { focalLength: "85mm", aperture: "f/2.0", colorGrade: "Warm cinematic" },
          endCard: { tagline: data.endCardTagline, ctaText: data.endCardCta },
        });
      }

      // Refresh @ mention dropdowns so the new character/location appear.
      fetch("/api/characters").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setCharacters(d); }).catch(() => {});
      fetch("/api/locations").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setLocations(d); }).catch(() => {});

      setIdeaTemplateUsed({ label: data.templateLabel, refs: data.referenceAds });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIdeaLoading(false);
    }
  };

  const addProductAngle = (file: File) => {
    const preview = URL.createObjectURL(file);
    const labels = ["front", "back", "side-left", "side-right", "top", "detail", "angle"];
    const label = labels[productAngles.length] || `angle-${productAngles.length + 1}`;
    setProductAngles([...productAngles, { file, preview, label }]);
  };

  const removeProductAngle = (idx: number) => {
    URL.revokeObjectURL(productAngles[idx].preview);
    setProductAngles(productAngles.filter((_, i) => i !== idx));
  };

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

  /**
   * Regenerate just this one scene's image. Drops the existing image so the
   * resume logic in /api/scene-to-image skips every OTHER scene and only
   * re-runs this one — fast, cheap, no full-batch redo.
   */
  const regenerateScene = (id: string) => {
    setGeneratedImages((prev) => prev.filter((g) => g.sceneId !== id));
    // Defer the generate call by one tick so the state update lands first.
    setTimeout(() => { generateSceneImages(); }, 0);
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

      // Upload multi-angle product images
      const angleUrls: string[] = [];
      for (const angle of productAngles) {
        const formData = new FormData();
        formData.append("file", angle.file);
        formData.append("type", `product_${angle.label}`);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          angleUrls.push(url);
        }
      }

      // Upload logo if provided (one-time upload, then reuse URL)
      let uploadedLogoUrl = brandKit.logoUrl;
      if (logoFile && !uploadedLogoUrl) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("type", "logo");
        const lr = await fetch("/api/upload", { method: "POST", body: fd });
        if (lr.ok) {
          uploadedLogoUrl = (await lr.json()).url;
        }
      }

      // Generate image for each scene using the scene-to-prompt API
      // Pass existing scene image URLs from any prior partial run so the server
      // skips them and we only pay for the ones that still need to be generated.
      const existingImages = scenes.map((s) => {
        const prior = generatedImages.find((g) => g.sceneId === s.id);
        return prior?.url || null;
      });

      const res = await fetch("/api/scene-to-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes,
          productName: productInput.name,
          productDescription: productInput.description,
          brandColors: brandKit.colors,
          logoUrl: uploadedLogoUrl,
          sceneBackdrop: brief?.sceneBackdrop,
          characterSheet: brief?.characterSheet,
          hasProductImage: !!productImageUrl || !!productImage || productAngles.length > 0,
          realism,
          productAngleUrls: angleUrls.length > 0 ? angleUrls : undefined,
          tier: selectedTier,
          existingImages,
          hero,
          aspectRatio: selectedAspectRatio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate scenes");
      }

      const data = await res.json();
      // Server now returns an array with nulls for failed scenes — accept partials so
      // the user can retry just the broken ones instead of starting over.
      const newImages: { sceneId: string; url: string; sourceUrl?: string }[] = [];
      for (let i = 0; i < (data.images as ({ url: string; sourceUrl?: string } | null)[]).length; i++) {
        const img = (data.images as ({ url: string; sourceUrl?: string } | null)[])[i];
        if (img) {
          newImages.push({
            sceneId: scenes[i]?.id || `scene_${i}`,
            url: img.url,
            sourceUrl: img.sourceUrl,
          });
        }
      }
      setGeneratedImages(newImages);

      if (data.partial && Array.isArray(data.errors) && data.errors.length > 0) {
        const failedIndexes = (data.errors as { index: number; message: string }[]).map((e) => e.index + 1);
        const firstMsg = (data.errors as { index: number; message: string }[])[0].message;
        setError(`Partial result — scene(s) ${failedIndexes.join(", ")} failed (${firstMsg}). Click Generate again to resume only the failed scenes.`);
      }

      // Persist to global store so Poster/Video Studio can access them
      setAssets({
        images: newImages.map((g) => g.url),
        sourceUrls: newImages.map((g) => g.sourceUrl).filter((u): u is string => !!u),
        realism: realism as unknown as Record<string, boolean>,
        productAngleUrls: angleUrls.length > 0 ? angleUrls : undefined,
        // Per-scene character refs — preserves the @character mention or upload for use in video
        characterRefUrls: scenes.map((s) => s.characterRefUrl),
        tier: selectedTier,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [scenes, productInput, brandKit, brief, productImage, productImageUrl, realism, setAssets, productAngles, logoFile, selectedTier]);

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

        {/* ── Idea-to-Scenes Auto-Fill ───────────────────────────── */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Generate from idea</h3>
            <span className="text-[10px] text-muted-foreground">— skip the form, type your idea, edit anything after</span>
          </div>
          <textarea
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder={`e.g. "Launch ad for our minimalist B2B productivity app called Stride, targeting marketing teams"  ·  "30s hero film for our new running shoe drop, urban Indian millennials"  ·  "Macro product film for our handcrafted whiskey"`}
            rows={2}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            disabled={ideaLoading}
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] text-muted-foreground mb-1">Ad type</label>
              <select
                value={ideaAdType}
                onChange={(e) => setIdeaAdType(e.target.value as AdType)}
                disabled={ideaLoading}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {(Object.entries(AD_TYPE_LABELS) as Array<[AdType, string]>).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerateFromIdea}
              disabled={ideaLoading || !ideaText.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
            >
              {ideaLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate from idea</>}
            </button>
          </div>
          {ideaTemplateUsed && (
            <div className="text-[11px] text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
              <span className="text-primary font-medium">Template used:</span> {ideaTemplateUsed.label}
              {ideaTemplateUsed.refs.length > 0 && (
                <span className="block mt-0.5">Inspired by: {ideaTemplateUsed.refs.join(" · ")}</span>
              )}
              <span className="block mt-0.5 text-muted-foreground/70">Tier, realism, and aspect ratio set to template defaults. Character + location saved to your library. Edit anything below.</span>
            </div>
          )}
        </div>

        {/* Product & Logo Upload */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Assets</h3>

          {/* Multi-angle product images */}
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Camera className="w-3 h-3" /> Product Images (multiple angles for consistency)
            </label>
            <div className="flex gap-2 flex-wrap">
              {productAngles.map((angle, i) => (
                <div key={i} className="relative group">
                  <img src={angle.preview} alt={angle.label} className="w-20 h-20 object-cover rounded-xl border border-border" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 rounded-b-xl">{angle.label}</div>
                  <button onClick={() => removeProductAngle(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 text-muted-foreground">
                <Plus className="w-4 h-4" />
                <span className="text-[9px] mt-0.5">Add angle</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) addProductAngle(e.target.files[0]); e.target.value = ""; }} />
              </label>
            </div>
            {productAngles.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">Upload front, back, side, and detail shots for better product reproduction</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Product Image (primary)</label>
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

        {/* Quality Tier Selector */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <QualityTierSelector value={selectedTier} onChange={setTier} />

          {/* Hero subject pill — drives reference ordering and prompt composition */}
          <div className="pt-3 border-t border-border">
            <label className="block text-xs text-muted-foreground mb-1.5">
              Hero subject <span className="text-muted-foreground/60">— who/what is the main focus of each frame?</span>
            </label>
            <div className="flex gap-2">
              {([
                { id: "auto", label: "Auto", desc: "Inferred from ad type" },
                { id: "product", label: "Product", desc: "Product is centred, character is supporting" },
                { id: "character", label: "Character", desc: "Character is centred, product is supporting" },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setHero(opt.id)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${
                    hero === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio picker — drives image dimensions + video aspect + caption positioning */}
          <div className="pt-3 border-t border-border">
            <label className="block text-xs text-muted-foreground mb-1.5">
              Aspect ratio <span className="text-muted-foreground/60">— platform format</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(ASPECT_RATIO_LABELS) as Array<[AspectRatio, { label: string; sub: string }]>).map(([ratio, info]) => {
                const isActive = selectedAspectRatio === ratio;
                // Visual aspect-shape preview using a div with the right proportions
                const [w, h] = ratio.split(":").map(Number);
                const previewMaxH = 20;
                const previewH = Math.min(previewMaxH, previewMaxH * (h / Math.max(w, h)));
                const previewW = previewMaxH * (w / Math.max(w, h));
                return (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors flex items-center gap-2 ${
                      isActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div
                      className={`shrink-0 rounded border ${isActive ? "border-primary/60 bg-primary/30" : "border-muted-foreground/40 bg-muted-foreground/10"}`}
                      style={{ width: `${previewW}px`, height: `${previewH}px` }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{info.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{info.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ultra-Realism Panel */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Ultra-Realism Settings
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on cinematic production techniques — add real-world imperfections to defeat the &ldquo;AI look&rdquo;
              </p>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2">
            {Object.entries(REALISM_PRESETS).map(([key, preset]) => (
              <button key={key} onClick={() => { setRealismPreset(key); setRealism(preset.settings); }}
                className={`flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${
                  realismPreset === key
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30"
                }`}>
                <div className="text-xs font-medium">{preset.label}</div>
                <div className="text-[10px] text-muted-foreground">{preset.desc}</div>
              </button>
            ))}
          </div>

          {/* Advanced toggle */}
          <button onClick={() => setShowRealismAdvanced(!showRealismAdvanced)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {showRealismAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Fine-tune individual settings
          </button>

          {showRealismAdvanced && (
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "filmGrain" as const, label: "Film Grain", tip: "Adds subtle 35mm grain texture — breaks digital perfection" },
                { key: "lensImperfections" as const, label: "Lens Imperfections", tip: "Chromatic aberration, vignetting, subtle lens flare" },
                { key: "depthOfField" as const, label: "Depth of Field", tip: "Shallow focus with natural bokeh — foreground/background blur" },
                { key: "atmosphericEffects" as const, label: "Atmospheric Effects", tip: "Dust particles, volumetric haze, light rays, condensation" },
                { key: "skinDetail" as const, label: "Skin & Texture Detail", tip: "Pores, fine hairs, blemishes, fabric weave — not plastic" },
                { key: "environmentalDetail" as const, label: "Environmental Wear", tip: "Surface scratches, weathering, water stains, natural patina" },
                { key: "naturalMotion" as const, label: "Natural Micro-Motion", tip: "Hair wisps, fabric settling, breathing — for video pipeline" },
                { key: "imperfectComposition" as const, label: "Imperfect Framing", tip: "Slightly off-center, rule-of-thirds tension — not sterile" },
              ]).map(({ key, label, tip }) => (
                <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={realism[key]}
                    onChange={(e) => { setRealism({ ...realism, [key]: e.target.checked }); setRealismPreset("custom"); }}
                    className="mt-0.5 rounded accent-primary" />
                  <div>
                    <div className="text-xs font-medium group-hover:text-primary transition-colors">{label}</div>
                    <div className="text-[10px] text-muted-foreground">{tip}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Scenes */}
        <div className="space-y-3">
          {scenes.map((scene, idx) => {
            const isExpanded = expandedScene === scene.id;
            const generatedImg = generatedImages.find((g) => g.sceneId === scene.id);

            return (
              <div key={scene.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Scene Header — div+role=button (not a real <button>) because it
                    contains a nested delete <button>, which is invalid HTML. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedScene(isExpanded ? null : scene.id);
                    }
                  }}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30 cursor-pointer select-none"
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
                </div>

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
                      <label className="block text-xs text-muted-foreground mb-1">
                        Setting / Environment
                        {locations.length > 0 && <span className="text-primary/60 ml-1">— type <code className="bg-secondary px-1 rounded">@</code> to insert a saved location</span>}
                      </label>
                      <MentionField
                        value={scene.setting}
                        onChange={(val) => updateScene(scene.id, { setting: val })}
                        placeholder="e.g., Modern gym with floor-to-ceiling windows... or type @ to pick a location"
                        rows={2}
                        mentionType="location"
                        items={locations.map((l) => ({ id: l.id, name: l.name, sheet: locationToSheet(l) }))}
                      />
                    </div>

                    {/* Character Action */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Character / Subject Action
                        {characters.length > 0 && <span className="text-primary/60 ml-1">— type <code className="bg-secondary px-1 rounded">@</code> to insert a saved character</span>}
                      </label>
                      <MentionField
                        value={scene.characterAction}
                        onChange={(val) => updateScene(scene.id, { characterAction: val })}
                        placeholder="e.g., Athletic man holds protein shaker... or type @ to pick a character"
                        rows={2}
                        mentionType="character"
                        items={characters.map((c) => ({ id: c.id, name: c.name, sheet: characterToSheet(c), refUrl: c.referenceImageUrl }))}
                        onMentionInsert={(item) => {
                          if (item.refUrl) {
                            updateScene(scene.id, { characterRefUrl: item.refUrl, characterRefLabel: item.name });
                          }
                        }}
                      />
                    </div>

                    {/* Reference Photo for this scene (face/subject consistency) */}
                    <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-3">
                      <label className="block text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <UserCircle className="w-3.5 h-3.5" />
                        Reference Photo
                        <span className="text-muted-foreground/60">(face consistency — auto-set by @character, or upload your own)</span>
                      </label>
                      {scene.characterRefUrl ? (
                        <div className="flex items-center gap-3">
                          <img src={scene.characterRefUrl} alt="Reference" className="w-12 h-12 rounded-lg object-cover border border-border" />
                          <div className="flex-1">
                            <div className="text-xs font-medium">{scene.characterRefLabel || "Your upload"}</div>
                            <div className="text-[10px] text-muted-foreground">Will be passed to the AI as a face/subject reference</div>
                          </div>
                          <button onClick={() => updateScene(scene.id, { characterRefUrl: undefined, characterRefLabel: undefined })}
                            className="text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 bg-secondary border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:border-primary/50 text-xs">
                          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Upload a reference photo (yourself, a model, anyone)</span>
                          <input type="file" accept="image/*" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append("file", file);
                              fd.append("type", "scene_ref");
                              const res = await fetch("/api/upload", { method: "POST", body: fd });
                              if (res.ok) {
                                const { url } = await res.json();
                                updateScene(scene.id, { characterRefUrl: url, characterRefLabel: "Your upload" });
                              }
                              e.target.value = "";
                            }} />
                        </label>
                      )}
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
                      <div className="space-y-2">
                        <div className="rounded-xl overflow-hidden border border-border max-w-xs mx-auto">
                          <img src={generatedImg.url} alt={`Scene ${idx + 1}`} className={`w-full ${ASPECT_RATIO_CLASS[selectedAspectRatio]} object-cover`} />
                        </div>
                        <button
                          onClick={() => regenerateScene(scene.id)}
                          disabled={generating}
                          className="w-full bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5"
                          title="Regenerate only this scene (other scenes won't be touched)"
                        >
                          {generating ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating…</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> Regenerate this scene only</>
                          )}
                        </button>
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

        {/* Cost preview — exact $ and ETA before user clicks Generate */}
        {(() => {
          const hasRefs = !!brandKit.logoUrl || productAngles.length > 0 || !!productImage || scenes.some((s) => s.characterRefUrl);
          const preflight = estimatePreflightCost({
            tier: selectedTier,
            imageSceneCount: scenes.length,
            hasRefs,
          });
          return (
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Estimated cost:</span>
                  <span className="font-semibold text-foreground">${preflight.totalUsd.toFixed(2)}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground">~{formatDuration(preflight.estimatedSeconds)}</span>
                </div>
                {preflight.lines[0] && (
                  <div className="text-[10px] text-muted-foreground/80">{preflight.lines[0]}</div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                tier: <span className="text-primary/80 uppercase">{selectedTier}</span>
              </div>
            </div>
          );
        })()}

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
