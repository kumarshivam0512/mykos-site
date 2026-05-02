import { jsPDF } from "jspdf";
import type { CreativeBrief, ProductInput } from "@/lib/types";

export function generateBriefPdf(brief: CreativeBrief, productInput: ProductInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkSpace = (needed: number) => { if (y + needed > 270) addPage(); };

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Creative Brief", margin, y);
  y += 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 58, 237); // primary purple
  doc.text(productInput.name, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(productInput.description, margin, y, { maxWidth: contentWidth });
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Section helper
  const section = (title: string) => {
    checkSpace(15);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 58, 237);
    doc.text(title, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
  };

  const field = (label: string, value: string) => {
    checkSpace(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(value, margin + 40, y, { maxWidth: contentWidth - 40 });
    const lines = doc.splitTextToSize(value, contentWidth - 40);
    y += lines.length * 4 + 2;
  };

  // Product Info
  section("Product Overview");
  field("Category", brief.productCategory);
  field("Ad Format", brief.adFormat.replace(/_/g, " ").toUpperCase());
  field("Duration", `${brief.duration} seconds`);
  y += 4;

  // Target Audience
  section("Target Audience");
  field("Age Range", brief.targetAudience.ageRange);
  field("Gender", brief.targetAudience.gender);
  field("Platforms", brief.targetAudience.platforms.join(", "));
  field("Psychographics", brief.targetAudience.psychographics.join(", "));
  y += 4;

  // Personas
  if (brief.personas?.length) {
    section("Buyer Personas");
    for (const p of brief.personas) {
      checkSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`${p.name}, ${p.age}`, margin, y);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`${p.location} · ${p.income}`, margin + 50, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(`Pain points: ${p.painPoints.join("; ")}`, margin + 4, y, { maxWidth: contentWidth - 4 });
      y += 4;
      doc.text(`Motivations: ${p.motivations.join("; ")}`, margin + 4, y, { maxWidth: contentWidth - 4 });
      y += 4;
      doc.text(`Ad angle: "${p.adAngle}"`, margin + 4, y, { maxWidth: contentWidth - 4 });
      y += 6;
    }
    y += 2;
  }

  // Platform Briefs
  if (brief.platformBriefs?.length) {
    section("Platform Briefs");
    for (const pb of brief.platformBriefs) {
      checkSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(pb.platform, margin, y);
      y += 4;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Format: ${pb.format} · ${pb.duration}s · Tone: ${pb.tone}`, margin + 4, y, { maxWidth: contentWidth - 4 });
      y += 4;
      doc.text(`Hook: "${pb.hook}"`, margin + 4, y, { maxWidth: contentWidth - 4 });
      y += 4;
      doc.text(`CTA: ${pb.ctaText}`, margin + 4, y);
      y += 6;
    }
    y += 2;
  }

  // Competitor Analysis
  if (brief.competitorAnalysis) {
    section("Competitor Analysis");
    field("Competitor", brief.competitorAnalysis.competitorName);
    field("Their Position", brief.competitorAnalysis.theirPositioning);
    field("Their Audience", brief.competitorAnalysis.theirAudience);
    field("Differentiators", brief.competitorAnalysis.differentiators.join("; "));
    field("Attack Angles", brief.competitorAnalysis.attackAngles.join("; "));
    y += 4;
  }

  // Scenes
  section("Scenes");
  for (const s of brief.scenes) {
    checkSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Scene ${s.index + 1} (${s.duration}s)`, margin, y);
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const sceneLines = doc.splitTextToSize(s.visualPrompt, contentWidth - 4);
    doc.text(sceneLines, margin + 4, y);
    y += sceneLines.length * 4;
    doc.setTextColor(100);
    doc.text(`Camera: ${s.cameraAngle} · Motion: ${s.motion} · Lighting: ${s.lighting}`, margin + 4, y, { maxWidth: contentWidth - 4 });
    doc.setTextColor(0);
    y += 6;
  }
  y += 2;

  // Voiceover
  section("Voiceover Script");
  checkSpace(15);
  const voLines = doc.splitTextToSize(brief.voiceoverScript, contentWidth);
  doc.text(voLines, margin, y);
  y += voLines.length * 4 + 4;

  // Music
  section("Music Direction");
  checkSpace(10);
  const musicLines = doc.splitTextToSize(brief.musicDirection, contentWidth);
  doc.text(musicLines, margin, y);
  y += musicLines.length * 4 + 4;

  // Camera
  section("Camera Settings");
  field("Lens", brief.cameraSettings.focalLength);
  field("Aperture", brief.cameraSettings.aperture);
  field("Color Grade", brief.cameraSettings.colorGrade);
  y += 4;

  // End Card
  section("End Card");
  field("Tagline", `"${brief.endCard.tagline}"`);
  field("CTA", brief.endCard.ctaText);

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by Mykos AI — AI Creative Director", margin, 285);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin - 20, 285);

  doc.save(`${productInput.name.replace(/\s+/g, "_")}_creative_brief.pdf`);
}
