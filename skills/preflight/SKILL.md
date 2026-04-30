---
name: preflight
description: Run the pre-PR quality gate on a Hydrant branch — lint, build, tests, coverage assessment, acceptance-criteria check, dependency-graph verification, production-safety review, and adversarial review. Use when the user asks for `/preflight`, says "preflight HYD-123", or wants final validation before shipping.
---

# Preflight

Run the full pre-PR quality gate on the current branch. Execute the gates sequentially; stop and fix issues as they arise. The output is a single report covering every gate, plus an `inReview` status update on the Hydrant issue if everything passes.

## Review principles

- Gates 1–3 are mechanical (lint, build, tests, coverage).
- Gate 4 is production safety.
- Gate 5 is an adversarial review.
- Findings matter more than summaries. A clean bill of health should be earned.

## Source of truth

- The user's codebase, build tooling, and tests for the mechanical gates.
- Hydrant MCP (`mcp__hydrant__*`) for the issue, its acceptance criteria, and its dependency graph.
- The user's `AGENTS.md` Alignment block for stack-specific commands (see below).

## Alignment lookup

Read the `<!-- BEGIN: hydrant alignment -->` block from `AGENTS.md` if it exists. Relevant keys for `/preflight`:

- `lint-cmd` — Gate 1.
- `typecheck-cmd` — Gate 1.
- `single-file-test-cmd` — Gate 2 fallback for branches where the project's full test command is too heavy.
- `package-manager` — context for resolving build commands when the project uses one (`npm run build`, `cargo build`, etc.).

If Alignment is missing or partial, **say so explicitly** in the gate report and either skip the corresponding gate or fall back to language-default commands the user can sanity-check (e.g. `cargo test` for a Rust crate, `pytest` for a Python project with `pyproject.toml`). Don't guess. Print one nudge if the Alignment block is absent: `Tip: run /align once so /preflight can drive the right lint/build/test commands.`

## Workflow

### Gate 1: Quality

Run, in order:

1. `lint-cmd` from Alignment, if present.
2. `typecheck-cmd` from Alignment, if present.
3. The project's build command, if Alignment or the project's manifest makes it discoverable (e.g. `npm run build` when `package.json` has a `build` script; `cargo build` for a Cargo project). If undiscoverable, skip and note.
4. Any project-specific structural check the user has wired into Alignment via a `lint-cmd` (e.g. file-size policies). Treat them like lint — failures are blocking.

Rules:

- Lint failures are blocking.
- Typecheck failures are blocking.
- Build failures are blocking.
- Skipped gates are reported, not pretended to pass.

If a structural check (filesize, dependency rules, etc.) fails, treat it as a refactoring signal — not a request for mechanical line-shedding. Prefer cohesive extraction along real responsibility boundaries:

- Pull reusable components, hooks, helpers, or domain modules out at natural seams.
- Move branching logic, transforms, and formatting into tested utilities when appropriate.
- Reduce duplication and clarify ownership between layers.
- Keep behavior intact and add or update tests when logic moves.

Do not pass `/preflight` by deleting useful context, compressing readable code, or splitting files only to satisfy a threshold. If the right refactor is bigger than the current shipping scope, leave preflight failed and ask the user whether to do the refactor now or explicitly defer the branch.

### Gate 2: Tests

Run the project's focused, non-browser test suite if it exists. Resolve via Alignment first; otherwise check the project's manifest for a documented test command.

Rules:

- All failing tests are blocking.
- If there is no test suite, state that clearly and continue.
- For browser-visible behavior, use whatever browser-automation affordance the user's harness provides — `/preflight` doesn't prescribe a tool. After browser checks, clean up any windows or sessions the harness opened.

### Gate 3: Test coverage assessment

Review `git diff <primary>...HEAD` and decide whether tests are required for this branch.

Bias toward writing tests when the diff adds or changes:

- Calculations or transforms.
- Branching logic.
- Backend logic (queries, mutations, actions, server-side handlers).
- Validators or permission checks.
- Existing tested logic.
- Parsing, formatting, or serialization.

Tests are usually not required for:

- Purely declarative UI.
- Docs- or config-only changes.
- Wiring already-tested logic into UI.

If tests are required and missing, write and run them. If they fail, treat as a Gate 2 failure.

### Gate 3b: Acceptance-criteria verification

If the branch maps to a Hydrant issue (extract identifier from branch name, e.g. `hyd-537-...` → `HYD-537`):

