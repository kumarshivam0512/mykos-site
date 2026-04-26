# mykos-site

Marketing landing page for [mykos.ai](https://mykos.ai).

## Stack

- Plain HTML + Tailwind (CDN) — zero build step
- Hosted on **Cloudflare Pages**
- Email capture via [Formspree](https://formspree.io) free tier

## Structure

```
mykos-site/
├── index.html      ← the landing page
├── favicon.svg
└── README.md
```

## Local preview

```powershell
# any static file server works
python -m http.server 8080
# then open http://localhost:8080
```

## Deploy

Cloudflare Pages auto-deploys on every push to `main`.

| Setting | Value |
|---|---|
| Build command | _(none — static site)_ |
| Build output directory | `/` |
| Custom domain | `mykos.ai` + `www.mykos.ai` |

## Email form

The form on `index.html` posts to Formspree. After creating a free Formspree
account and a new form, replace `REPLACE_WITH_FORM_ID` in `index.html` with
your form ID. Submissions are delivered to `kumar@mykos.ai`.

## Related repos

- [`aiads`](https://github.com/kumarshivam0512/aiads) — the product (private)
