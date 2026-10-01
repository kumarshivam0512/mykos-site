import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle (.next/standalone) for container images.
  // Required for the Docker / Azure Container Apps deployment so the runtime image
  // only needs the traced node_modules instead of the full dependency tree.
  output: "standalone",
  // Native/binary modules must be loaded via Node's runtime require, not bundled.
  // Adding them here keeps Turbopack/webpack from trying to parse the .exe / .node
  // binaries inside these packages (e.g. ffprobe.exe, sharp's .node addons).
  //
  // @remotion/* + esbuild ship per-platform native binaries AND a README inside
  // each platform package (e.g. @esbuild/win32-x64/README.md). Without externalizing
  // them, Turbopack tries to parse those non-code files and errors with
  // "Unknown module type" on the README. They must be loaded via Node require
  // only — they're only used inside server-side API routes (render-brand-asset,
  // finalize-video) and never touch client code.
  serverExternalPackages: [
    "sharp",
    "ffmpeg-static",
    "@ffprobe-installer/ffprobe",
    "@ffprobe-installer/win32-x64",
    "@ffprobe-installer/darwin-x64",
    "@ffprobe-installer/darwin-arm64",
    "@ffprobe-installer/linux-x64",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "remotion",
    "esbuild",
  ],
  images: {
    remotePatterns: [
      // Image generation providers
      { protocol: "https", hostname: "image.pollinations.ai" },
      // WaveSpeed CDN (covers all sub-domains where outputs land)
      { protocol: "https", hostname: "*.wavespeed.ai" },
      { protocol: "https", hostname: "wavespeed.ai" },
      // Higgsfield output CDN
      { protocol: "https", hostname: "*.higgsfield.ai" },
      // ByteDance/Seedance CDN
      { protocol: "https", hostname: "*.byteimg.com" },
      { protocol: "https", hostname: "*.ibyteimg.com" },
      // Replicate output CDN
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "*.replicate.delivery" },
      // Fal CDN
      { protocol: "https", hostname: "*.fal.media" },
      { protocol: "https", hostname: "fal.media" },
    ],
  },
};

export default nextConfig;



