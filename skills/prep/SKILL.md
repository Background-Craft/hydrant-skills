---
name: prep
description: Assess Hydrant issue readiness before implementation — fetch issue and codebase context, identify and de-risk unknowns, and decide if the issue can move to `/go`. Use when the user asks for `/prep`, says "prep HYD-123", or wants a readiness gate before coding.
---

# Prep

Evaluate whether a Hydrant issue has enough signal to implement confidently. This is a triage gate, not the implementation step. Output is one of three decisions: **READY**, **NEEDS CLARIFICATION**, or **NOT READY**.

## Source of truth

- Hydrant MCP (`mcp__hydrant__*`) for live issue, dependency, label, milestone, decision, note, and space state. Use additional MCP reads when the issue points at broader project context (linked decisions, notes, sibling issues).
- The user's codebase for technical feasibility, existing patterns, and likely file targets.
- The user's `AGENTS.md` Alignment block for stack conventions (see below).
- If Hydrant MCP is unavailable, say so explicitly and stop unless the user explicitly authorizes a local-only fallback.

## Alignment lookup

Read the `<!-- BEGIN: hydrant alignment -->` block from `AGENTS.md` if it exists. Relevant keys for `/prep`:

- `branch-naming` — pattern for the issue's canonical branch name (Hydrant also returns `branchName` on each issue; prefer that when present).
- `single-file-test-cmd` — informs the de-risk phase (when to recommend a spike test).
- `package-manager`, `lint-cmd`, `typecheck-cmd` — context for the implementation sketch.

Missing keys → fall back to safe defaults; print one nudge if the block is absent: `Tip: run /align once so /prep can tailor its readiness checks to this codebase.`

## Issue resolution

Normalize the input:

- `HYD-12` → use directly.
- `12` → normalize to `HYD-12`.

If the issue can't be found:

1. `mcp__hydrant__list_issues` with the keyword in `searchText`.
2. Show the likely matches.
3. Ask the user which one they meant.

For valid issues, fetch with linked context in one call:

- `mcp__hydrant__get_issue({ identifier, include: ["context"] })` — issue body plus dependencies, decisions, notes, labels, space.

## Workflow

### Phase 0: Worktree readiness (only if applicable)

If the user's harness uses git worktrees and you're inside one:

- Confirm the worktree's basic environment is healthy: dependencies installed, environment files present, primary services reachable as the project expects.
- Treat any already-running local services for this worktree as healthy, not as a failure.
- Do **not** rerun any project bootstrap script unless the user asked for it or the worktree is clearly broken.

If the user isn't using worktrees, skip this phase entirely.

Placeholder branches (e.g. `henry/ecstatic-satoshi`) are acceptable during prep. If the issue ends up READY, `/prep` may rename the placeholder to the issue's canonical branch name.

### Phase 1: Gather issue context

Extract from `mcp__hydrant__get_issue`:

- Title, status, priority, type.
- Description sections (problem, goal, scope, acceptance criteria, implementation notes, edge cases).
- `dependencies.blockedBy` — who must finish first.
- `dependencies.blocks` and `relatesTo` — for context.
- Linked decisions and notes — fetch with `mcp__hydrant__get_decision` / `get_note` if their content matters for readiness.

Inspect labels and milestone fit:

- If the issue has no labels and the space has obviously fitting ones (`mcp__hydrant__list_labels`), flag the gap.
- If a milestone clearly fits and none is set (`mcp__hydrant__list_milestones`), flag the gap.

These are gaps to mention in the report — usually not blockers by themselves.

### Phase 2: Gather codebase context

Pick the depth deliberately. Don't sweep the whole tree.

#### Tier 1 — Targeted

Use for: copy tweaks, narrow bug fixes, single-file changes with a clear target.

Do:

1. Search for the file, function, or component the issue names.
2. Read the immediate surrounding code (~50 lines either side).
3. Check for nearby tests.
4. If UI is involved, confirm whether the components needed already exist before assuming new UI work is required.

#### Tier 2 — Domain scan

Use for: typical features, multi-file changes, one main domain with some spillover.

Do:

1. Identify the affected domain.
2. Read project docs the issue points at (`README.md`, `AGENTS.md`, anything under obvious doc directories).
3. Read project-specific guidelines in the relevant area (e.g. backend conventions, frontend conventions — whatever the project keeps as its in-tree guide).
4. Inspect relevant data model and function files.
5. Search for existing patterns in the affected area.
6. If UI is involved, run the UI context scan below.

#### Tier 3 — Cross-domain exploration

Use for: architectural work, broader workflow changes, unclear blast radius, multi-domain features or refactors.

Do everything in Tier 2, plus:

1. Trace data flow between the affected layers.
2. Inspect adjacent domains and integration points.
3. Check recent history in affected files when useful (`git log --oneline -10 -- <path>`).

### UI context scan (when UI work is involved)

Capture the established patterns before declaring the issue ready:

- Current composition on the target page or component.
- One or two sibling pages in the same product area.
- Loading, empty, and error-state handling.
- Component choices already present in the user's codebase.
- Whether the needed components already exist or whether new ones must be added.

