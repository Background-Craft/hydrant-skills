# Changelog

## Unreleased

- New `hydrant-setup` skill, installed first with `npx skills add Background-Craft/hydrant-skills -s hydrant-setup`. It scans the repository, lists the pack's skills from its source, installs each one with `-s` and explicit `-a` agents, keeps any same-named skill you already have unless you ask for a verified backup and replacement, and writes the repository profile `.agents/hydrant-workflow.md`. Reruns propose profile additions and offer pack skills you don't have yet; they never update installed skills.
- README: setup-first install; a plain `-y` install of the whole source overwrites same-named skills.

## 0.1.0 — 2026-09-16

- First release of the `hydrant` skill: workspace-first reads, whole-thread context, request UUID and version discipline, read-back after every write, honest reporting.
- Retired the April 2026 lifecycle skills (`align`, `cleanup`, `create-issue`, `go`, `nail`, `preflight`, `prep`, `refine`, `setup`, `yeet`). They targeted an earlier Hydrant with a different endpoint, token model and tool surface and no longer worked. If any are still installed, `npx skills remove <name>` removes each one.
- Compatibility: Hydrant MCP server `hydrant` 0.1.0.
