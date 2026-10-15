import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, ".marketing-build");
const files = [
  "app/globals.css",
  "app/marketing.module.css",
  "app/discover/[slug]/page.tsx",
  "components/marketing-home.tsx",
  "components/ui/interactive-hover-button.tsx",
  "components/ui/interactive-hover-button.module.css",
  "components/ui/matrix-code.tsx",
  "lib/marketing.ts",
  "postcss.config.mjs",
  "public/mykos-mushroom.svg",
  "public/research/ocean-simulation.jpg",
  "public/research/discover-supercomputer.jpg",
];

for (const obsolete of ["components/hero-waves.tsx", "public/waves.frag"]) {
  await rm(path.join(target, obsolete), { force: true });
}

for (const file of files) {
  const destination = path.join(target, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, file), destination);
}

const layout = (await readFile(path.join(root, "app/layout.tsx"), "utf8"))
  .replace('import AppShell from "@/components/app-shell";', "")
  .replace("<AppShell>{children}</AppShell>", "{children}");
await writeFile(path.join(target, "app/layout.tsx"), layout);
await writeFile(path.join(target, "app/page.tsx"), `
import MarketingHome from "@/components/marketing-home";
export const metadata = {
  title: "Mykos Research Labs | Agent Memory",
  description: "Experimental local-first memory for coding agents, with source-grounded findings and checked-result reuse bound to declared evidence.",
};
export default function Home() { return <MarketingHome />; }
`);
await writeFile(path.join(target, "next.config.mjs"), `
export default {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: ${JSON.stringify(root)} },
};
`);
await writeFile(path.join(target, "package.json"), JSON.stringify({
  name: "mykos-public-site",
  private: true,
  type: "module",
}));
await writeFile(path.join(target, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "react-jsx",
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./*"] },
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
}));

// Pages cannot run the full workspace's authentication and native rendering APIs.
for (const route of ["workspace", "brand", "creative", "performance"]) {
  const destination = path.join(target, "app", route);
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, "page.tsx"), `
import { MarketingHeader, MarketingFooter } from "@/components/marketing-home";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import styles from "@/app/marketing.module.css";
export const metadata = { title: "Local agent integration | Mykos Research Labs" };
export default function Access() {
  return <div className={styles.site}>
    <MarketingHeader />
    <main className={\`\${styles.wrap} \${styles.subpage}\`}>
      <span className={styles.badge}>Reasoning Checkpoints / Local access</span>
      <h1>This research build runs locally.</h1>
      <p className={styles.subpageLead}>Mykos is an experimental local SDK and MCP integration for coding agents. This domain does not host the service or store your agent memory.</p>
      <InteractiveHoverButton href="https://github.com/hugemonkey/reasoning-checkpoints" text="View the source" />
    </main>
    <MarketingFooter />
  </div>;
}
`);
}

const build = spawnSync(process.execPath, [
  path.join(root, "node_modules/next/dist/bin/next"),
  "build", target,
], { cwd: root, stdio: "inherit" });
if (build.error) throw build.error;
if (build.status !== 0) throw new Error(`Marketing build failed (${build.status}).`);
console.log(`Public site exported to ${path.join(target, "out")}. No environment files or API routes were copied.`);
