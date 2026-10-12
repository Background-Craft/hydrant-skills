// Runs the frontmatter validator as a child process, the way CI does.
// node --test discovers this file; run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATOR = join(REPO_ROOT, "scripts", "validate-frontmatter.mjs");

function runValidator(cwd) {
  return spawnSync(process.execPath, [VALIDATOR], { cwd, encoding: "utf8" });
}

test("rejects frontmatter that is not valid YAML and names the file", () => {
  const dir = mkdtempSync(join(tmpdir(), "validate-frontmatter-"));
  try {
    const skillDir = join(dir, "skills", "broken");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: broken\ndescription: foo: bar\n---\n\n# Broken\n",
    );
    const result = runValidator(dir);
    assert.notEqual(result.status, 0, `expected failure, got:\n${result.stdout}`);
    assert.match(
      result.stderr,
      /skills[\\/]broken[\\/]SKILL\.md: invalid YAML frontmatter: /,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("accepts every SKILL.md in the repository", () => {
  const result = runValidator(REPO_ROOT);
  assert.equal(result.status, 0, `validator failed:\n${result.stderr}`);
  assert.match(result.stdout, /SKILL\.md file\(s\) validated\./);
});
