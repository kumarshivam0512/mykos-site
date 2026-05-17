"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdStore } from "@/store/use-ad-store";
import { AD_FORMATS } from "@/lib/ad-formats";
import { generateBriefPdf } from "@/lib/pdf-export";
import type { AdFormat, Scene } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Target,
  Film,
  Music,
  Camera,
  Type,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Download,
  UserCircle,
  Globe,
  Swords,
} from "lucide-react";

export default function BriefPage() {
  const router = useRouter();
  const { brief, updateBrief, productInput } = useAdStore();
  const [expandedScene, setExpandedScene] = useState<number | null>(0);

  if (!brief) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No brief generated yet.</p>
          <button
            onClick={() => router.push("/creative")}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  const updateScene = (index: number, updates: Partial<Scene>) => {
    const newScenes = brief.scenes.map((s) =>
      s.index === index ? { ...s, ...updates } : s
    );
    updateBrief({ scenes: newScenes });
  };

  const downloadBrief = () => {
    const divider = "=".repeat(50);
    const scenesText = brief.scenes
      .map(
        (s) =>
          `  Scene ${s.index + 1} (${s.duration}s)\n` +
          `    Visual: ${s.visualPrompt}\n` +
          `    Camera: ${s.cameraAngle}\n` +
          `    Motion: ${s.motion}\n` +
          `    Lighting: ${s.lighting}`
      )
      .join("\n\n");

    const personasText = (brief.personas || [])
      .map(
        (p) =>
          `  ${p.name}, age ${p.age} (${p.location}, ${p.income})\n` +
          `    Pain points: ${p.painPoints.join("; ")}\n` +
          `    Motivations: ${p.motivations.join("; ")}\n` +
          `    Content prefs: ${p.contentPreferences.join("; ")}\n` +
          `    Purchase triggers: ${p.purchaseTriggers.join("; ")}\n` +
          `    Ad angle: "${p.adAngle}"`
      )
      .join("\n\n");

    const platformText = (brief.platformBriefs || [])
      .map(
        (pb) =>
          `  ${pb.platform} (${pb.format}, ${pb.duration}s)\n` +
          `    Hook: "${pb.hook}"\n` +
          `    Tone: ${pb.tone}\n` +
          `    CTA: ${pb.ctaText}`
      )
      .join("\n\n");

    const competitorText = brief.competitorAnalysis
      ? [
          `COMPETITOR ANALYSIS: ${brief.competitorAnalysis.competitorName}`,
          `  Their positioning: ${brief.competitorAnalysis.theirPositioning}`,
          `  Their audience: ${brief.competitorAnalysis.theirAudience}`,
          `  Our differentiators: ${brief.competitorAnalysis.differentiators.join("; ")}`,
          `  Attack angles: ${brief.competitorAnalysis.attackAngles.join("; ")}`,
        ].join("\n")
      : "";

    const briefText = [
      `CREATIVE BRIEF — ${productInput.name}`,
      divider,
      "",
      `PRODUCT: ${productInput.name}`,
      `DESCRIPTION: ${productInput.description}`,
      `CATEGORY: ${brief.productCategory}`,
      "",
      "TARGET AUDIENCE",
      `  Age: ${brief.targetAudience.ageRange}`,
      `  Gender: ${brief.targetAudience.gender}`,
      `  Platforms: ${brief.targetAudience.platforms.join(", ")}`,
      `  Psychographics: ${brief.targetAudience.psychographics.join(", ")}`,
      "",
      "BUYER PERSONAS",
      personasText,
      "",
      "PLATFORM-SPECIFIC BRIEFS",
      platformText,
      "",
      competitorText,
      "",
      `AD FORMAT: ${brief.adFormat.replace(/_/g, " ").toUpperCase()}`,
      `DURATION: ${brief.duration}s`,
      "",
      "CAMERA",
      `  Lens: ${brief.cameraSettings.focalLength}`,
      `  Aperture: ${brief.cameraSettings.aperture}`,
      `  Color Grade: ${brief.cameraSettings.colorGrade}`,
      "",
      "SCENES",
      scenesText,
      "",
      "VOICEOVER SCRIPT",
      brief.voiceoverScript,
      "",
      "MUSIC DIRECTION",
      brief.musicDirection,
      "",
      "END CARD",
      `  Tagline: "${brief.endCard.tagline}"`,
      `  CTA: ${brief.endCard.ctaText}`,
    ].join("\n");

    const blob = new Blob([briefText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productInput.name.replace(/\s+/g, "_")}_creative_brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/creative")}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold">Creative Brief</h1>
            <p className="text-muted-foreground">
              AI-generated brief for <span className="text-primary font-medium">{productInput.name}</span> — review and edit before generating
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/creative/audience")}
              className="bg-secondary hover:bg-secondary/80 text-foreground font-medium px-4 py-3 rounded-xl flex items-center gap-2"
            >
              <UserCircle className="w-4 h-4" /> Audience
            </button>
            <button
              onClick={() => generateBriefPdf(brief, productInput)}
              className="bg-secondary hover:bg-secondary/80 text-foreground font-medium px-4 py-3 rounded-xl flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={downloadBrief}
              className="bg-secondary hover:bg-secondary/80 text-foreground font-medium px-4 py-3 rounded-xl flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> TXT
            </button>
            <button
              onClick={() => router.push("/creative")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
            >
              Generate Ad <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Summary Cards */}
          <div className="lg:col-span-1 space-y-4">
            {/* Product Category */}
            <Card title="Product Category" icon={<Target className="w-4 h-4" />}>
              <p className="text-lg font-medium capitalize">{brief.productCategory}</p>
            </Card>

            {/* Target Audience */}
            <Card title="Target Audience" icon={<Users className="w-4 h-4" />}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{brief.targetAudience.ageRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{brief.targetAudience.gender}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Platforms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {brief.targetAudience.platforms.map((p) => (
                      <span key={p} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Psychographics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {brief.targetAudience.psychographics.map((p) => (
                      <span key={p} className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Camera Settings */}
            <Card title="Camera" icon={<Camera className="w-4 h-4" />}>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lens:</span>
                  <span>{brief.cameraSettings.focalLength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aperture:</span>
                  <span>{brief.cameraSettings.aperture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grade:</span>
                  <span>{brief.cameraSettings.colorGrade}</span>
                </div>
              </div>
            </Card>

            {/* Music Direction */}
            <Card title="Music" icon={<Music className="w-4 h-4" />}>
              <p className="text-sm">{brief.musicDirection}</p>
            </Card>

            {/* End Card */}
            <Card title="End Card" icon={<Type className="w-4 h-4" />}>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Tagline:</span> &ldquo;{brief.endCard.tagline}&rdquo;</p>
                <p><span className="text-muted-foreground">CTA:</span> {brief.endCard.ctaText}</p>
              </div>
            </Card>

            {/* Competitor Analysis */}
            {brief.competitorAnalysis && (
              <Card title="Competitor Analysis" icon={<Swords className="w-4 h-4" />}>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{brief.competitorAnalysis.competitorName}</p>
                  <p className="text-muted-foreground text-xs">{brief.competitorAnalysis.theirPositioning}</p>
                  <div>
                    <span className="text-muted-foreground text-xs">Differentiators:</span>
                    <ul className="mt-1 space-y-0.5">
                      {brief.competitorAnalysis.differentiators.map((d, i) => (
                        <li key={i} className="text-xs flex items-start gap-1">
                          <span className="text-green-400 mt-0.5">+</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Attack angles:</span>
                    <ul className="mt-1 space-y-0.5">
                      {brief.competitorAnalysis.attackAngles.map((a, i) => (
                        <li key={i} className="text-xs flex items-start gap-1">
                          <span className="text-primary mt-0.5">→</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Editable Fields */}
          <div className="lg:col-span-2 space-y-4">
            {/* Buyer Personas */}
            {brief.personas?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <UserCircle className="w-4 h-4" /> Buyer Personas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {brief.personas.map((persona, i) => (
                    <div key={i} className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                          {persona.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{persona.name}, {persona.age}</p>
                          <p className="text-xs text-muted-foreground">{persona.location} · {persona.income}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Pain points:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {persona.painPoints.map((p, j) => (
                            <span key={j} className="bg-red-500/10 text-red-400 text-xs px-1.5 py-0.5 rounded">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Motivations:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {persona.motivations.map((m, j) => (
                            <span key={j} className="bg-green-500/10 text-green-400 text-xs px-1.5 py-0.5 rounded">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Ad angle:</span>
                        <p className="text-xs text-foreground mt-0.5 italic">&ldquo;{persona.adAngle}&rdquo;</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform-Specific Briefs */}
            {brief.platformBriefs?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Platform Briefs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {brief.platformBriefs.map((pb, i) => (
                    <div key={i} className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2">
                      <p className="text-sm font-medium">{pb.platform}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Format:</span>
                          <span>{pb.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{pb.duration}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tone:</span>
                          <span>{pb.tone}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Hook:</span>
                        <p className="text-xs text-foreground mt-0.5 italic">&ldquo;{pb.hook}&rdquo;</p>
                      </div>
                      <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded text-center">
                        {pb.ctaText}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Storyboard */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" /> Storyboard
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {brief.scenes.map((scene) => {
                  const voWords = brief.voiceoverScript.split(/\s+/);
                  const totalDuration = brief.scenes.reduce((sum, s) => sum + s.duration, 0);
                  const sceneStart = brief.scenes.slice(0, scene.index).reduce((sum, s) => sum + s.duration, 0);
                  const wordStart = Math.floor((sceneStart / totalDuration) * voWords.length);
                  const wordEnd = Math.floor(((sceneStart + scene.duration) / totalDuration) * voWords.length);
                  const sceneVo = voWords.slice(wordStart, wordEnd).join(" ");

                  return (
                    <div key={scene.index} className="shrink-0 w-48 bg-secondary/50 border border-border rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          S{scene.index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">{scene.duration}s</span>
                      </div>
                      <div className="aspect-video bg-secondary/80 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-muted-foreground text-center px-2 line-clamp-3">
                          {scene.visualPrompt.slice(0, 80)}...
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="truncate">📷 {scene.cameraAngle}</p>
                        <p className="truncate">🎬 {scene.motion}</p>
                      </div>
                      {sceneVo && (
                        <p className="text-xs italic text-foreground/70 line-clamp-2">&ldquo;{sceneVo.slice(0, 60)}...&rdquo;</p>
                      )}
                    </div>
                  );
                })}
                {/* End Card */}
                <div className="shrink-0 w-48 bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">END</span>
                    <span className="text-xs text-muted-foreground">3s</span>
                  </div>
                  <div className="aspect-video bg-primary/10 rounded-lg flex items-center justify-center text-center px-2">
                    <div>
                      <p className="text-xs font-medium text-primary">{brief.endCard.tagline}</p>
                      <p className="text-xs text-muted-foreground mt-1">{brief.endCard.ctaText}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ad Format Selector */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" /> Ad Format
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AD_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => updateBrief({ adFormat: fmt.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      brief.adFormat === fmt.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-secondary/50 hover:border-primary/30"
                    }`}
                  >
                    <span className="text-xl">{fmt.icon}</span>
                    <p className="text-sm font-medium mt-1">{fmt.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmt.useCases}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Duration: {brief.duration}s
              </h3>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={brief.duration}
                onChange={(e) => updateBrief({ duration: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5s</span>
                <span>15s</span>
                <span>30s</span>
                <span>60s</span>
                <span>120s</span>
              </div>
            </div>

            {/* Scenes */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Scenes ({brief.scenes.length})
              </h3>
              <div className="space-y-2">
                {brief.scenes.map((scene) => (
                  <div key={scene.index} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedScene(expandedScene === scene.index ? null : scene.index)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">
                          {scene.index + 1}
                        </span>
                        <span className="text-sm truncate max-w-md">
                          {scene.visualPrompt.slice(0, 60)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{scene.duration}s</span>
                        {expandedScene === scene.index ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {expandedScene === scene.index && (
                      <div className="p-4 space-y-3 border-t border-border">
                        <div>
                          <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <Pencil className="w-3 h-3" /> Visual Prompt
                          </label>
                          <textarea
                            value={scene.visualPrompt}
                            onChange={(e) =>
                              updateScene(scene.index, { visualPrompt: e.target.value })
                            }
                            rows={3}
                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Camera Angle</label>
                            <input
                              value={scene.cameraAngle}
                              onChange={(e) =>
                                updateScene(scene.index, { cameraAngle: e.target.value })
                              }
                              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Motion</label>
                            <input
                              value={scene.motion}
                              onChange={(e) =>
                                updateScene(scene.index, { motion: e.target.value })
                              }
                              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Lighting</label>
                            <input
                              value={scene.lighting}
                              onChange={(e) =>
                                updateScene(scene.index, { lighting: e.target.value })
                              }
                              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Duration (s)</label>
                            <input
                              type="number"
                              value={scene.duration}
                              min={1}
                              max={30}
                              onChange={(e) =>
                                updateScene(scene.index, { duration: Number(e.target.value) })
                              }
                              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Voiceover Script */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Voiceover Script
              </h3>
              <textarea
                value={brief.voiceoverScript}
                onChange={(e) => updateBrief({ voiceoverScript: e.target.value })}
                rows={4}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {brief.voiceoverScript.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={() => router.push("/creative")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
            >
              Generate Ad <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
