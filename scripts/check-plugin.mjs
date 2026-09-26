#!/usr/bin/env node
// The Codex plugin in plugins/hydrant/ ships a copy of skills/hydrant, because
// Codex drops symlinks when it caches a plugin. skills/hydrant is the source.
//   node scripts/check-plugin.mjs          fail on drift or a broken manifest
//   node scripts/check-plugin.mjs --write  refresh the copy from the source

import { cp, readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const SOURCE = "skills/hydrant";
const PLUGIN = "plugins/hydrant";
const COPY = join(PLUGIN, "skills/hydrant");

if (process.argv.includes("--write")) {
  await rm(COPY, { recursive: true, force: true });
  await cp(SOURCE, COPY, { recursive: true });
  console.log(`Copied ${SOURCE} to ${COPY}.`);
}

const errors = [];

async function files(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...(await files(join(dir, entry.name), rel)));
    else if (entry.isFile()) out.push(rel);
    else errors.push(`${join(dir, entry.name)}: not a regular file (Codex drops symlinks)`);
  }
  return out.sort();
}

async function exists(path) {
  return stat(path).then(() => true, () => false);
}

async function json(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (err) {
    errors.push(`${path}: ${err.message}`);
    return {};
  }
}

// 1. The plugin's skills are exactly the source hydrant skill, byte for byte.
const pluginSkills = await readdir(join(PLUGIN, "skills"));
if (pluginSkills.join() !== "hydrant") errors.push(`${PLUGIN}/skills: expected only hydrant, found ${pluginSkills.join(", ")}`);
const [sourceFiles, copyFiles] = [await files(SOURCE), await files(COPY)];
if (sourceFiles.join() !== copyFiles.join()) errors.push(`${COPY}: file list differs from ${SOURCE}`);
for (const file of sourceFiles.filter(f => copyFiles.includes(f))) {
  const [a, b] = await Promise.all([readFile(join(SOURCE, file)), readFile(join(COPY, file))]);
  if (!a.equals(b)) errors.push(`${join(COPY, file)}: differs from ${join(SOURCE, file)}`);
}

// 2. Every path the manifests point at exists.
const manifest = await json(join(PLUGIN, ".codex-plugin/plugin.json"));
const paths = [manifest.skills, manifest.mcpServers, manifest.interface?.composerIcon, manifest.interface?.logo, ...(manifest.interface?.screenshots ?? [])];
for (const path of paths.filter(Boolean)) {
  if (!(await exists(join(PLUGIN, path)))) errors.push(`${PLUGIN}: manifest points at missing ${path}`);
}
if (manifest.name !== "hydrant") errors.push(`${PLUGIN}: manifest name must be hydrant`);
if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) errors.push(`${PLUGIN}: manifest version must be x.y.z`);

// 3. The MCP server is the canonical HTTPS endpoint, with no secrets.
const mcp = await json(join(PLUGIN, ".mcp.json"));
const server = mcp.mcpServers?.hydrant;
if (server?.url !== "https://hydrant.dev/api/mcp" || server?.type !== "http") errors.push(`${PLUGIN}/.mcp.json: hydrant must be type http at https://hydrant.dev/api/mcp`);
if (Object.keys(server ?? {}).some(k => k !== "type" && k !== "url") || /token|bearer|authorization|key/i.test(JSON.stringify(mcp))) errors.push(`${PLUGIN}/.mcp.json: only type and url, no tokens, keys or headers; the server signs in with OAuth`);

// 4. The repo marketplace resolves to the plugin.
const market = await json(".agents/plugins/marketplace.json");
for (const plugin of market.plugins ?? []) {
  if (!(await exists(join(plugin.source?.path ?? "", ".codex-plugin/plugin.json")))) errors.push(`.agents/plugins/marketplace.json: ${plugin.name} has no plugin at ${plugin.source?.path}`);
}

if (errors.length) {
  console.error(errors.join("\n") + "\nRun node scripts/check-plugin.mjs --write after editing skills/hydrant.");
  process.exit(1);
}
console.log(`Plugin ${manifest.name} ${manifest.version}: manifest, MCP server, marketplace and skill copy check out.`);
