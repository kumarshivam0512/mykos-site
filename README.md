# mykos-site

Marketing landing page for [mykos.ai](https://mykos.ai).

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS v4** (zero-config CSS-first)
- **Framer Motion** for scroll-triggered animations
- TypeScript

## Local development

```powershell
npm install
npm run dev
# open http://localhost:3000
```

## Production build

```powershell
npm run build
npm start
```

## Structure

```
mykos-site/
├── app/
│   ├── layout.tsx       Root layout, fonts, metadata
│   ├── page.tsx         Composes the page sections
│   └── globals.css      Tailwind + design tokens
├── components/
│   ├── Nav.tsx          Sticky blur-on-scroll header
│   ├── Hero.tsx         Parallax hero with glowing orb
│   ├── Problem.tsx      3-card pain points reveal
│   ├── HowItWorks.tsx   4-step animated timeline
│   ├── Platforms.tsx    Channel grid
│   ├── CTA.tsx          Email capture (Formspree)
│   └── Footer.tsx
└── public/
    └── favicon.svg
```

## Deploy

Cloudflare Pages auto-deploys on every push to `main`.

| Setting | Value |
|---|---|
| Framework preset | **Next.js** |
| Build command | `npm run build` |
| Build output | `.next` |
| Node version | 20 (set via env var `NODE_VERSION`) |
| Custom domain | `mykos.ai` + `www.mykos.ai` |

## Email form

Replace `REPLACE_WITH_FORM_ID` in [`components/CTA.tsx`](components/CTA.tsx)
with your Formspree form ID once you've created the free account.

## Related

- [`aiads`](https://github.com/kumarshivam0512/aiads) — the product (private)
