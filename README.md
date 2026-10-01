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

The public research-lab homepage lives at `/`, implemented in `app/page.tsx`
with scoped styles in `app/research.module.css`. It uses a deep-navy and electric
blue visual identity and supports keyboard navigation and reduced motion.
Research directions are expandable disclosures, not claims of published results.

The original brand/campaign dashboard is preserved at `/workspace`. Login and
internal dashboard links return there. Existing root links containing `c`,
`brandId`, or `view=workspace` redirect to the workspace with their query values
preserved. Creative, brand, and performance routes are unchanged.

`components/app-shell.tsx` keeps workspace providers, the top bar, and sidebar
off the public homepage, so visiting the research site does not fetch account
or campaign data. Workspace styling remains unchanged.

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
