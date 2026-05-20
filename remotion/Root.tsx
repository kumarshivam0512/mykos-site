// ─── Remotion Root (Sprint A item 6) ─────────────────────────────
//
// Registers all branded compositions used by /api/render-brand-asset.
// Each composition is rendered server-side via `@remotion/renderer` with
// `inputProps` carrying brandKit + per-render data. Default dimensions are
// 1280x720 (16:9) but the API rebinds width/height per request to match the
// campaign's selected aspect ratio.

import React from "react";
import { Composition } from "remotion";
import { BrandOpener, type BrandOpenerProps } from "./BrandOpener";
import { EndCard, type EndCardProps } from "./EndCard";
import { SceneOverlay, type SceneOverlayProps } from "./SceneOverlay";

const DEFAULT_FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrandOpener"
        component={BrandOpener as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_FPS * 2}
        fps={DEFAULT_FPS}
        width={1280}
        height={720}
        defaultProps={{
          brandName: "Mykos",
          tagline: "AI Creative Director",
          primaryColor: "#a855f7",
          displayFont: "Inter",
          style: "minimal",
          background: "transparent",
        } satisfies BrandOpenerProps}
      />
      <Composition
        id="EndCard"
        component={EndCard as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_FPS * 2}
        fps={DEFAULT_FPS}
        width={1280}
        height={720}
        defaultProps={{
          brandName: "Mykos",
          tagline: "Defines what's next",
          ctaText: "Learn more",
          primaryColor: "#a855f7",
          secondaryColor: "#7c3aed",
          displayFont: "Inter",
          bodyFont: "Inter",
          background: "dark",
        } satisfies EndCardProps}
      />
      <Composition
        id="SceneOverlay"
        component={SceneOverlay as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={DEFAULT_FPS * 5}
        fps={DEFAULT_FPS}
        width={1280}
        height={720}
        defaultProps={{
          text: "",
          position: "lower-third",
          showLowerThirdBar: false,
          primaryColor: "#a855f7",
          bodyFont: "Inter",
        } satisfies SceneOverlayProps}
      />
    </>
  );
};
