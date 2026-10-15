This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Research website and workspace

The public Mykos marketing homepage lives at `/`, implemented in `app/page.tsx`
and `components/marketing-home.tsx`, with scoped styles in
`app/marketing.module.css`. It presents Mykos as an experimental, local-first
memory layer for coding agents, grounded in the `reasoning-checkpoints` project.
The homepage has interactive workflow and feature tabs, a responsive navigation
menu, and links to first-level informational pages at `/discover/[slug]`.
Those pages describe source recall, checked-result reuse, agent integrations,
research, and the limits of the current local build without inventing hosted
capabilities, customer claims, or pricing.

The left-aligned hero and guided setup retain the site's light Mykos visual
identity. Setup steps use the reference project's actual editable-install
command, `python -m pip install -e ".[integration]"`, and describe configuration
for the local SDK, MCP server, and optional Codex lifecycle hooks. Installation
requires a source checkout and Python 3.11 or later. The page does not imply
that Mykos is a hosted service or that it stores agent memory on this domain.
Existing workflow tabs remain below setup. Tabs support arrow keys, Home/End,
and explicit clipboard failure feedback.

The copy distinguishes source-grounded findings from verified correctness.
Checked-result reuse is limited to matching declared inputs and scope; a receipt
records what was checked but does not prove an answer correct. The reference
project is experimental and does not establish general task-quality gains or
token savings.

Public pages use scoped color tokens in `app/marketing.module.css`:
cool gray `#e8ebed` backgrounds, burnt orange `#df6035` primary actions, and
blue `#d6e4f0` accents. The homepage hero stays light, with left-aligned copy
over subtle blue Matrix Rain trails. Primary buttons use `#1a1a1a` text for
sufficient contrast on orange. Existing Geist typography and the mushroom
brand mark are preserved.

The shared marketing footer adds a dictionary-style brand signature:
`mykos /ˈmaɪ.kɒs/ noun`, pronounced "MY-koss", with a short memory-layer
definition. A system serif wordmark is paired with Geist Mono pronunciation
text; the header logo remains unchanged. The entry wraps on smaller screens
and introduces no font downloads or dependencies.

The homepage uses the local Matrix Rain canvas from
`components/ui/matrix-code.tsx`, tuned to the light Mykos palette with subtle
blue binary trails. The effect is hero-scoped, capped at 30 fps and 2x pixel
ratio, pauses when hidden or offscreen, and draws a still frame for reduced
motion. It adds no new dependency.

The top-right source link uses the reusable
`InteractiveHoverButton` in `components/ui/interactive-hover-button.tsx`.
Hovering or keyboard-focusing it expands an orange fill beneath the label and
reveals an arrow. The hero and other primary calls to action retain their
original orange button style.

The homepage hero copy overlays the canvas without a panel. The hero fills the
available viewport on desktop and mobile, with setup content below it.

### UI component structure

Reusable UI components live in `components/ui`, matching shadcn's conventional
location and the existing `@/*` TypeScript alias. Styles remain in
`app/globals.css` (Tailwind v4) and `app/marketing.module.css` (public-site scope).
React, TypeScript, Tailwind, and Lucide are already installed; Matrix Rain needs
no packages, assets, providers, or global state. `components/ui/demo.tsx` exports
the green-on-black standalone demo without changing the homepage's light theme.
The project does not need shadcn initialization for this plain React component.
If shadcn-generated primitives are needed later, run `npx shadcn@latest init`
and select `components/ui` as the UI alias; review generated theme changes
before applying them to the existing app.

The original brand/campaign dashboard remains a separate application surface at
`/workspace`. Login and internal dashboard links return there. Existing root
links containing `c`, `brandId`, or `view=workspace` redirect to the workspace
with their query values preserved. Creative, brand, and performance routes are
unchanged.

`components/app-shell.tsx` keeps workspace providers, the top bar, and sidebar
off the public homepage and `/discover/` pages, so visiting the marketing site
does not fetch account or campaign data. Workspace styling remains unchanged.

### Scientific imagery

The locally served images in `public/research/` are illustrative, not Mykos
facilities or research results:

