# hydrant-skills

A public, MIT-licensed toolkit of agent skills that bring the Hydrant ticket lifecycle — **shape → ship** — into any codebase.

Install once, then drive issue creation, refinement, implementation readiness, guided builds, pre-PR review, and ship/cleanup from your AI harness via slash commands. The skills talk to Hydrant exclusively through the [hosted MCP server](https://hydrant.dev/mcp), so they make zero assumptions about your stack, build system, or branch strategy.

## Install

```sh
npx skills add Background-Craft/hydrant-skills
```

This uses [`vercel-labs/skills`](https://github.com/vercel-labs/skills), which detects your harness (Claude Code, Cursor, Codex, OpenCode, Gemini CLI, and 35+ others) and installs to the right directory.

After install, run `/setup` once to wire up the Hydrant MCP server and append a "Hydrant lifecycle workflow" section to your `AGENTS.md`. Then optionally run `/align` to teach the skills your codebase's conventions (test command, branch strategy, PR flow).

## What's inside

### Lifecycle skills

The day-to-day commands you'll invoke from your harness:

| Skill | What it does |
|---|---|
| `/create-issue` | Interview, draft a well-shaped issue, write it to Hydrant |
| `/refine` | Analyze an existing issue, surface gaps, update it |
| `/nail` | Tighten ambiguity, ground references against your codebase, extract metadata into proper fields |
| `/prep` | Assess implementation readiness, surface clarifying questions before starting |
| `/go` | Guided implementation: fetch context, create a branch, plan, build |
| `/preflight` | Pre-PR mechanical checks, adversarial review, quality scoring |
| `/yeet` | Ship pipeline — detect commit/push/PR/merge state, pick up from there |
| `/cleanup` | Post-merge sync, prune branches |

### Meta-skills

One-time setup commands:

| Skill | What it does |
|---|---|
| `/setup` | Configure the Hydrant MCP server in your harness, drop the lifecycle workflow into your `AGENTS.md` |
| `/align` | Scan your codebase, ask ≤5 questions, write an Alignment block the lifecycle skills consume |

The lifecycle skills tolerate a missing or partial Alignment section — `/align` is a quality-of-life upgrade, not a hard prerequisite.

## Who this is for

Developers who want a structured, MCP-driven ticket lifecycle in their day-to-day codebase, regardless of stack. If you use Hydrant as your issue tracker and want your AI agent to drive issues through `shape → ship` consistently, this toolkit gives you the slash commands to do it.

This is **not** the Hydrant team's internal skills catalogue — those live in Hydrant's private repo and assume Hydrant's own stack. These public skills are stack-agnostic and authored fresh. Drift between the two is intentional; each catalogue serves its audience.

## Requirements

- A Hydrant account and a [personal access token](https://hydrant.dev/settings/tokens) (`/setup` walks you through getting one)
- An AI harness with MCP support (Claude Code, Cursor, Codex, etc. — 41+ supported by the upstream installer). Harnesses without MCP can still call the Hydrant REST API; `/setup` falls back to printing manual instructions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Pull requests, new skill proposals, and bug reports welcome.

## License

[MIT](./LICENSE)

## Links

- [Hydrant](https://hydrant.dev) — the product
- [Hydrant MCP](https://hydrant.dev/mcp) — hosted server endpoint
- [`/method`](https://hydrant.dev/method) — the lifecycle philosophy these skills embody
- [skills.sh](https://skills.sh) — the public skill registry
