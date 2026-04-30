#!/usr/bin/env node
// Walk every **/SKILL.md file in the repo and validate its YAML frontmatter.
// Fails fast (non-zero exit) on the first set of problems found, after reporting
// every failure. Run from the repo root: `node scripts/validate-frontmatter.mjs`.

import { readFile, readdir } from "node:fs/promises";
import { relative, sep } from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([".git", "node_modules"]);
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const NAME_RE = /^[a-z][a-z0-9-]*$/;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && IGNORED_DIRS.has(entry.name)) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = `${dir}${sep}${entry.name}`;
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      yield full;
    }
  }
}

function parseFrontmatter(source, file) {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    return { errors: [`${file}: missing YAML frontmatter (no leading --- block)`] };
  }
  const block = match[1];
  const errors = [];
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      errors.push(`${file}: malformed frontmatter line: "${rawLine}"`);
      continue;
    }
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, errors };
}

function validate(file, data, dirName) {
  const errors = [];
  const name = data.name;
  const description = data.description;
  if (!name) {
    errors.push(`${file}: frontmatter missing required field "name"`);
  } else if (!NAME_RE.test(name)) {
    errors.push(
      `${file}: frontmatter "name" must be lowercase letters/digits/hyphens, starting with a letter (got "${name}")`,
    );
  } else if (dirName && name !== dirName) {
    errors.push(
      `${file}: frontmatter "name" ("${name}") must match the parent directory name ("${dirName}")`,
    );
  }
  if (!description) {
    errors.push(`${file}: frontmatter missing required field "description"`);
  } else if (description.length < 20) {
    errors.push(
      `${file}: frontmatter "description" is too short (${description.length} chars; aim for ≥20 so harnesses can route to the skill)`,
    );
  }
  return errors;
}

async function main() {
  const failures = [];
  let count = 0;
  for await (const file of walk(ROOT)) {
    count += 1;
    const rel = relative(ROOT, file);
    const segments = rel.split(sep);
    const dirName = segments.length >= 2 ? segments[segments.length - 2] : null;
    let source;
    try {
      source = await readFile(file, "utf8");
    } catch (err) {
      failures.push(`${rel}: could not read file (${err.message})`);
      continue;
    }
    const { data, errors: parseErrors } = parseFrontmatter(source, rel);
    if (parseErrors?.length) {
      failures.push(...parseErrors);
      continue;
    }
    const validationErrors = validate(rel, data, dirName);
    if (validationErrors.length) {
      failures.push(...validationErrors);
    }
  }
  if (count === 0) {
    console.log(
      "No SKILL.md files found yet — validator passed trivially. Add skills under skills/<name>/SKILL.md.",
    );
    process.exit(0);
  }
  if (failures.length) {
    for (const failure of failures) {
      console.error(`✘ ${failure}`);
    }
    console.error(`\n${failures.length} problem(s) across ${count} SKILL.md file(s).`);
    process.exit(1);
  }
  console.log(`✓ ${count} SKILL.md file(s) validated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
