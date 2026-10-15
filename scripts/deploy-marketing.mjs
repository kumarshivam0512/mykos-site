import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const account = "612b67a6fe59e80db4939b1325b4e192";
const project = "mykos-site";
const branch = process.argv[2];
if (!branch) throw new Error("Specify a preview branch or main: npm run deploy:marketing -- <branch>");
const root = path.join(process.cwd(), ".marketing-build", "out");
const env = await readFile(".env.local", "utf8");
const entry = env.match(/^CLOUDFLARE_API_TOKEN\s*=(.*)$/m);
const token = process.env.CLOUDFLARE_API_TOKEN || entry?.[1].trim().replace(/^(['"])(.*)\1$/, "$2");
if (!token) throw new Error("Configure CLOUDFLARE_API_TOKEN locally.");
const api = "https://api.cloudflare.com/client/v4";
async function request(endpoint, credential, options = {}) {
  const response = await fetch(`${api}${endpoint}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${credential}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare ${endpoint}: ${response.status} ${JSON.stringify(data.errors)}`);
  }
  return data.result;
}
const prefix = `/accounts/${account}/pages/projects/${project}`;
await request(prefix, token);
const { jwt } = await request(`${prefix}/upload-token`, token);
const mime = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const manifest = {};
const assets = new Map();
async function collect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) await collect(file);
    else if (item.isFile()) {
      if (item.name.startsWith(".env") || item.name.endsWith(".map")) {
        throw new Error(`Unexpected private/debug artifact: ${item.name}`);
      }
      const bytes = await readFile(file);
      if (bytes.length > 25 * 1024 * 1024) throw new Error(`Pages file limit exceeded: ${file}`);
      const extension = path.extname(file);
      const hash = createHash("sha256").update(bytes).update(extension).digest("hex").slice(0, 32);
      const deploymentPath = `/${path.relative(root, file).split(path.sep).join("/")}`;
      manifest[deploymentPath] = hash;
      // Next's static segment requests use dotted names; Pages has no Next server to rewrite them.
      const segmentStart = deploymentPath.indexOf("/__next.");
      if (segmentStart !== -1 && deploymentPath.slice(segmentStart + 1).includes("/")) {
        manifest[deploymentPath.slice(0, segmentStart + 1) +
          deploymentPath.slice(segmentStart + 1).replaceAll("/", ".")] = hash;
      }
      assets.set(hash, {
        key: hash, value: bytes.toString("base64"), base64: true,
        metadata: { contentType: mime[extension] || "application/octet-stream" },
      });
    }
  }
}
await collect(root);
if (!manifest["/index.html"] || !manifest["/workspace/index.html"]) {
  throw new Error("Public export or explicit workspace access page is missing.");
}
const jsonHeaders = { "Content-Type": "application/json" };
const missing = await request("/pages/assets/check-missing", jwt, {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ hashes: [...assets.keys()] }),
});
for (let i = 0; i < missing.length; i += 20) {
  await request("/pages/assets/upload", jwt, {
    method: "POST", headers: jsonHeaders,
    body: JSON.stringify(missing.slice(i, i + 20).map((hash) => assets.get(hash))),
  });
}
await request("/pages/assets/upsert-hashes", jwt, {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ hashes: [...assets.keys()] }),
});
const form = new FormData();
form.set("manifest", JSON.stringify(manifest));
form.set("branch", branch);
form.set("commit_dirty", "true");
form.set("commit_message", "Deploy current Mykos Research Labs public webpage");
const deployment = await request(`${prefix}/deployments`, token, { method: "POST", body: form });
let ready = false;
for (let attempt = 0; attempt < 36; attempt++) {
  const status = await request(`${prefix}/deployments/${deployment.id}`, token);
  if (status.latest_stage?.status === "failure" || status.latest_stage?.status === "canceled") {
    throw new Error(`Deployment ${deployment.id} ${status.latest_stage.status}.`);
  }
  if (status.latest_stage?.name === "deploy" && status.latest_stage.status === "success") {
    ready = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!ready) throw new Error(`Deployment ${deployment.id} did not become ready within three minutes.`);
await writeFile(path.join(process.cwd(), ".marketing-build", "deployment.json"),
  JSON.stringify({ id: deployment.id, url: deployment.url, environment: deployment.environment }, null, 2));
console.log(JSON.stringify({
  id: deployment.id, url: deployment.url, environment: deployment.environment,
  files: Object.keys(manifest).length,
}, null, 2));
