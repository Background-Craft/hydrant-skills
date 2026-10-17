// hydrant-setup ships a list of the pack's other skills so it can plan
// without the network. This keeps that list equal to the skills/ folders.
// node --test discovers this file; run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HEADING = "### Shipped pack list";

// Returns the names in the "Shipped pack list" section, or null without one.
function shippedList(skillText) {
  const lines = skillText.split("\n");
  const start = lines.findIndex((line) => line.trim() === HEADING);
  if (start === -1) return null;
  const names = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6} /.test(line)) break;
    const match = /^- `([^`]+)`\s*$/.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

// Problems between the shipped list and skills/<name>/SKILL.md folders.
function packListProblems(root) {
  const skillsDir = join(root, "skills");
  const dirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "hydrant-setup")
    .filter((entry) => readdirSync(join(skillsDir, entry.name)).includes("SKILL.md"))
    .map((entry) => entry.name)
    .sort();
  const listed = shippedList(readFileSync(join(skillsDir, "hydrant-setup", "SKILL.md"), "utf8"));
  if (listed === null) return [`skills/hydrant-setup/SKILL.md has no "${HEADING}" section`];
  const problems = [];
  for (const name of dirs) {
    if (!listed.includes(name)) problems.push(`skills/${name} is not in the shipped pack list`);
  }
  for (const name of listed) {
    if (!dirs.includes(name)) problems.push(`shipped pack list names "${name}", which has no skills/${name}/SKILL.md`);
  }
  const duplicates = listed.filter((name, i) => listed.indexOf(name) !== i);
  for (const name of new Set(duplicates)) problems.push(`shipped pack list names "${name}" twice`);
  return problems;
}

function fixture(listed, dirs) {
  const root = mkdtempSync(join(tmpdir(), "pack-list-"));
  for (const name of ["hydrant-setup", ...dirs]) {
    mkdirSync(join(root, "skills", name), { recursive: true });
    writeFileSync(join(root, "skills", name, "SKILL.md"), `---\nname: ${name}\n---\n`);
  }
  const list = listed.map((name) => `- \`${name}\``).join("\n");
  writeFileSync(
    join(root, "skills", "hydrant-setup", "SKILL.md"),
    `# Hydrant setup\n\n${HEADING}\n\nIntro.\n\n${list}\n\n## Phase 2\n\n- \`not-a-skill\`\n`,
  );
  return root;
}

test("the shipped pack list matches the skills/ folders", () => {
  assert.deepEqual(packListProblems(REPO_ROOT), []);
});

test("fails when a skill folder is not listed", () => {
  const root = fixture(["capture"], ["capture", "newskill"]);
  try {
    assert.deepEqual(packListProblems(root), ["skills/newskill is not in the shipped pack list"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when a listed name has no skill folder", () => {
  const root = fixture(["capture", "gone"], ["capture"]);
  try {
    assert.deepEqual(packListProblems(root), [
      'shipped pack list names "gone", which has no skills/gone/SKILL.md',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
