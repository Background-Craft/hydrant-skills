#!/usr/bin/env node
// The shared Codex, Claude Code and Cursor plugin ships a copy of skills/hydrant, because
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

const cursor = await json(join(PLUGIN, ".cursor-plugin/plugin.json"));
for (const path of [cursor.logo, cursor.skills, cursor.mcpServers].filter(Boolean)) {
  if (!(await exists(join(PLUGIN, path)))) errors.push(`${PLUGIN}: Cursor manifest points at missing ${path}`);
}
if (cursor.name !== manifest.name || cursor.version !== manifest.version) errors.push(`${PLUGIN}: Cursor name and version must match Codex`);
if (cursor.author?.name !== "Background Craft LLC" || cursor.license !== "MIT") errors.push(`${PLUGIN}: Cursor author and license must be Background Craft LLC and MIT`);
if (cursor.logo !== "assets/logo.png" || cursor.skills !== "./skills/" || cursor.mcpServers !== "./.mcp.json") errors.push(`${PLUGIN}: Cursor must use the shared logo, skills and MCP config`);
if (cursor.hooks || cursor.variables || cursor.rules || cursor.agents || cursor.commands) errors.push(`${PLUGIN}: Cursor must contain only the shared skill and MCP server`);

// 3. The MCP server is the canonical HTTPS endpoint, with no secrets.
const mcp = await json(join(PLUGIN, ".mcp.json"));
const server = mcp.mcpServers?.hydrant;
if (server?.url !== "https://hydrant.dev/api/mcp" || server?.type !== "http") errors.push(`${PLUGIN}/.mcp.json: hydrant must be type http at https://hydrant.dev/api/mcp`);
if (Object.keys(mcp).join() !== "mcpServers" || Object.keys(mcp.mcpServers ?? {}).join() !== "hydrant" || Object.keys(server ?? {}).some(k => k !== "type" && k !== "url") || /token|bearer|authorization|key/i.test(JSON.stringify(mcp))) errors.push(`${PLUGIN}/.mcp.json: only the hydrant server with type and url, no tokens, keys or headers; the server signs in with OAuth`);

// 4. The repo marketplace resolves to the plugin.
const market = await json(".agents/plugins/marketplace.json");
for (const plugin of market.plugins ?? []) {
  if (!(await exists(join(plugin.source?.path ?? "", ".codex-plugin/plugin.json")))) errors.push(`.agents/plugins/marketplace.json: ${plugin.name} has no plugin at ${plugin.source?.path}`);
}

const cursorMarket = await json(".cursor-plugin/marketplace.json");
if (cursorMarket.name !== "hydrant" || cursorMarket.owner?.name !== "Background Craft LLC" || cursorMarket.plugins?.length !== 1 || cursorMarket.plugins[0]?.name !== cursor.name || cursorMarket.plugins[0]?.source !== PLUGIN) errors.push(`.cursor-plugin/marketplace.json: expected only the shared hydrant plugin at ${PLUGIN}`);
if (!(await exists(join(cursorMarket.plugins?.[0]?.source ?? "", ".cursor-plugin/plugin.json")))) errors.push(`.cursor-plugin/marketplace.json: plugin manifest is missing`);

// 5. The Claude Code manifests match: same plugin, same version, and the marketplace resolves to it.
const claude = await json(join(PLUGIN, ".claude-plugin/plugin.json"));
if (claude.name !== manifest.name || claude.version !== manifest.version) errors.push(`${PLUGIN}/.claude-plugin/plugin.json: name and version must match the Codex manifest (${manifest.name} ${manifest.version})`);
const claudeMarket = await json(".claude-plugin/marketplace.json");
const claudeEntry = (claudeMarket.plugins ?? []).find(plugin => plugin.name === manifest.name);
if (typeof claudeEntry?.source !== "string" || !(await exists(join(claudeEntry.source, ".claude-plugin/plugin.json")))) errors.push(`.claude-plugin/marketplace.json: needs a ${manifest.name} entry whose source is the path of a plugin with .claude-plugin/plugin.json`);

if (errors.length) {
  console.error(errors.join("\n") + "\nRun node scripts/check-plugin.mjs --write after editing skills/hydrant.");
  process.exit(1);
}
console.log(`Plugin ${manifest.name} ${manifest.version}: Codex, Claude Code and Cursor manifests, MCP server, marketplaces and skill copy check out.`);
