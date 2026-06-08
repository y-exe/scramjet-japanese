import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "packages/demo/dist");
const target = path.join(root, "cloudflare/pages");

await fs.rm(target, { recursive: true, force: true });
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.cp(source, target, { recursive: true });

await fs.writeFile(
  path.join(target, "_headers"),
  `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: cross-origin
  Service-Worker-Allowed: /
`,
  "utf8",
);

console.log(`Copied Pages output to ${path.relative(root, target)}`);
