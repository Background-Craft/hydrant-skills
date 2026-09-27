#!/usr/bin/env node
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { gunzipSync } from "node:zlib";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const run = promisify(execFile);
const archive = process.argv[2] ?? "release/hydrant.tar.gz";
const errors = [];

async function inventory(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    const status = await lstat(join(dir, entry.name));
    if (status.isDirectory()) out.push(path, ...(await inventory(join(dir, entry.name), path)));
    else if (status.isFile()) out.push(path);
    else errors.push(`${path}: must be a regular file or directory`);
  }
  return out.sort();
}

const manifest = JSON.parse(await readFile("gemini-extension.json", "utf8"));
const server = manifest.mcpServers?.hydrant;
const allowedManifestKeys = ["description", "mcpServers", "name", "version"];
if (Object.keys(manifest).sort().join() !== allowedManifestKeys.join()) errors.push("gemini-extension.json: contains unsupported extension behavior");
if (manifest.name !== "hydrant" || manifest.version !== "0.3.3") errors.push("gemini-extension.json: expected hydrant 0.3.3");
if (server?.httpUrl !== "https://hydrant.dev/api/mcp" || Object.keys(server ?? {}).join() !== "httpUrl") errors.push("gemini-extension.json: hydrant must contain only the canonical httpUrl");
if (Object.keys(manifest.mcpServers ?? {}).join() !== "hydrant") errors.push("gemini-extension.json: expected only the hydrant MCP server");

const sourceFiles = ["LICENSE", "gemini-extension.json", "skills/hydrant/SKILL.md", "skills/hydrant/agents/openai.yaml"];
for (const file of sourceFiles) {
  if (!(await lstat(file)).isFile()) errors.push(`${file}: must be a regular file`);
}
const expected = ["LICENSE", "gemini-extension.json", "skills", "skills/hydrant", "skills/hydrant/SKILL.md", "skills/hydrant/agents", "skills/hydrant/agents/openai.yaml"];
const tar = gunzipSync(await readFile(archive));
const entries = [];
for (let offset = 0; offset + 512 <= tar.length && tar[offset] !== 0;) {
  const header = tar.subarray(offset, offset + 512);
  entries.push(header.toString("utf8", 0, 100).split("\0")[0].replace(/\/$/, ""));
  const size = Number.parseInt(header.toString("ascii", 124, 136).replace(/\0/g, "").trim(), 8);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error("archive: invalid tar entry size");
  offset += 512 + Math.ceil(size / 512) * 512;
}
if (entries.sort().join() !== expected.join()) errors.push("archive: unexpected raw tar entries (including metadata)");
const stage = await mkdtemp(join(tmpdir(), "hydrant-gemini-check-"));

try {
  await run("tar", ["-xzf", archive, "-C", stage]);
  const actual = await inventory(stage);
  if (actual.join() !== expected.join()) errors.push(`archive: expected ${expected.join(", ")}, found ${actual.join(", ")}`);
  for (const file of sourceFiles) {
    const source = await readFile(file);
    const archived = await readFile(join(stage, file)).catch(() => null);
    if (!archived || !archived.equals(source)) errors.push(`archive: ${file} differs from source`);
  }
} finally {
  await rm(stage, { recursive: true, force: true });
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Gemini extension: manifest, archive inventory and source copies check out.");
