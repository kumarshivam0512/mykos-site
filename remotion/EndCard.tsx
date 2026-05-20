// ─── End Card Composition (Sprint A item 6) ─────────────────────
//
// Always-rendered closer (2s by default) appended to every ad after the last
// scene clip. Contains: logo + product name + tagline + CTA. Visual style
// driven entirely by brandKit.

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface EndCardProps {
  brandName: string;
  tagline?: string;
  ctaText?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  displayFont: string;
  bodyFont: string;
  /** Background mode. "solid" = primary color fill; "dark" = near-black with
   *  brand accent. */
  background?: "solid" | "dark" | "light";
}

export const EndCard: React.FC<EndCardProps> = ({
  brandName,
  tagline,
  ctaText,
  logoUrl,
  primaryColor,
  secondaryColor,
  displayFont,
  bodyFont,
  background = "dark",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Element entrances staggered for a polished feel
  const logoIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 14 } });
  const taglineIn = interpolate(frame, [fps * 0.3, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaIn = interpolate(frame, [fps * 0.5, fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const bgColor = background === "solid"
    ? primaryColor
    : background === "light"
      ? "#fafafa"
      : "#0a0a0a";
  const textPrimary = background === "light" ? "#0a0a0a" : "#fff";
  const textMuted = background === "light" ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.7)";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        justifyContent: "center",
        alignItems: "center",
        padding: 48,
      }}
    >
      {/* Accent strip top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 4, background: primaryColor,
      }} />

      {/* Logo */}
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            width: Math.min(width, height) * 0.26,
            height: "auto",
            objectFit: "contain",
            marginBottom: 28,
            transform: `scale(${logoIn})`,
            transformOrigin: "center",
            filter: `drop-shadow(0 6px 20px ${primaryColor}44)`,
          }}
        />
      ) : (
        <div style={{
          color: textPrimary,
          fontSize: Math.min(width, height) * 0.075,
          fontWeight: 700,
          letterSpacing: -2,
          marginBottom: 20,
          fontFamily: displayFont,
          transform: `scale(${logoIn})`,
        }}>
          {brandName}
        </div>
      )}

      {/* Tagline */}
      {tagline && (
        <div style={{
          color: textPrimary,
          fontSize: Math.min(width, height) * 0.045,
          fontWeight: 600,
          textAlign: "center",
          fontFamily: displayFont,
          maxWidth: "85%",
          lineHeight: 1.2,
          opacity: taglineIn,
          transform: `translateY(${(1 - taglineIn) * 14}px)`,
          marginBottom: 22,
        }}>
          {tagline}
        </div>
      )}

      {/* CTA */}
      {ctaText && (
        <div style={{
          opacity: ctaIn,
          transform: `translateY(${(1 - ctaIn) * 10}px)`,
          background: primaryColor,
          color: "#fff",
          padding: "14px 32px",
          borderRadius: 999,
          fontSize: Math.min(width, height) * 0.028,
          fontWeight: 600,
          letterSpacing: 1,
          fontFamily: bodyFont,
          boxShadow: `0 10px 30px ${primaryColor}66`,
        }}>
          {ctaText}
        </div>
      )}

      {/* Brand attribution bottom (if logo+tagline present) */}
      {logoUrl && tagline && (
        <div style={{
          position: "absolute", bottom: 28,
          color: textMuted,
          fontSize: Math.min(width, height) * 0.018,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontFamily: bodyFont,
          opacity: taglineIn,
        }}>
          {brandName}
        </div>
      )}

      {/* Accent dot bottom-right for visual punctuation */}
      <div style={{
        position: "absolute", bottom: 24, right: 24,
        width: 10, height: 10, borderRadius: "50%",
        background: secondaryColor,
        boxShadow: `0 0 18px ${secondaryColor}88`,
      }} />
    </AbsoluteFill>
  );
};
