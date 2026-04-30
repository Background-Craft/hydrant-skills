---
name: go
description: Implement a Hydrant issue end-to-end — fetch context, set up the branch, plan, build, verify, and commit. Use when the user asks for `/go`, says "go HYD-123", "implement HYD-123", or wants implementation started on a specific issue. The "do the work" command in the lifecycle.
---

# Go

Take a Hydrant issue from `todo` (or wherever it is) to a committed implementation on the issue's branch. `/go` assumes the issue is already shaped — if it isn't, run `/prep` first.

## Source of truth

- Hydrant MCP (`mcp__hydrant__*`) for issue, dependency, decision, note, label, milestone, and space state. Use additional MCP reads when the issue points at broader project context.
- The user's codebase for implementation patterns, technical constraints, and verification.
- The user's `AGENTS.md` Alignment block for stack conventions (see below).
- If Hydrant MCP is unavailable, say so explicitly and stop unless the user explicitly authorizes a local-only fallback.

## Alignment lookup

Read the `<!-- BEGIN: hydrant alignment -->` block from `AGENTS.md` if it exists. Relevant keys for `/go`:

- `branch-naming` — pattern for branches when the issue's `branchName` field is missing. (Issues created via `mcp__hydrant__create_issue` always get a `branchName`; prefer that.)
- `single-file-test-cmd` — informs Phase 5 verification (run targeted tests on changed files).
- `lint-cmd`, `typecheck-cmd` — Phase 5 verification gates.
- `package-manager` — context for build/install commands when implementation requires them.

Missing keys → fall back to safe defaults: skip the gate that lacks a command and print a one-line note. Don't guess at lint or test commands. Print one nudge if the block is absent: `Tip: run /align once so /go can tailor its build and verify steps to this codebase.`

## Worktree rules

- If the user's harness uses worktrees, assume worktree bootstrap already ran. Don't rerun project bootstrap scripts unless the user asked.
- Treat already-running local services for the worktree as healthy.
- For browser validation, resolve the preview target via the project's own tooling. Do not assume `localhost:3000` or any specific port.

## Issue resolution

Normalize:

- `HYD-12` → use directly.
- `12` → normalize to `HYD-12`.

Fetch with context in one call:

- `mcp__hydrant__get_issue({ identifier, include: ["context"] })`.

If the issue can't be found, list likely matches via `mcp__hydrant__list_issues` and ask which one.

## Workflow

### Phase 1: Set up

1. **Fetch issue + context** as above.
2. **Update issue status** to `inProgress` via `mcp__hydrant__update_issue({ id, status: "inProgress" })`.
3. **Ensure branch state is correct**, using the issue's `branchName` field as canonical:

   | Current branch | Action |
   |---|---|
   | Already matches `issue.branchName` | No action. |
   | Primary branch (`main` etc.) | `git fetch origin && git checkout -b <branchName> origin/<primary>`. |
   | Placeholder worktree branch | `git branch -m <branchName>`. |
   | Different issue's branch | Ask the user before switching. |

4. **Check for unresolved blockers**: walk `issue.dependencies.blockedBy`. For each, fetch via `mcp__hydrant__get_issue` and check status. If any blocker isn't `done` or `canceled`, surface it and ask whether to proceed anyway. Do not auto-block — sometimes blockers are aspirational.

### Phase 2: Understand

Read what the implementation needs.

Always:

- Read the issue body carefully. Implementation notes, edge cases, and acceptance criteria are the spec.
- Inspect files mentioned or implied by the issue.
- Inspect existing patterns in the affected area — read 1–2 sibling files in the same module.

When relevant:

- Read project-specific guidelines for the affected layer (e.g. data-model conventions, frontend component conventions — whatever the project keeps in-tree).
- Inspect existing functions, queries, or mutations adjacent to the change.
- For UI: inspect adjacent UI patterns for layout, component composition, loading/empty/error states. If the project uses a component library, check what's already imported in the target page before adding new components.
- For library APIs (frontend, backend, build tooling) where you're not certain of the current shape, verify against current docs or project conventions instead of guessing.

### Phase 3: Plan

Before editing, present a concise implementation plan to the user. The plan covers:

- Files to edit or create.
- The role of each file.
- Approach (1–2 sentences per file).
- Risk areas — anything that could break or surprise.
- Validation plan — which gates from Phase 5 apply.

