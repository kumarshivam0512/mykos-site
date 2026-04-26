import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static HTML export -> works on any static host (Cloudflare Pages, etc.)
  output: "export",
  images: { unoptimized: true },
  // Pin the workspace root to this folder so Next ignores the stray
  // C:\Users\kshivam\package-lock.json that otherwise gets picked up.
  outputFileTracingRoot: path.resolve("."),
};

export default nextConfig;
