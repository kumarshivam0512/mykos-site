import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this folder so Next ignores the stray
  // C:\Users\kshivam\package-lock.json that otherwise gets picked up.
  outputFileTracingRoot: path.resolve("."),
};

export default nextConfig;