If the user's harness or repo has a preview-target convention for browser validation, note which target should be used. Don't assume `localhost:3000` or any specific port — let the project's tooling resolve it.

### Phase 3: Readiness assessment

Score the issue on each dimension:

| Dimension | What to check |
|---|---|
| Problem clarity | Can you state the goal in one sentence? |
| Acceptance criteria | Are they specific and testable? |
| Scope boundaries | In-scope and out-of-scope both explicit? |
| Technical path | Can you identify which files to touch and roughly how? |
| Edge cases | Obvious failure modes addressed or acknowledged? |
| Dependencies | `blockedBy` resolved? Ordering clear? |
| Labels & milestone | Set where the space has fitting ones? |
| UI patterns (if applicable) | Component choices and composition clear? |

### Phase 4: De-risk

Take each non-trivial risk and actively investigate it. The goal is to turn unknowns into knowns *before* implementation.

**Short-circuit**: if all risks are trivial (null checks, established patterns, things already solved elsewhere in the codebase), skip this phase and note "Risks: trivial, no de-risking needed".

For each non-trivial risk, pick the right mitigation:

- **Unknown API or library behavior** — read current docs; if needed, write a throwaway spike under `/tmp/spike-<issue>.<ext>` (never committed).
- **Schema or data risk** — verify validator compatibility, check existing data shapes, confirm backward compat.
- **Performance concern** — check indexes if the data layer has them, estimate data volume, confirm the chosen complexity is acceptable.
- **UI/UX ambiguity** — read 2–3 adjacent pages to identify the established pattern; if still ambiguous, ask the user.
- **Integration risk** — trace data flow end-to-end, grep all call sites, confirm the contract.
- **Blast radius** — grep all usages of affected functions or components, list every file impacted; if >10 files, flag for the user.

For each risk, record:

- **RESOLVED** — investigation confirmed the approach (cite evidence).
- **REDUCED** — narrowed but some uncertainty remains (explain what's left).
- **ACCEPTED** — risk is real but proceeding is justified.
- **BLOCKING** — investigation revealed a real problem (drops issue to NOT READY).

If any risk is BLOCKING, the decision becomes NOT READY regardless of other criteria.

### Phase 5: Decision

#### READY

Use when problem and goal are clear, acceptance criteria are specific, technical path is legible, blockers are manageable.

Actions:

1. `mcp__hydrant__update_issue({ id, status: "todo" })`.
2. Normalize branch state, using the issue's `branchName` field as canonical:
   - Already on the issue branch → no action.
   - On a placeholder worktree branch → `git branch -m <issue.branchName>`.
   - On the primary branch → `git fetch origin && git checkout -b <issue.branchName> origin/<primary>`.
   - On a different issue's branch → ask before switching.
3. Produce the readiness report.

#### NEEDS CLARIFICATION

Use when most of the issue is coherent but 1–3 concrete decisions still materially affect implementation.

Actions:

1. Ask at most 3 focused questions.
2. Include a recommendation with each, derived from the codebase.
3. Frame each as a decision, not an open-ended brainstorm.
4. After answers, re-evaluate and proceed to READY or NOT READY.

#### NOT READY

Use when critical context is missing, the technical path can't be inferred responsibly, or a Phase 4 risk was found BLOCKING.

Actions:

1. State the blocking gaps explicitly.
2. If a de-risk finding caused the deny, include the evidence.
3. Suggest specific additions to the issue.
4. Recommend `/refine` or `/nail` to fill the gaps.

## Output format

### When READY

- Title, priority.
- 1–2 sentence understanding summary.
- Implementation sketch — likely files to touch, brief approach.
- De-risk findings (each risk with status and evidence — omit section if all risks were trivial).
- UI context section if applicable.
- Branch state result.

### When NEEDS CLARIFICATION

- Title.
- What's already clear.
- The questions, each with a recommendation.

### When NOT READY

- Title.
- Blocking gaps.
- De-risk findings if a risk was found BLOCKING.
- Concrete actions to unblock; recommend `/refine` or `/nail`.

## Edge cases

- **Issue is already in `inProgress` or `inReview`.** Confirm with the user before re-running prep — the issue may be mid-flight; re-prepping it could unset state the user cares about.
- **`blockedBy` includes an open issue.** Surface this prominently. Don't silently move to READY — ask the user whether to proceed (sometimes blockers are aspirational, not hard).
- **The issue's `branchName` is already taken on disk by an unrelated branch.** Don't clobber. Report the conflict and ask the user.
- **No codebase yet (empty repo).** Skip Phase 2; readiness is about the issue's clarity alone in that case.

## What this skill never does

- Start implementing. `/prep` is read-and-evaluate; coding lives in `/go`.
- Move issue status past `todo`. `inProgress` is `/go`'s job.
- Commit code. Spikes go to `/tmp/`, never the branch.
- Skip the readiness decision. Always end with READY, NEEDS CLARIFICATION, or NOT READY.

## Why this matters

The expensive failure mode is starting to code on an issue that turns out to need product input mid-implementation — the agent burns context on re-asking, the user gets jolted out of flow, and the work either stalls or ships wrong. `/prep` catches that at the cheap end of the cycle.
