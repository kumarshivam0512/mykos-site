# syntax=docker/dockerfile:1

###############################################################################
# Mykos AI — multi-stage image for Azure Container Apps
#
# The app relies on native binaries (sharp, ffmpeg-static, @ffprobe-installer)
# and Remotion (which drives a headless Chromium). These are declared in
# next.config.ts `serverExternalPackages`, so they are NOT bundled by Next and
# must exist in the runtime image's node_modules. We therefore copy the relevant
# native packages explicitly on top of the standalone output.
###############################################################################

# ── Base ─────────────────────────────────────────────────────────────────────
# Debian (bookworm) rather than Alpine: sharp + Chromium need glibc and a long
# list of shared libraries that are painful to satisfy on musl.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# System libraries required by headless Chromium (used by Remotion) and fonts so
# rendered text/emoji are not tofu boxes. ffmpeg/ffprobe come from npm packages.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      fonts-noto-color-emoji \
      libnss3 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libxkbcommon0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libgbm1 \
      libpango-1.0-0 \
      libcairo2 \
      libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Run as the unprivileged "node" user that ships with the base image.
# Next.js standalone output: server.js + a traced, minimal node_modules.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Guarantee the native/external packages are present in the runtime image.
# Standalone tracing can miss platform binaries (.node addons / packaged exes),
# so copy them explicitly over the traced node_modules.
COPY --from=builder --chown=node:node /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=node:node /app/node_modules/ffmpeg-static ./node_modules/ffmpeg-static
COPY --from=builder --chown=node:node /app/node_modules/@ffprobe-installer ./node_modules/@ffprobe-installer
COPY --from=builder --chown=node:node /app/node_modules/@remotion ./node_modules/@remotion
COPY --from=builder --chown=node:node /app/node_modules/remotion ./node_modules/remotion
COPY --from=builder --chown=node:node /app/node_modules/esbuild ./node_modules/esbuild

# Writable directories for runtime-generated media (uploads + rendered output).
# NOTE: container filesystems are ephemeral — for durable storage these should be
# backed by an Azure Files / Blob mount in the Container App.
RUN mkdir -p public/output public/uploads && chown -R node:node public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
