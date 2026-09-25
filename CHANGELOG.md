# Changelog

## Unreleased

- New `hydrant-setup` skill, installed first with `npx skills add Background-Craft/hydrant-skills -s hydrant-setup`. It scans the repository, lists the pack's skills from its source, installs each one with `-s` and explicit `-a` agents, keeps any same-named skill you already have unless you ask for a verified backup and replacement, and writes the repository profile `.agents/hydrant-workflow.md`. Reruns propose profile additions and offer pack skills you don't have yet; they never update installed skills.
- New `capture` and `refine` skills. They hold no repository facts: workspace policy (statuses, sizing, labels, projects) comes from `get_workspace` and the project tools, and `refine` reads commands, CI gate and "done" from `.agents/hydrant-workflow.md`, inventing none when the profile is missing. Both write only to Hydrant.
- `hydrant-setup` detection: a protection 404 `Branch not protected` with no branch rules is recorded as "none", not "not readable" (a 403, any other 404, a failed rules call, no `gh` or no sign-in still are). Lockfiles from more than one manager make Install a question: the plan names each lockfile and proposes one manager with a reason, and the Install line lists the others.
- README: setup-first install; a plain `-y` install of the whole source overwrites same-named skills.

## 0.1.0 — 2026-09-16

- First release of the `hydrant` skill: workspace-first reads, whole-thread context, request UUID and version discipline, read-back after every write, honest reporting.
- Retired the April 2026 lifecycle skills (`align`, `cleanup`, `create-issue`, `go`, `nail`, `preflight`, `prep`, `refine`, `setup`, `yeet`). They targeted an earlier Hydrant with a different endpoint, token model and tool surface and no longer worked. If any are still installed, `npx skills remove <name>` removes each one.
- Compatibility: Hydrant MCP server `hydrant` 0.1.0.
