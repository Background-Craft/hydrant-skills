---
name: create-issue
description: Turn a rough request into an unambiguous, implementation-ready Hydrant issue grounded in the codebase and live project state, with all metadata routed to proper fields. Use when the user asks for `/create-issue`, says "make a ticket for X", or wants a request shaped into an issue ready for `/prep` and `/go` without an intermediate `/refine` or `/nail` pass.
---

# Create Issue

Turn a natural-language request into an **unambiguous**, implementation-ready Hydrant issue, grounded in the user's codebase and live Hydrant state, with every applicable piece of metadata set in its proper field.

This is **not** a quick-capture workflow. If the user explicitly wants quick capture, stop and tell them `/create-issue` produces implementation-ready issues — they should use a separate inbox or note flow. Do not water this workflow down into a vague placeholder ticket.

## Core principle: decide hard, ask rarely

The output should be ready for `/prep` and `/go` without needing `/refine` or `/nail` first.

Default behavior:

- Make the best product and implementation decision from the request, the codebase, sibling issues, and Hydrant metadata.
- Write the issue as if a different agent will implement it with no chat history.
- Remove all open questions from the final issue.
- Ask follow-up questions only when the answer would materially change scope and cannot be responsibly inferred.

When uncertain, prefer the narrowest implementation that solves the stated problem and explicitly put adjacent work in **Out of scope**. Don't ask the user to choose between routine implementation details, file locations, component choices, copy tweaks, or metadata you can infer.

## Core principle: metadata belongs in fields, not prose

Hydrant has dedicated fields for dependencies, priority, milestone, cycle, labels, estimate, and assignee. The description is for *problem, goal, scope, acceptance criteria, implementation notes, and edge cases* — nothing else. Never write "depends on HYD-X", "blocks HYD-Y", "this is urgent", "part of v1", "~2 points", or "assign to Henry" in the description. Route those to their fields.

Hydrant uses **flat issues grouped by milestones** — there are no sub-issues. Epic-sized requests become a milestone plus N flat issues with `blockedBy` / `blocks` ordering, not a parent with children.

## Source of truth

