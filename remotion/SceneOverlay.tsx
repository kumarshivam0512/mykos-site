// ─── Scene Overlay Composition (Sprint A item 6) ─────────────────
//
// Transparent-background overlay rendered per-scene and composited ON TOP of
// the existing AI clip via FFmpeg. Carries optional:
//   - on-screen text (animated entrance, position picker)
//   - lower-third bar (brand-colored)
//   - small logo bug (corner)
// Used when the user wants branded chrome on a scene without re-rendering
// the clip itself.

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type OverlayPosition = "top" | "center" | "lower-third" | "bottom";

export interface SceneOverlayProps {
  /** Text to display (e.g. "Limited Edition", "Now in MENA"). Empty = no text. */
  text?: string;
  /** Where the text appears within the frame. */
  position?: OverlayPosition;
  /** When true, a brand-colored bar sits behind the text. */
  showLowerThirdBar?: boolean;
  /** When set, a small logo bug renders in the top-right corner. */
  logoUrl?: string;
  /** Hex color for accent strip / lower-third bar. */
  primaryColor: string;
  /** Body font for the text. */
  bodyFont: string;
}

export const SceneOverlay: React.FC<SceneOverlayProps> = ({
  text,
  position = "lower-third",
  showLowerThirdBar = false,
  logoUrl,
  primaryColor,
  bodyFont,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Text entrance: slide up + fade in over the first 0.4s
  const textIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const slideY = interpolate(textIn, [0, 1], [12, 0]);

  // Text positioning
  const positionStyle: React.CSSProperties = (() => {
    switch (position) {
      case "top": return { top: "12%" };
      case "center": return { top: "50%", transform: `translateY(-50%) translateY(${slideY}px)` };
      case "bottom": return { bottom: "8%" };
      case "lower-third":
      default: return { bottom: "22%" };
    }
  })();

  // Min dimension used as a sizing base so vertical & landscape both look balanced
  const md = Math.min(width, height);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Optional logo bug top-right */}
      {logoUrl && (
        <Img
          src={logoUrl}
          style={{
            position: "absolute",
            top: 24, right: 24,
            width: md * 0.08,
            height: "auto",
            objectFit: "contain",
            opacity: 0.85,
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
          }}
        />
      )}

      {/* Text + optional lower-third bar */}
      {text && (
        <div
          style={{
            position: "absolute",
            left: 0, right: 0,
            ...positionStyle,
            textAlign: "center",
            opacity: textIn,
            transform: position === "center" ? positionStyle.transform : `translateY(${slideY}px)`,
          }}
        >
          {showLowerThirdBar ? (
            <div style={{
              display: "inline-block",
              background: primaryColor,
              color: "#fff",
              padding: `${md * 0.018}px ${md * 0.04}px`,
              fontFamily: bodyFont,
              fontSize: md * 0.034,
              fontWeight: 700,
              letterSpacing: 1,
              borderRadius: 8,
              boxShadow: `0 12px 30px ${primaryColor}55`,
              maxWidth: "82%",
            }}>
              {text}
            </div>
          ) : (
            <div style={{
              color: "#fff",
              fontFamily: bodyFont,
              fontSize: md * 0.038,
              fontWeight: 700,
              letterSpacing: 0.5,
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
              padding: "0 32px",
              lineHeight: 1.2,
            }}>
              {text}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
