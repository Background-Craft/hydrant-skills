# Contributing

Pull requests, new skill proposals, and bug reports are all welcome.

## Scope

Skills in this repo are **stack-agnostic** and drive Hydrant exclusively through the [hosted MCP server](https://hydrant.dev/mcp). If a skill assumes a specific framework, build system, or directory layout, it doesn't belong here.

The Hydrant team's internal skills are a separate, private catalogue — they assume Hydrant's own stack and are not the source of truth for anything in this repo. The two evolve independently. If you've seen a skill on the private side that you think should live here too, open an issue describing the use case.

## Layout

Each skill lives in its own subdirectory under `skills/` with a `SKILL.md` file:

```
skills/
  create-issue/
    SKILL.md
  prep/
    SKILL.md
  ...
```

`SKILL.md` is a markdown file with YAML frontmatter:

```markdown
---
name: my-skill
description: One-sentence description used by harnesses to decide when to invoke this skill. Be specific — vague descriptions get ignored.
---

# My Skill

Body content tells the agent what to do, in what order, with what tools.
```

Required frontmatter fields:

- `name` — lowercase, hyphens only, must match the directory name
- `description` — one or two sentences, specific enough that an agent can decide whether the skill applies

CI runs [`scripts/validate-frontmatter.mjs`](./scripts/validate-frontmatter.mjs) on every push and pull request. It walks every `**/SKILL.md` file and fails if any of the rules above are violated. Run it locally before pushing:

```sh
node scripts/validate-frontmatter.mjs
```

## Proposing a new skill

1. Open an issue first describing the use case, the trigger phrases, and which Hydrant MCP tools it would call. This keeps the catalogue coherent and avoids wasted PRs.
2. Once the issue is accepted, open a PR adding `skills/<name>/SKILL.md` plus any updates to the README's catalogue table.
3. The skill must be MCP-pure — every Hydrant interaction goes through `mcp__hydrant__*` tool calls, never through file paths, hardcoded URLs, or shelled-out CLI commands.
4. The skill must tolerate a missing or partial Alignment section in the user's `AGENTS.md`. Provide safe defaults; never crash on an unaligned codebase.

## Pull request checklist

Before opening a PR:

- [ ] `node scripts/validate-frontmatter.mjs` passes
- [ ] Every Hydrant interaction is via `mcp__hydrant__*` — no `curl`, no `gh api`, no hardcoded URLs
- [ ] No stack-specific assumptions (e.g. `package.json`, `bun run`, `npm test`) without an Alignment lookup or a clearly-flagged fallback
- [ ] The skill's `description` is specific enough that an agent can route to it — vague descriptions ("does some Hydrant thing") will be sent back

## Bug reports

Open an issue with:

- The harness you're using (Claude Code, Cursor, Codex, etc.)
- The skill that misbehaved
- What you typed, what happened, what you expected
- A redacted excerpt of the harness's tool-call log if available

## Code of conduct

Be kind, be specific, assume good intent. The [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) is the working CoC for this repo until a project-specific one is in place.

## License

By contributing, you agree your work is licensed under the [MIT License](./LICENSE), the same as the rest of this project.
