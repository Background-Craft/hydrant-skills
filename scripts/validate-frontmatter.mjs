#!/usr/bin/env node
// Walk every **/SKILL.md file under the current working directory and validate
// its YAML frontmatter. Reports every problem found, then exits non-zero if any
// were found and zero otherwise. Run from the repo root:
//   node scripts/validate-frontmatter.mjs

import { readFile, readdir } from "node:fs/promises";
import { relative, sep } from "node:path";
import { parse } from "yaml";

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
  // Strip a leading byte-order mark, as the skills CLI does before matching.
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    return { errors: [`${file}: missing YAML frontmatter (no leading --- block)`] };
  }
  // Parse the block as real YAML with strict default options, so anything a
  // YAML-parsing installer would reject (for example an unquoted ": " inside a
  // value) fails here too.
  let data;
  try {
    data = parse(match[1]);
  } catch (err) {
    return { errors: [`${file}: invalid YAML frontmatter: ${err.message}`] };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { errors: [`${file}: frontmatter must be a YAML mapping of fields`] };
  }
  const errors = [];
  for (const field of ["name", "description"]) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== "string") {
      errors.push(`${file}: frontmatter "${field}" must be a string (got ${typeof data[field]})`);
    }
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