1. `mcp__hydrant__get_issue({ identifier, include: ["context"] })`.
2. Parse the acceptance criteria from the description's `## Acceptance Criteria` section.
3. Compare each criterion against the diff. Use these verdicts:
   - **Met** — diff demonstrably satisfies the criterion.
   - **Unmet** — diff doesn't satisfy and you can verify that from code.
   - **Manual** — criterion requires human verification (UI behavior, end-to-end flow).
   - **N/A** — criterion no longer applies.

Unmet code-verifiable criteria are warnings — surface them prominently. Don't silently mark as Met.

### Gate 3c: Dependency-graph verification

Treat Hydrant's first-class dependency graph as the source of truth. Ignore prose `Dependencies:` lists in the description except as optional human context.

After `mcp__hydrant__get_issue`:

1. Read `issue.dependencies.blockedBy`.
2. For each blocker, fetch via `mcp__hydrant__get_issue` and check status:
   - `done` or `canceled` → **satisfied**.
   - Any other status → **still open**.
3. If any blockers are still open, surface them prominently with blocker ID, current status, and an explicit `still open` flag.
4. Do **not** silently ignore open blockers.
5. Do **not** promote dependency findings to BLOCKED unless the user explicitly asks for a vetoing dependency policy.
6. Also read `issue.dependencies.blocks` and `issue.dependencies.relatesTo`. (If a payload exposes `related` instead of `relatesTo`, handle defensively.)
7. Emit a `Graph` heading in the preflight summary with:
   - `blockedBy` — each blocker's status and satisfaction classification.
   - `blocks`.
   - `relatesTo` / `related`.

If the branch doesn't clearly map to a Hydrant issue, state that and skip issue-specific gates and status changes.

### Gate 4: Production safety

Review the diff for:

- Schema or data-model backward compatibility.
- Deploy-ordering safety between layers (e.g. backend deploys before frontend that consumes new fields).
- Migration needs for any altered data shapes.
- Breaking API or contract changes.
- Seed / fixture / config consistency when schema changes.

Schema or deploy-ordering risks are blocking unless the user explicitly accepts them.

### Gate 5: Adversarial review

Perform a fresh review pass with explicit skepticism. Pretend you didn't write any of this code. Inspect:

- **Correctness** — does it actually do what the issue says? Edge cases handled?
- **Security** — input validation, authn/authz, injection vectors, secret handling.
- **Conventions** — fits the project's existing patterns? Doesn't introduce a new style for no reason?
- **Completeness** — every acceptance criterion addressed? No half-implemented branch?
- **Risk** — any change to a hot path, shared library, or contract that other code depends on?
- **Style** (when UI changed) — spacing, hierarchy, loading and error states, accessibility.

Don't restate that the code looks fine. A clean bill of health should be earned with specific observations.

## Output

Produce a single preflight summary covering:

- Quality (lint, typecheck, build).
- Tests.
- Coverage decision.
- Acceptance-criteria status.
- `Graph` (blockedBy / blocks / relatesTo-or-related).
- Production safety.
- Adversarial review findings.
- Diff size (line count, files touched).

Output the report to the console. Do not write report files to disk.

## Post-preflight

If preflight **passes** and the branch maps to a Hydrant issue:

1. `mcp__hydrant__update_issue({ id, status: "inReview" })`.
2. Ask whether the user wants to run `/yeet` to push, open a PR, and ship.

If preflight **does not pass**, do not move the issue to `inReview`. Leave the branch state as-is so the user can fix and re-run.

## Edge cases

- **Alignment is absent.** Run gates with documented language-default commands when discoverable; skip and report otherwise. Recommend `/align`.
- **Test suite takes a long time.** Run it. Don't skip "for speed" — preflight is the place where the slow checks happen. If the user wants a faster gate, that's `/go`'s Phase 5, not `/preflight`.
- **Diff is huge (1000+ lines).** Run all gates anyway, but include a diff-size warning in the summary. Big diffs deserve a slower adversarial review.
- **Blockers are still open.** Surface as warnings. Do not auto-veto unless the user has opted into a strict dependency policy.

## What this skill never does

- Skip a gate to "save time".
- Move issue status past `inReview`. Shipping (`done`) is `/yeet`'s job.
- Push, force-push, or open a PR. That's `/yeet`.
- Auto-fix lint or test failures without surfacing them. Failures are signals; the user decides the fix.
- Mark Unmet acceptance criteria as Met. Honest reports beat optimistic ones.

## Why this matters

`/preflight` is the last cheap chance to catch regressions, missing tests, broken contracts, and unmet acceptance criteria before the change becomes part of `main`. The cost of catching them here is a few minutes of re-running gates; the cost of catching them post-merge is everyone's morning.
