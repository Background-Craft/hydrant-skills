#!/usr/bin/env node
// Build the generic GitHub Release asset: the base skill, not the workflow pack.
import { cp, lstat, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const run = promisify(execFile);
const output = process.argv[2] ?? "release/hydrant.tar.gz";
const stage = await mkdtemp(join(tmpdir(), "hydrant-gemini-"));
const files = ["LICENSE", "gemini-extension.json", "skills/hydrant/SKILL.md", "skills/hydrant/agents/openai.yaml"];

try {
  await rm(output, { force: true });
  for (const file of files) {
    if (!(await lstat(file)).isFile()) throw new Error(`${file}: must be a regular file`);
    await mkdir(dirname(join(stage, file)), { recursive: true });
    await cp(file, join(stage, file));
  }
  await mkdir(dirname(output), { recursive: true });
  await run("tar", ["-C", stage, "-czf", output, "gemini-extension.json", "LICENSE", "skills"]);
  console.log(`Built ${output}.`);
} catch (error) {
  await rm(output, { force: true });
  throw error;
} finally {
  await rm(stage, { recursive: true, force: true });
}