- `ocean-simulation.jpg`: [North Atlantic ocean turbulence, PIA22256](https://images.nasa.gov/details/PIA22256), NASA/JPL-Caltech.
- `discover-supercomputer.jpg`: [Discover Supercomputer 3](https://images.nasa.gov/details/GSFC_20171208_Archive_e002030), NASA/Pat Izzo.

Source credits are displayed beside each image. Usage follows
[NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/);
no affiliation or endorsement is implied. Replace these editorial illustrations
with lab-owned imagery when available. No researcher profiles, publications,
institutional affiliations, or performance claims have been invented.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Production hosting and deployment

Authenticated DNS inspection on October 12, 2026 confirmed that both `mykos.ai`
and `www.mykos.ai` have proxied CNAME records targeting `mykos-site.pages.dev`.
The configured origin is Cloudflare Pages, not a Vercel deployment. Subsequent
authenticated Pages inspection confirmed that `mykos-site` is connected to
`kumarshivam0512/mykos-site`, production branch `main`, build command
`npm run build`, and output directory `out`. It is not connected to this
repository. The previously live deployment was commit
`95ae06c7f1ee5d84362dece027ddf5988f435599` from that separate repository.

### Deploy the current public webpage to Pages

```bash
npm run build:marketing
npm run deploy:marketing -- webpage-preview
# Verify the preview URL printed by the deploy command before production:
npm run deploy:marketing -- main
```

The build script creates an isolated static Next.js export in the ignored
`.marketing-build/out` directory from the existing marketing components, styles,
and public images. It does not change the full app's standalone configuration,
copy environment files, or include workspace/API code. Images are unoptimized
because Pages does not run the Next.js image server. The deploy script maps
Next.js segment-prefetch URLs to their exported payloads for static hosting.

The deploy command uses `CLOUDFLARE_API_TOKEN` from the process environment or
the ignored `.env.local` file, with **Account: Cloudflare Pages: Edit** permission
restricted to the owning account. It uploads only the public export through
the Pages API and waits for a successful deploy stage. The branch argument
selects preview versus production; `main` publishes to the existing domains
without DNS changes. The last deployment ID and URL are recorded in the ignored
`.marketing-build/deployment.json`.

This deploys the webpage only. Workspace, brand, creative, and performance
entry points explicitly explain that the authenticated product is not deployed
on this domain yet. `app.mykos.ai` did not resolve during inspection, so links
are not redirected to that unavailable hostname. The full local app keeps its
existing routes and behavior.

The existing Git integration is unchanged: a future push to the separate
`kumarshivam0512/mykos-site` repository may replace a direct-upload deployment.
Pushes to `hugemonkey/mykos-ai` do not automatically update Pages. Use the
commands above for this repository until an intentional Git pipeline migration
is completed.

### Optional Vercel deployment

[vercel.json](./vercel.json) explicitly selects the Next.js framework and
`npm run build`. Leave the output directory at the framework default; this is
not a static export. The standalone output in [next.config.ts](./next.config.ts)
remains available for the existing container deployment.

Cloudflare DNS/proxy in front of Vercel is an alternative deployment approach,
not the current confirmed setup. Moving from Pages to Vercel requires an
explicit migration decision and a verified preview before changing production
routing. Cloudflare nameservers and a `Server: cloudflare` response alone do
not identify the origin.

### Connect the production project

1. Use the Vercel account/team that owns the current origin. Connect
   `hugemonkey/mykos-ai` through its GitHub integration, with root directory `.`
   and Production Branch `main`. GitHub's default branch is a separate setting;
   changing it alone does not connect the domain or select Vercel's production
   branch.
2. Configure required production environment variables in the provider's secret
   settings. Do not commit or upload `.env.local`. Confirm the authentication
   callback URLs match the hostname that actually serves the workspace.
3. Build and test a preview first. In addition to public pages, validate login,
   authenticated APIs, and media rendering. Native ffmpeg/ffprobe binaries and
   Remotion's browser rendering need a supported runtime and sufficient resource
   limits; a successful homepage build does not verify these routes work in
   Vercel Functions. Keep rendering on a suitable Node/container backend if
   those checks fail.
4. Add `mykos.ai` to the correct Vercel project's Domains settings. In Cloudflare,
   use the exact DNS targets and any ownership-verification records returned by
   that project, not a guessed/shared Vercel address. Inspect existing Workers
   routes, redirects, and Origin Rules before modifying records. Preserve
   `app.mykos.ai`, mail records, and unrelated subdomains.
5. If retaining the Cloudflare proxy, use Full (strict) TLS after the origin's
   certificate is valid. Do not apply shared HTML caching to authenticated
   workspace/API traffic. Follow the project's domain-verification guidance
   about proxy status rather than changing it blindly.
6. Promote the verified deployment and check the live page, asset responses,
   authentication, and the deployment's Git commit. A push alone is not proof
   that the domain was updated.

### Access needed to synchronize Cloudflare

- The Cloudflare account ID and zone ID for `mykos.ai`, plus the current apex
  DNS record's unproxied target and any matching Worker route/custom domain.
- Start with authenticated dashboard access or a zone-scoped API token with
  **Zone: Read** and **DNS: Read**. To apply confirmed DNS changes, grant
  **DNS: Edit** for this zone only. Inspecting or changing Workers/Pages requires
  separate account-scoped permissions only if those services are the origin.
- The existing Vercel project name/ID and access to its owning team, GitHub
  integration, production branch, environment settings, and Domains settings.
- If Cloudflare itself hosts the site, provide the Workers/Pages project name,
  Git repository, production branch, and build/deploy settings instead. A
  Cloudflare runtime migration is separate from DNS synchronization: this app's
  dynamic APIs and native media dependencies must be checked before adopting a
  Workers adapter. Do not configure Pages static output for the full app.

Authenticate through the provider CLI/dashboard or a secure local environment;
never paste API tokens into chat or commit them.

Provider references:
[Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying),
[Vercel project configuration](https://vercel.com/docs/project-configuration),
[Cloudflare DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/),
and [Cloudflare Next.js hosting](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).