If the issue involves UI work, also include:

- Components to use (existing vs. new).
- Existing patterns in the codebase the implementation will follow.
- Loading, empty, and error-state handling.

If anything material is unclear, ask the minimum necessary question and include a recommendation derived from what you saw.

If your harness has a plan-mode equivalent (a structured proposal-and-approval gate before edits), use it. If it doesn't, present the plan inline as a TODO list and confirm before proceeding.

### Phase 4: Build

Implement the plan. Prefer the user's existing patterns over inventing new ones.

- Use existing components, helpers, and conventions first.
- Use the issue's `branchName` consistently. Don't create side branches.
- Prefer non-interactive `git` commands. Don't open editors that require human input.
- Make commits granular enough to revert cleanly. Don't pile unrelated changes into one commit.
- Stage explicitly (`git add <path>`); avoid `git add -A` and `git add .` which hoover up untracked files the user didn't intend to ship.

If implementation reveals the issue is wrong (the request can't be solved as written, or solving it would break another contract), stop and surface that. Don't quietly redefine the scope.

### Phase 5: Verify

Run the most relevant checks for the change. Drive them from Alignment when possible.

Default checks (in order):

1. `lint-cmd` — if Alignment provides one. Failures are blocking.
2. `typecheck-cmd` — if Alignment provides one. Failures are blocking.
3. `single-file-test-cmd` substituted with each changed file that has a sibling test, if Alignment provides one.
4. The project's full test command if known and the diff is broad enough to warrant it. (Don't run the full suite for a one-line copy change.)

If Alignment provides none of these, **say so explicitly** in the verification report. Don't guess at commands.

If the change adds logic with meaningful failure modes (calculations, transforms, branching, validators, parsing), add or update targeted tests. Don't rely on typecheck and lint alone for logic.

If UI validation is needed:

- In a worktree, resolve the preview target via the project's own tooling.
- Use whatever browser-automation affordance your harness provides against that target.
- If interactive validation has to be handed to the user, give steps using the resolved URL or port — never a generic `localhost:3000`.

### Phase 6: Commit

Commit only the intentional implementation work from this `/go` run.

Before committing:

- `git status --short` — confirm what's staged is what you meant.
- Inspect the relevant `git diff` for any noise.
- Stage explicitly. Don't sweep up unrelated changes the user has lying around unless they're explicitly part of the issue.

Draft a commit message in the repo's existing style (read recent `git log` for tone). Prefix with the Hydrant identifier if the issue maps to one (`HYD-NNN ...`). Never amend. Never skip hooks. Never bypass signing.

If verification failed or a blocker remains, **do not** create a misleading success commit. Summarize the blocker and leave the worktree state clear so the user can pick up.

### Phase 7: Summarize

After implementation, report:

- What changed (1–3 bullets).
- What was verified (which gates passed).
- The commit created (SHA + message).
- Any remaining risks or follow-ups.

## Edge cases

- **Issue has open `blockedBy` blockers.** Default behavior: surface them and ask before proceeding. Don't auto-block; sometimes blockers are aspirational.
- **Implementation reveals the issue is wrong.** Stop and surface. Don't redefine scope silently.
- **The user's harness lacks a plan-mode affordance.** Present the plan inline as a TODO list and confirm before editing.
- **No remote configured.** Phase 6 still works; Phase 7 notes that pushing and PR creation belong to `/yeet`.
- **Branch already has commits from a prior `/go` run on this issue.** Continue on the existing branch; don't reset.

## What this skill never does

- Push, force-push, or open a PR. That's `/yeet`.
- Move issue status past `inProgress`. `inReview` is `/preflight` / `/yeet`'s job; `done` is `/yeet`'s.
- Run destructive `git` commands (`reset --hard`, `clean -f`, `branch -D` on uncommitted work) without explicit confirmation.
- Skip lint/typecheck/test gates that Alignment configured. If a gate fails, fix or report; don't skip.
- Invent stack-specific commands. If Alignment doesn't define them, ask or skip.

## Why this matters

`/go` is where the agent does the actual implementation work. Keeping it stack-agnostic means the same skill works on a TypeScript web app, a Rust crate, a Python service, a Go binary, or a static-site generator — the Alignment block tells the skill what "verify" means for *this* codebase.
