# hydrant-skills

Agent skills that bring the Hydrant ticket lifecycle — **shape → ship** — into any codebase.

Install once, then drive every step of an issue's life — create, refine, prep, build, review, ship — from your AI harness via slash commands. Skills talk to Hydrant exclusively through the [hosted MCP server](https://hydrant.dev/mcp) and make no assumptions about your stack, build system, or branch strategy.

## Install

```sh
npx skills add Background-Craft/hydrant-skills
```

This uses [`vercel-labs/skills`](https://github.com/vercel-labs/skills), which detects your harness and installs to the right directory.

After install, run `/setup` once to configure the Hydrant MCP server and append a *Hydrant lifecycle workflow* section to your `AGENTS.md`. Optionally run `/align` to teach the skills your codebase's conventions — test command, branch strategy, PR flow.

## What's inside

### Lifecycle skills

The day-to-day commands you'll invoke from your harness:

| Skill | What it does |
|---|---|
| `/create-issue` | Interview, draft a well-shaped issue, write it to Hydrant |
| `/refine` | Analyze an existing issue, surface gaps, update it |
| `/nail` | Tighten ambiguity, ground references against your codebase, extract metadata into proper fields |
| `/prep` | Assess implementation readiness, surface clarifying questions before starting |
| `/go` | Guided implementation — fetch context, create a branch, plan, build |
| `/preflight` | Run pre-PR mechanical checks, adversarial review, and quality scoring |
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

You use Hydrant as your issue tracker and want your AI harness to drive issues through `shape → ship` the same way every time, regardless of stack.

This is not the Hydrant team's internal skills catalogue — those live in a private repo and assume Hydrant's own stack. The two are written separately by design; each serves its audience.

## Requirements

- A Hydrant account and a [personal access token](https://hydrant.dev/settings/tokens). `/setup` walks you through getting one.
- An AI harness — Claude Code, Cursor, Codex, OpenCode, Gemini CLI, or any of the 41+ supported by the [upstream installer](https://github.com/vercel-labs/skills). Harnesses without MCP can still call the Hydrant REST API; `/setup` prints manual instructions in that case.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Pull requests, new skill proposals, and bug reports welcome.

## License

[MIT](./LICENSE)

## Links

- [Hydrant](https://hydrant.dev) — the product
- [Hydrant MCP](https://hydrant.dev/mcp) — hosted server endpoint
- [`/method`](https://hydrant.dev/method) — the lifecycle philosophy these skills embody
- [skills.sh](https://skills.sh) — the public skill registry
