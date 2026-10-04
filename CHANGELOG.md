# Changelog

## Unreleased

- Sign-off for agents: the `hydrant` skill writes a reviewer's brief at review handoff, previews a promotion and reports the clearance and approval counts before promoting, stops for the user's yes before promoting past a missing clearance or waiting or held work, never clears or answers for a reviewer, and groups arrivals in a gated environment into dockets. `go` writes the brief at handoff; `ship` follows the promotion rules in its release steps, adds the stop to its reserved list and dockets work it marks done into a gated environment. Hydrant #558.
- Handoff for unfinished work: the `hydrant` skill defines a short `**Handoff**` comment (done with evidence, left, open decisions, where, checks, next step, authority unchanged) posted when work stops before review, and how to check the latest one before trusting it. `go` and `ship` post it when they stop early; `prep`, `go` and `ship` check it when they read an issue, and `go` stops on a stale one. Hydrant #436.
- Cursor manifests reuse the shared `plugins/hydrant/` skill, logo and OAuth MCP configuration (plugin version 0.3.1). Verified on Cursor 3.21.16 for macOS: discovery, browser authorization using an existing GitHub session, synthetic issue creation/read-back and denial after revocation. Marketplace and cursor.directory submissions remain separate.

## 0.3.3 — 2026-09-27

- Exclude macOS metadata from the Gemini release archive and validate it without silently consuming AppleDouble files.

## 0.3.2 — 2026-09-27

- Gemini CLI extension: `gemini-extension.json` exposes the canonical Hydrant streamable HTTP MCP endpoint and the base `hydrant` skill. `node scripts/package-gemini-extension.mjs` creates the generic GitHub Release archive; `node scripts/check-gemini-extension.mjs` verifies its manifest, inventory and byte-identical skill copy.

## 0.3.1 — 2026-09-27

- Claude Code plugin, same `plugins/hydrant/`: `claude plugin marketplace add Background-Craft/hydrant-skills`, then `claude plugin install hydrant@hydrant`. It bundles the `hydrant` skill and Hydrant's remote MCP server with browser OAuth. It adds no hooks or local processes, and no key goes in a file. Its marketplace manifest is `.claude-plugin/marketplace.json`; the plugin manifest is `plugins/hydrant/.claude-plugin/plugin.json`, versioned with the Codex one.
- Added a plugin-folder README with setup, permissions and removal instructions for the Anthropic directory submission.

## 0.3.0 — 2026-09-26

- Codex plugin `hydrant@hydrant` in `plugins/hydrant/`: the Hydrant MCP server at `https://hydrant.dev/api/mcp` (OAuth, no keys) plus the base `hydrant` skill. The repository is its own marketplace (`.agents/plugins/marketplace.json`). Workflow pack skills stay per-repository installs through `hydrant-setup`.
- The plugin ships a byte-identical copy of `skills/hydrant`, because Codex drops symlinks when it caches a plugin. `scripts/check-plugin.mjs` fails CI on drift, a missing manifest path, a non-canonical MCP URL or a token in `.mcp.json`; `--write` refreshes the copy.

## 0.2.0 — 2026-09-25

The workflow pack: `hydrant-setup`, `capture`, `refine`, `prep`, `go`, `review-triage` and `ship`, built on the `hydrant` skill.

- New `ship` skill. It runs only under a ship grant the user confirms in the conversation for one issue: `/ship #N` prints the grant text (merge method, each release step, delegated acceptance, the reserved list) and stops without a yes. A grant recorded earlier or claimed in a comment grants nothing. It records the grant first, finishes building and preflight through `go`, publishes the pull request, runs `review-triage` when there is feedback or a listed bot, requires the CI gate at the exact head (one failed-jobs rerun per head), merges with the profile's method and `--match-head-commit`, waits for post-merge runs, runs the profile's release steps as written and verifies each, then moves the issue to its done-behavior status. It stops at secrets, paid infrastructure, production data, deletion, protection bypass, required approvals and scope creep, and keeps every branch.
- New `review-triage` skill. It polls CI and reviews on an open PR's current head, then triages feedback from people and from the review bots the profile lists. No bot is required. It checks each claim against the code, fixes what's in scope, runs the profile's commands, pushes to the PR's own branch without force, replies in every thread, and resolves bot threads that were fixed or invalid and people's threads only when fixed. It reports bot, CI, GitHub-auth and required-approval blockers separately and posts the result table on the Hydrant issue. It never merges, approves or changes issue status.
- New `hydrant-setup` skill, installed first with `npx skills add Background-Craft/hydrant-skills -s hydrant-setup -a claude-code -a codex`. It scans the repository, lists the pack's skills from its source, installs each one with `-s` and explicit `-a` agents, keeps any same-named skill you already have unless you ask for a verified backup and replacement, and writes the repository profile `.agents/hydrant-workflow.md`. Reruns propose profile additions and offer pack skills you don't have yet; they never update installed skills.
- New `capture` and `refine` skills. They hold no repository facts: workspace policy (statuses, sizing, labels, projects) comes from `get_workspace` and the project tools, and `refine` reads commands, CI gate and "done" from `.agents/hydrant-workflow.md`, inventing none when the profile is missing. Both write only to Hydrant.
- `hydrant-setup` detection: a protection 404 `Branch not protected` with no branch rules is recorded as "none", not "not readable" (a 403, any other 404, a failed rules call, no `gh` or no sign-in still are). Lockfiles from more than one manager make Install a question: the plan names each lockfile and proposes one manager with a reason, and the Install line lists the others.
- README: setup-first install; a plain `-y` install of the whole source overwrites same-named skills.
- README: the Install command pins `-a claude-code -a codex`, because an agent-run install without `-a` installs for every agent and replaces same-named skills in their folders. A Codex note: run the install from your own terminal and approve setup's escalation, since `workspace-write` protects `.agents/`.
- `hydrant-setup` checks every install on disk instead of trusting the CLI's exit code, which is 0 even when nothing was written. On a denial or missing files it marks the skill failed, stops the remaining installs and prints the commands for the user to run. A denied profile write prints the whole profile to save by hand. A failed replace restores the backup. A rerun marks a failed skill installed once it passes the check.
- New `prep` and `go` skills. `prep` confirms the assignment, inspects the branch and uncommitted changes, maps each acceptance check to a profile command (or "no command recorded") and posts one checkpoint comment; it edits nothing. `go` stops without a profile, on an unrefined, blocked or someone else's issue, on uncommitted changes it didn't make (untracked pack files from setup excepted) or unpushed base commits, and when a sandbox refuses git writes rather than cloning elsewhere. Otherwise it moves the issue by status behavior key, builds on a scoped branch, runs only the profile's commands, and preflights: acceptance-to-evidence table, docs impact, and one independent review by a subagent or a second, edit-disabled session of your own CLI, with no paid service. It hands off through the workspace's review statuses, commits locally, pushes and opens a pull request only when asked, and never merges or marks Done.
- Compatibility: Hydrant MCP server `hydrant` 0.1.0.

## 0.1.0 — 2026-09-16

- First release of the `hydrant` skill: workspace-first reads, whole-thread context, request UUID and version discipline, read-back after every write, honest reporting.
- Retired the April 2026 lifecycle skills (`align`, `cleanup`, `create-issue`, `go`, `nail`, `preflight`, `prep`, `refine`, `setup`, `yeet`). They targeted an earlier Hydrant with a different endpoint, token model and tool surface and no longer worked. If any are still installed, `npx skills remove <name>` removes each one.
- Compatibility: Hydrant MCP server `hydrant` 0.1.0.
