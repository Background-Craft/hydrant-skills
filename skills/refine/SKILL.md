---
name: refine
description: Refine a rough or underspecified Hydrant issue into an implementable one — fill missing scope, acceptance criteria, edge cases, and metadata so it can move to `/prep` without further coaching. Use when the user asks for `/refine`, says "refine HYD-123", or wants an issue cleaned up before implementation.
---

# Refine

Refine a Hydrant issue by comparing what it says against what the codebase and project state actually require, then update it with the user's approval. `/refine` is for issues that are *incomplete* — gaps in scope, acceptance criteria, dependencies, labels, milestone fit. For issues that are complete-but-soft (vague language, ungrounded references, metadata buried in prose), use `/nail` after `/refine`.

## Source of truth

- Hydrant MCP for the live issue, sibling issues, labels, milestones, and dependencies. Use `mcp__hydrant__*` tools exclusively — never shell out to `gh`, `curl`, or hardcoded URLs.
- The user's codebase for grounding the refinement in reality (file paths, existing patterns, what's already shipped).

## Issue resolution

Normalize the input:

- `HYD-12` → use directly with `mcp__hydrant__get_issue({ identifier: "HYD-12" })`.
- `12` → normalize to `HYD-12`.
- Bare title or fragment → `mcp__hydrant__list_issues` with the keyword in `searchText` filtering, then ask the user which match they meant.

Fetch both:

- `mcp__hydrant__get_issue({ identifier, include: ["context"] })` — issue body plus linked decisions, notes, dependencies, labels, space.

If the issue can't be found, list likely matches via `mcp__hydrant__list_issues` and ask the user.

## Workflow

### Phase 1: Gather context

1. Fetch the issue with `include: ["context"]` so you have its decisions, notes, dependencies, and labels in one round-trip.
2. Read project docs the user keeps at the repo root or in obvious doc directories (`README.md`, `AGENTS.md`, anything the issue points at). Don't crawl the whole tree blindly — read what the issue references.
3. Inspect the codebase areas the issue would touch using whatever filesystem tools your harness exposes. The goal is to confirm references resolve and to spot what's already there.
4. Inspect related issues for overlap. Use `mcp__hydrant__list_issues` filtered by the issue's space, milestone, or labels — not a broad sweep.
5. Load `mcp__hydrant__list_labels({ spaceId })` and `mcp__hydrant__list_milestones({ spaceId })` so you can recommend metadata fits.

### Phase 2: Evaluate completeness

Judge each of the following as **present**, **weak**, or **missing**:

- Title — descriptive of the actual change?
- Status — appropriate for current readiness?
- Priority — set?
- Why this matters — problem or motivation paragraph?
- Goal — one-sentence statement of the change?
- In-scope items — concrete?
- Out-of-scope items — explicit fences?
- Acceptance criteria — testable from code or UI behavior?
- Implementation notes — file paths, APIs, conventions worth surfacing?
- Edge cases — at least the obvious failure modes named?
- Labels — applied, where the space has fitting ones?
- Milestone — assigned, when one fits?
- Dependencies — `blockedBy` / `blocks` / `relatesTo` populated as fields, not prose?
- Follow-on tickets — anything large enough to belong in its own issue, captured separately?

### Phase 3: Detect epic-level scope

If the issue would touch many independent surfaces or split naturally into 3+ tracks:

1. State why it reads as epic-level (count of files/domains, parallel-run-able tracks).
2. Suggest a breakdown: a milestone plus N flat issues. Hydrant uses **flat issues grouped by milestones** — there are no sub-issues. Don't propose parent/child structures.
3. Note likely implementation order via `blockedBy` / `blocks`.
4. Point out which sub-tickets can run in parallel.

The user decides whether to break it up. Don't auto-create sibling issues.

### Phase 4: Interactive refinement

Present the gaps as a batch of decisions, not as a passive report. For each gap:

- Quote the relevant existing text (or note its absence).
- Explain what's missing and why it matters for implementation.
- Propose a concrete fix — actual replacement text, actual label IDs, actual milestone IDs.

Bundle the most important gaps first (acceptance criteria > scope > metadata > cosmetics). Ask the user to approve, reject, or modify the batch.

### Phase 5: Apply changes

After approval:

1. `mcp__hydrant__update_issue({ id, description, title?, priority?, type?, labelIds?, milestoneId?, estimate?, linkedDecisionIds?, linkedNoteIds? })` with the approved updates in a single call.
2. If dependency changes were approved, apply the *full desired state* via `mcp__hydrant__set_dependencies({ issueId, blockedBy, blocks, relatesTo })`. Pass the complete arrays — `set_dependencies` is a replace, not a merge.
3. Create approved follow-on tickets via `mcp__hydrant__create_issue` only when the user explicitly opted into the breakdown.

### Phase 6: Output

Summarize:

- **Completeness level** — readable in one phrase ("Implementation-ready", "Mostly there, two gaps left", "Needs scope decisions before coding").
- **Changes applied** — what actually got written to Hydrant.
- **Open items still deferred** — anything the user explicitly chose to leave for later.
- **Next recommended step** — usually `/prep` if the issue is now solid; `/nail` if it's complete but the language is still vague; `/create-issue` if the breakdown produced new tickets.

If the issue was already solid before you started, say so explicitly and recommend `/prep` directly.

## Edge cases

- **Issue is in `done` status.** Refining a done issue is unusual — confirm with the user before changing it. The historical record matters.
- **Issue is a `bug` with no reproduction.** Treat reproduction steps as a critical missing field. An unrepeatable bug isn't refine-able.
- **Description references files that don't exist.** Flag the broken references in Phase 4 — those usually mean stale text or a partial migration. Either update the reference or remove it.

## What this skill never does

- Modify sibling issues without explicit approval. Refining HYD-123 doesn't license you to edit HYD-124.
- Write metadata into the description prose. Dependencies, priority, labels, milestone, estimate, assignee — every one of those has a Hydrant field. Use the field.
- Skip the user's approval step. The whole point is collaborative refinement.
- Run code, tests, or migrations. Refinement is a *thinking* operation, not an executing one.

## Why this matters

Underspecified issues either get implemented wrong or sit in the backlog forever because nobody knows where to start. `/refine` turns the second case into the first by surfacing what's missing and giving the user a single batch decision to make.