- Hydrant MCP (`mcp__hydrant__*`) for spaces, labels, milestones, cycles, members, existing issues, dependencies, and issue creation.
- The user's codebase for grounding scope, likely file targets, patterns, and implementation notes.
- If Hydrant MCP is unavailable, say so explicitly and stop unless the user explicitly authorizes a local-only draft (which won't create anything).

## Workflow

### Phase 1: Understand the request

Parse the request into:

- What should change.
- Where it likely lives in the codebase.
- Why it matters, if stated.

If the request is too vague for an implementation-ready issue, first try to infer the narrowest useful issue from the words the user gave. Ask a follow-up only if there is no concrete observable change to capture.

### Phase 2: Resolve the space

Pick the `spaceId`:

1. `mcp__hydrant__list_spaces`.
2. If only one space exists, use it automatically.
3. If multiple exist, ask the user — and include a recommendation based on the request's topic.

### Phase 2b: Load space context

For the resolved space, fetch in parallel:

1. `mcp__hydrant__list_labels({ spaceId })` — for label recommendations.
2. `mcp__hydrant__list_milestones({ spaceId })` — for milestone fit.
3. `mcp__hydrant__list_cycles({ spaceId })` — to find the active cycle, if any.
4. `mcp__hydrant__list_members({ spaceId })` — for assignee resolution.

Keep all four sets in working memory for later phases. If labels, milestones, or cycles are empty, skip the corresponding metadata step rather than forcing it. If members are empty, omit `assignee`; otherwise every created issue must have a resolved assignee.

### Phase 3: Codebase analysis

Ground the issue in reality before drafting it. Use whatever filesystem and search tools your harness exposes — the goal is grounding, not exhaustive crawling.

Always:

1. Search for files, functions, or components related to the request.
2. Read project conventions (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, anything in obvious doc directories).
3. Check existing Hydrant issues via `mcp__hydrant__list_issues` for duplicates or nearby work — filter by space, milestone, or keyword in `searchText`; don't sweep the whole space.

When the request implies UI work, also:

- Inspect the relevant pages or components in the user's frontend tree.
- Identify existing patterns in the same area — layout, spacing, component composition, loading/empty/error-state handling.
- Note which UI primitives or component libraries the project already uses.

When the request implies backend or schema work, also:

- Inspect the relevant data model and adjacent functions in the user's backend tree.
- Note any project-specific conventions (read whatever guidelines file the project keeps, if one exists).
- Flag schema-compatibility implications (new fields, validators, migrations) so they show up as concrete acceptance criteria.

When a library or framework API matters:

- Consult current documentation or project conventions before drafting.
- Note version-sensitive constraints in the implementation notes.

### Phase 3b: Dependency detection (metadata, never prose)

Check active issues for likely relationships:

1. `mcp__hydrant__list_issues({ spaceId, activeOnly: true })`.
2. Compare titles and scope against the proposed issue.
3. Identify:
   - **`blockedBy`** — that issue must finish first.
   - **`blocks`** — the new issue must finish before that one.
   - **`relatesTo`** — overlap without strict ordering.

Only propose dependencies with genuinely clear signal. Plan to apply them via a single `mcp__hydrant__set_dependencies` call after the issue is created — never write them in the description.

### Phase 3c: Resolve assignee

Use the members list from Phase 2b:

- 1 member → auto-assign via the `assignee` field.
- 2+ members → choose the most suitable assignee; do not leave the issue unassigned when members exist. Prefer, in order:
  1. Explicit user signal in the request ("I'll take this", "assign to X", "for Henry").
  2. Clear ownership from nearby issues, recent authorship, or repeated work in the same area.
  3. The strongest general-maintainer signal from active/recent issues in the space.
  4. If no distinguishing signal exists, the first stable member returned by `list_members`.

If the assignment is a fallback rather than a strong match, surface that in the preview so the user can override — but still send the selected `assignee` field on creation.

Never write "assign to X" in the description.

### Phase 4: Classify, prioritize, estimate, cycle

Classify the issue as one of:

- `bug`
- `task`
- `idea`
- `decisionFollowup`

Set priority based on urgency and value: `urgent` | `high` | `medium` | `low` | `none`.

Cycle: if there's an active cycle and priority is `high` or `urgent`, recommend `cycleId`. Otherwise leave blank — inbox/backlog work doesn't belong in a cycle.

Estimate: if the scope is unambiguous (single file, established pattern, copy-only), propose a small estimate inferred from recently-estimated issues in the space. Look at the space's `estimationScale` (`tshirt`, `fibonacci`, etc.) to pick the right unit. If uncertain, leave blank — no estimate beats a misleading one.

Milestone: recommend `milestoneId` only when a fetched milestone clearly fits. Leaving it blank is a valid recommendation.

### Phase 5: Clarify only blocking ambiguity

Ask only questions whose answers would materially change the final issue and cannot be inferred from the codebase, sibling issues, or product conventions.

Rules:

- Strongly prefer deciding yourself over asking.
- Keep it minimal (max 3 questions).
- Include a recommendation with each question.
- Ask decision-shaped questions, not open-ended brainstorms.
- Never ask about routine implementation details; choose the established local pattern.
- If you ask, block issue creation until the answer is known rather than creating an ambiguous ticket.

### Phase 6: Draft the issue

Use **only** these sections in the description — no metadata sections (no Dependencies, Priority, Labels, Milestone, Cycle, Estimate, or Assignee headings):

- Problem / motivation.
- Goal.
- Scope (in scope / out of scope).
- Acceptance criteria.
- Implementation notes.
- Edge cases.

Keep it implementation-ready, not verbose for its own sake. For UI work, include the actual patterns the implementer should follow from the user's codebase.

The issue must leave no open implementation questions. Every acceptance criterion must be testable from code or UI behavior. Every scope boundary must say what is included and what is deliberately excluded.

**Language quality bar** (so the result wouldn't need `/nail`):

- No weasel verbs ("improve", "handle", "update", "fix", "clean up", "support") without specifying the observable change.
- No unmeasurable qualifiers ("fast", "better", "cleaner", "more robust") without a threshold or comparison.
- No hedge words ("maybe", "possibly", "could", "might want to", "consider") — decide or cut.
- No open-question placeholders ("TBD", "needs decision", "ask product", "figure out") — decide before creation, or ask the user now.
- No bundled acceptance criteria — split "should handle X and also Y" into separate bullets.
- Ground every reference in real file paths, not nicknames.
- No "works correctly" criterion without defining the observable behavior.

Before previewing, run this gate:

- **Unambiguous**: an implementer can start without chat history or follow-up questions.
- **Scope-bound**: in-scope and out-of-scope are both explicit.
- **Code-grounded**: implementation notes include real paths, APIs, or patterns from the user's repo.
- **Testable**: acceptance criteria can be verified by code review, tests, or a UI smoke check.
- **Metadata-routed**: priority, labels, milestone, cycle, estimate, assignee, and dependencies live in fields, not prose.

If any gate fails, fix the draft before previewing. If you can't fix it without user input, ask the smallest decision-shaped question needed.

### Phase 7: Present and create

Show a preview surfacing every field so overrides are easy:

- Title.
- Type, priority, status (`inbox`).
- Space.
- Assignee (or "Unassigned" only when the members list is empty).
- Recommended labels (or "None").
- Recommended milestone (or "None").
- Recommended cycle (or "None").
- Recommended estimate (or "None").
- Proposed dependencies as metadata (or "None detected").
- Issue description.

Then confirm creation.

If approved, call `mcp__hydrant__create_issue` **once** with all applicable fields in a single call — it natively supports `assignee`, `labelIds`, `milestoneId`, `cycleId`, and `estimate`, so don't follow up with `update_issue`:

- `spaceId`, `title`, `type`, `priority`, `status: "inbox"`, `description`.
- `assignee` (omit if none).
- `labelIds` (omit if empty).
- `milestoneId` (omit if none).
- `cycleId` (omit if none).
- `estimate` (omit if none).

After the issue exists, apply the full approved dependency state via one call: `mcp__hydrant__set_dependencies({ issueId, blockedBy, blocks, relatesTo })`.

### Phase 8: Output

Report:

- Identifier and title.
- Type, priority, assignee.
- Labels.
- Milestone.
- Cycle.
- Estimate.
- Branch name (returned by `create_issue`).
- Applied dependency state.

## Edge cases

- **Near-duplicate**: if an existing issue covers the same work, surface it before creating and ask whether to continue or refine the existing one.
- **Epic-sized scope → milestone, not sub-issues**: if the scope would touch many independent surfaces or split into 3+ parallel tracks, offer to create a milestone (`mcp__hydrant__create_milestone`) plus N flat issues linked via `blocks`/`relatesTo` for ordering. Present the proposed milestone name and issue breakdown; confirm before creating anything.
- **Bug with reproduction**: identify the relevant code path and include file references and a likely root cause in implementation notes.
- **Request is vague but the user resists scoping it down**: present the narrowest defensible interpretation in the preview and explicitly call out what's being deliberately excluded. The user can either confirm or push back.

## What this skill never does

- Create more than one issue per invocation without explicit user opt-in to a milestone breakdown.
- Write metadata (dependencies, priority, labels, milestone, estimate, assignee) into the description prose. Use the fields.
- Ship a draft that fails the language quality bar. Fix it or ask one targeted question.
- Use `update_issue` to backfill fields that `create_issue` accepts. Set them at creation.

## Why this matters

Issues are the unit of agent collaboration. A vague issue burns the next agent's context on re-asking the same questions; a precise issue lets `/prep` and `/go` proceed without help. `/create-issue` exists so the precision happens up front, once.
