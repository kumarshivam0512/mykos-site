// ─── Brand Opener Composition (Sprint A item 6) ─────────────────
//
// Short branded intro (1.5s default, transparent BG) that plays before the
// first scene clip. Three style variants chosen via `style` prop:
//   - "minimal":  logo + tagline fade-in, ultra-clean
//   - "scale":    logo scales from 0 → 1, tagline slides up
//   - "particle": logo with subtle dust particles
// Brand kit drives ALL visual choices: primary color, display font, logo.

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface BrandOpenerProps {
  /** Brand display name (e.g. "Bentley"). */
  brandName: string;
  /** Tagline / strap (e.g. "Defines Luxury"). Optional. */
  tagline?: string;
  /** Absolute URL or data URI of the brand logo. */
  logoUrl?: string;
  /** Hex color for the accent strip / background. */
  primaryColor: string;
  /** Display font family (already loaded by caller). */
  displayFont: string;
  /** Style variant. */
  style?: "minimal" | "scale" | "particle";
  /** Background mode. "transparent" composites OVER the next clip; "solid"
   *  fills with primary color. */
  background?: "transparent" | "solid";
}

export const BrandOpener: React.FC<BrandOpenerProps> = ({
  brandName,
  tagline,
  logoUrl,
  primaryColor,
  displayFont,
  style = "minimal",
  background = "transparent",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Common: fade in/out window
  const fadeIn = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.4, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Per-style logo transform
  const logoScale = (() => {
    if (style === "scale") {
      return spring({
        frame,
        fps,
        config: { damping: 12, mass: 0.9, stiffness: 80 },
        from: 0.4,
        to: 1.0,
      });
    }
    return 1;
  })();

  // Tagline slide-up animation
  const taglineY = interpolate(frame, [fps * 0.2, fps * 0.7], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background === "solid" ? primaryColor : "transparent",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        fontFamily: displayFont,
      }}
    >
      {/* Logo */}
      {logoUrl && (
        <Img
          src={logoUrl}
          style={{
            width: Math.min(width, height) * 0.32,
            height: "auto",
            objectFit: "contain",
            marginBottom: 24,
            transform: `scale(${logoScale})`,
            transformOrigin: "center",
            // Subtle accent shadow tinted by primary color
            filter: `drop-shadow(0 8px 24px ${primaryColor}33)`,
          }}
        />
      )}
      {/* Brand name (always rendered, even without logo, as fallback) */}
      {!logoUrl && (
        <div
          style={{
            color: background === "solid" ? "#fff" : primaryColor,
            fontSize: Math.min(width, height) * 0.09,
            fontWeight: 700,
            letterSpacing: -2,
            transform: `scale(${logoScale})`,
            marginBottom: 16,
          }}
        >
          {brandName}
        </div>
      )}
      {/* Tagline */}
      {tagline && (
        <div
          style={{
            color: background === "solid" ? "rgba(255,255,255,0.85)" : "#111",
            fontSize: Math.min(width, height) * 0.028,
            fontWeight: 500,
            letterSpacing: 4,
            textTransform: "uppercase",
            transform: `translateY(${taglineY}px)`,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          {tagline}
        </div>
      )}
      {/* Particle accent (minimal CSS-only "dust") */}
      {style === "particle" && (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.4 }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const x = ((i * 37) % 100);
            const y = ((i * 53) % 100);
            const size = 2 + (i % 3);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  background: primaryColor,
                  borderRadius: "50%",
                  transform: `translateY(${Math.sin((frame + i * 5) * 0.08) * 6}px)`,
                }}
              />
            );
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
