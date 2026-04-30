---
name: nail
description: Tighten an existing Hydrant issue — reduce ambiguity, ground vague references against the user's codebase, and extract inline metadata (dependencies, labels, milestone, priority) into proper Hydrant fields. Use when the user asks for `/nail`, says "nail HYD-123", or wants an issue made precise before implementation.
---

# Nail

Make a Hydrant issue mean exactly one thing. Every sentence should survive the question "what specifically does this mean in our codebase?". `/nail` is the precision pass — for issues that already have content, but where the content is soft.

## How this differs from `/refine`

- `/refine` — fills *gaps*. Adds missing scope, acceptance criteria, milestone, labels.
- `/nail` — tightens what's *already there*. Resolves vague language, extracts misplaced metadata, eliminates ambiguity against the codebase and sibling issues.

Run `/refine` first if the issue is incomplete. Run `/nail` when the issue has body text but that body text is vague, ungrounded, or carrying metadata in prose form.

## Source of truth

- Hydrant MCP for the live issue, sibling issues, structured fields. Use `mcp__hydrant__*` exclusively — no `gh api`, no `curl`, no hardcoded URLs.
- The user's codebase for grounding nouns and verbs against reality.

## Issue resolution

Normalize the input:

- `HYD-12` → use directly.
- `12` → normalize to `HYD-12`.

Fetch:

- `mcp__hydrant__get_issue({ identifier, include: ["context"] })` — body plus linked decisions, notes, dependencies, labels, space.

If not found, list likely matches via `mcp__hydrant__list_issues` and ask which one.

## Workflow

### Phase 1: Gather context

1. `mcp__hydrant__get_issue({ identifier, include: ["context"] })`.
2. Load sibling issues via `mcp__hydrant__list_issues` filtered by the same `milestoneId` and/or with `activeOnly: true` in the same `spaceId`.
3. `mcp__hydrant__list_labels({ spaceId })` and `mcp__hydrant__list_milestones({ spaceId })`.
4. Inspect the codebase areas the issue references using whatever search and read tools your harness exposes — grep for mentioned components, files, concepts.

### Phase 2: Detect ambiguity

Scan title, description, and acceptance criteria for these signals:

#### 2a — Vague language

- **Weasel verbs**: "improve", "handle", "update", "fix", "clean up", "refactor", "support" → what *observable* change?
- **Unmeasurable qualifiers**: "fast", "better", "cleaner", "more robust" → what threshold or comparison?
- **Hedge words**: "maybe", "possibly", "could", "might want to", "consider" → decide or cut.
- **Implicit "and"**: acceptance criteria that bundle multiple behaviors into one bullet → split.

#### 2b — Ungrounded references

- **Components / pages / files** mentioned by name that don't match the codebase. Example: text says "the settings page", grep finds three settings-shaped routes — replace with the specific path.
- **Concepts / features** that assume existence but don't exist yet (a field, an API, a component) — flag and ask the user whether to gate this issue on creating them or to drop the reference.
- **Stale references**: things that were renamed, moved, or deleted — fix or remove.

#### 2c — Metadata buried in prose

Detect structured data hiding in the description that belongs in proper Hydrant fields:

- **Dependencies**: "this depends on HYD-45", "blocked by …", "needs X first", "after we do Y" → merge into the desired `set_dependencies` state under `blockedBy` / `blocks`.
- **Relations**: "related to HYD-30", "see also HYD-22" → `relatesTo`.
- **Labels**: inline tags or category words mentioned in prose → `labelIds`.
- **Milestone references**: "part of v1", "for the MVP" → `milestoneId`.
- **Priority signals**: "this is urgent", "P0", "nice to have" → `priority`.
- **Type signals**: "bug: …", "idea: …" → `type`.
- **Linked decisions / notes**: "see decision about X", "per the spec at …" → `linkedDecisionIds` / `linkedNoteIds` (resolve titles via `mcp__hydrant__list_decisions` / `list_notes`).
- **Assignee mentions**: "Henry should do this" → flag for the user; don't auto-assign.
- **Estimate hints**: "this is a small task", "~2 points" → `estimate`.

#### 2d — Sibling overlap

Compare against sibling issues (same milestone, or active in the same space):

- **Duplicate scope** — two issues that would touch the same code for the same reason.
- **Contradictory intent** — issues that want opposite things from the same surface.
- **Missing ordering** — the issue assumes work a sibling hasn't delivered yet (implicit dependency that should be a `blockedBy`).

### Phase 3: Present findings

Group findings by severity:

1. **Must fix** — ambiguity that would cause an implementer to guess wrong or build the wrong thing.
2. **Should fix** — metadata extraction and grounding that materially improves clarity.
3. **Cosmetic** — language tightening that's nice but not blocking.

For each finding:

- Quote the original text.
- Explain why it's ambiguous (ground against the codebase or sibling issue).
- Propose a specific rewrite or structural change.
- For metadata extraction: show what field it moves to and what gets removed from the description.

Present as a single batch. Don't ask one-at-a-time. Let the user approve, reject, or modify the batch.

### Phase 4: Apply changes

After approval:

1. Rewrite the description — remove extracted metadata, tighten language, ground references.
2. `mcp__hydrant__update_issue({ id, description, title?, priority?, type?, labelIds?, milestoneId?, estimate?, linkedDecisionIds?, linkedNoteIds? })` in one call with all approved updates.
3. Apply the merged dependency state via `mcp__hydrant__set_dependencies({ issueId, blockedBy, blocks, relatesTo })` — pass the *full desired state*, since `set_dependencies` replaces.
4. Do **not** create or modify sibling issues. Flag overlaps for the user; let them decide.

### Phase 5: Output

Summarize:

- **Tightened** — what changed in the description / title.
- **Extracted** — what metadata moved from prose to proper fields.
- **Flagged** — sibling overlaps or issues that need their own `/nail`.
- **Remaining ambiguity** — anything that couldn't be resolved without more context (ask the user, or recommend `/refine` if it's a missing-field problem).

If the issue was already precise, say so and recommend `/prep`.

## Edge cases

- **Description is mostly empty.** This is a `/refine` problem, not a `/nail` problem. Tell the user and stop.
- **Issue is in `done` status.** Confirm before tightening — the historical record matters more than today's clarity.
- **Sibling overlap looks real but the other issue is `canceled` or `done`.** Treat as informational only, not a duplicate to act on.

## What this skill never does

- Modify sibling issues. `/nail HYD-123` only writes to HYD-123.
- Auto-assign anyone. Assignee belongs to the user.
- Skip approval. Every rewrite must be opt-in.
- Call non-Hydrant tools to mutate state. Local-only inspection (grep, read) is fine; mutations route through `mcp__hydrant__*`.

## Why this matters

Soft language and prose-buried metadata are how issues get implemented wrong. `/nail` makes the issue mean one thing, so the next agent in the lifecycle (`/prep`, `/go`) doesn't have to guess.
