# Changelog

## 0.1.0 (unreleased)

- First release of the `hydrant` skill: workspace-first reads, whole-thread context, request UUID and version discipline, read-back after every write, honest reporting.
- Retired the April 2026 lifecycle skills (`align`, `cleanup`, `create-issue`, `go`, `nail`, `preflight`, `prep`, `refine`, `setup`, `yeet`). They targeted an earlier Hydrant with a different endpoint, token model and tool surface and no longer worked. If any are still installed, `npx skills remove <name>` removes each one.
- Compatibility: Hydrant MCP server `hydrant` 0.1.0.
