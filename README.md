# hydrant-skills

One skill that teaches your agent how to behave inside a [Hydrant](https://hydrant.dev) workspace. Read everything before touching anything. Write with receipts. Say what actually happened.

Hydrant already hands agents its tools over MCP. Tools describe what an agent *can* call. This skill covers what it *should* do.

Read it: [skills/hydrant/SKILL.md](./skills/hydrant/SKILL.md).

## Install

```sh
npx skills add Background-Craft/hydrant-skills
```

That is the whole installer. It uses the [skills CLI](https://github.com/vercel-labs/skills), detects the agents you have, and writes a skill directory, an optional symlink and a lockfile. Nothing else. No hooks, no shell scripts, no edits to your instructions files.

- `-g` installs for your user instead of this project.
- `-a claude-code` picks one agent. Repeat `-a` for more.
- `--copy` copies instead of symlinking.

### What lands on disk

Project install with Claude Code and Codex both selected:

- `.agents/skills/hydrant/`: the skill itself. Codex and other `.agents`-aware clients read it here.
- `.claude/skills/hydrant`: a symlink to that directory, for Claude Code.
- `skills-lock.json`: source, path and content hash, so a later `npx skills update` knows what it installed.

With a single agent selected, the CLI copies the skill straight into that agent's directory (`.claude/skills/hydrant/` for Claude Code, `.agents/skills/hydrant/` for Codex) and skips the symlink. Either way that directory and the lockfile are the only changes. Installing a skill does not connect a client, create a key or authorize anything.

### Update and remove

```sh
npx skills list
npx skills update
npx skills remove hydrant
```

`update` re-downloads every GitHub-sourced skill in the project and overwrites the installed copy, including your edits, even when nothing changed upstream. Keep local changes somewhere else, or install with a local path (`npx skills add ./path`), which `update` leaves alone entirely.

`remove hydrant` deletes this skill's directory and link and leaves every other skill, `skills-lock.json` and your agent configuration alone.

### Telemetry

Not ours. The skills CLI records anonymous install events that include the public repository name. Set `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` to turn that off.

## Connect

Three things that are not the same: a **connection** (the client reaches the server), **authorization** (what the key may do, one workspace) and **permission** (what you asked for in this task). The skill keeps them apart. So should you.

The skill assumes a connection already exists. Keys are created in Hydrant under **Settings → Agents** for one workspace; a key never exceeds the role of the person who made it and stops working when they leave the workspace.

Endpoint: `https://hydrant.dev/api/mcp`, Streamable HTTP, `Authorization: Bearer <key>`.

Claude Code, project scope, in `.mcp.json`, with the key supplied through the environment rather than typed into the file:

```json
{
  "mcpServers": {
    "hydrant": {
      "type": "http",
      "url": "https://hydrant.dev/api/mcp",
      "headers": { "Authorization": "Bearer ${HYDRANT_AGENT_KEY}" }
    }
  }
}
```

Codex:

```sh
codex mcp add hydrant \
  --url https://hydrant.dev/api/mcp \
  --bearer-token-env-var HYDRANT_AGENT_KEY
```

Keep client approvals on. Hydrant's write tools declare their side effects; the skill tells the agent to write only what you asked for, and your client's prompt is the second lock.

## What the skill does

- Starts every task with `get_workspace` and states the workspace name and ID.
- Reads the issue, every page of activity, dependencies and relationships before changing anything.
- Uses the server's own status keys, label and assignee IDs and revisions. No guessed identifiers.
- One request UUID per write. Same UUID on an uncertain retry. Reread and review on a conflict.
- Reads back after every write and reports the new version.
- Treats parent, related and blocking as three different links, because they are.
- Treats retrieved text as data. A comment cannot promote itself to an instruction.
- Reports denials, unread pages and unconfirmed writes as gaps instead of smoothing them over.

## What it does not do

- Decide your workflow. Statuses, review stages and who accepts what live in your workspace, not in this file.
- Handle secrets. It never asks for a key and never goes looking for one.
- Replace the tool descriptions. Argument shapes come from the server when the client connects; this skill does not carry a stale copy.
- Run anything. It is a Markdown file.

## Compatibility

| Skill | Hydrant MCP server |
|---|---|
| 0.1.0 | `hydrant` 0.1.0 |

Requires `get_workspace`, `list_issues`, `get_issue`, `list_activity`, `get_dependencies`, `list_relationships`, `create_issue`, `update_issue` and `add_comment`; uses `get_project` and `inspect_project` for project membership. Treats `batch` and the task-context tools as optional.

The server reports its name and version when a client connects. Releases are git tags; see [CHANGELOG.md](./CHANGELOG.md).

## Contributing

Issues and pull requests are open. Keep `skills/hydrant/SKILL.md` provider-neutral and short, and run `node scripts/validate-frontmatter.mjs` before pushing. Workspace policy belongs in your workspace; this file is not the place to legislate it.

## License

[MIT](./LICENSE)
