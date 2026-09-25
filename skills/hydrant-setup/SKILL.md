---
name: hydrant-setup
description: Set up the Hydrant workflow pack in this repository. Scans existing skills, instructions, scripts, CI and review bots, installs the pack's skills one at a time without overwriting any skill already here, and writes the repository profile `.agents/hydrant-workflow.md`. Use when the user says /hydrant-setup, asks to set up or install the Hydrant workflow or skills in a repository, or wants to rescan the repository after its commands or CI changed.
license: MIT
---

# Hydrant setup

The pack's lifecycle skills (`capture`, `refine` and the rest) contain no facts about any repository. This skill gathers those facts once, writes them to a profile the user owns, and installs the pack's skills without touching skills the user already has.

Three layers, three owners:

| Layer | Where | Owner |
| --- | --- | --- |
| Shared skills | `.agents/skills/<name>/`, replaced by `npx skills update` | The pack |
| Repository profile | `.agents/hydrant-workflow.md`, never touched by the skills CLI | The user |
| Workspace policy (statuses, who accepts, ship grants) | Hydrant, read over MCP | The workspace |

Setup writes only the profile, the skills the user approved and backups of anything the user agreed to replace. It never edits AGENTS.md, CLAUDE.md or any other file, never creates keys or connects clients, and never calls a Hydrant write tool.

## Phase 1: Scan

Everything in this phase is read-only. Work from the repository root.

```sh
git rev-parse --show-toplevel
git status --short
```

If this is not a Git repository, say so and stop. If the profile `.agents/hydrant-workflow.md` already exists, this is a **rerun**: follow the rerun rules in Phase 3.

### Skills already here

```sh
ls -la .agents/skills .claude/skills 2>/dev/null
cat skills-lock.json 2>/dev/null
```

For every entry record its name, path and kind: a directory, or a symlink with its target (`readlink`). A `.claude/skills/<name>` symlink into `.agents/skills/<name>` is one skill in two places, not two skills. So is every skill when `.claude` or `.claude/skills` is itself a symlink into `.agents` (check with `readlink .claude .claude/skills`). From `skills-lock.json`, note each skill's `source` and `sourceType`. A skill whose lockfile source is `Background-Craft/hydrant-skills` but whose name the pack's `--list` (below) no longer shows is a stale earlier install, such as the April 2026 `align`, `nail` or `yeet`; report it as such. A same-named skill the pack does list (for example an April 2026 `refine`) is reported as a clash in Phase 2 like any other.

### Older Hydrant guidance

Instructions or skills written for an earlier Hydrant give agents conflicting directions once the pack is installed. Read the text files (such as Markdown, YAML, JSON, shell or Python scripts and plain text) of:

- `AGENTS.md` and `CLAUDE.md`
- each skill folder found above, except skills whose `skills-lock.json` source is `Background-Craft/hydrant-skills` (any case, with or without `https://github.com/`) or, after resolving a relative path, the pack source found below

Look for these signals:

| Signal | Counts when |
| --- | --- |
| A Hydrant tool the server does not list | A name written as a Hydrant MCP tool (`mcp__hydrant__<tool>`, `mcp__hydrant-<anything>__<tool>`, or a bare `snake_case` name the text calls a Hydrant tool) whose `<tool>` part, after the last `__`, is not a tool name on any Hydrant server connected to this session. The server prefix does not matter: `mcp__hydrant__get_issue` is fine when you have `get_issue` under another server name. Compare with the tools you actually have, never a list from memory or this file. With no Hydrant tools in the session, skip this signal. |
| The old endpoint | `hydrant.dev/mcp`. Today's endpoint is `hydrant.dev/api/mcp`, which does not match |
| Old keys or IDs | `hyd_pat_` tokens; `hyd-` followed by digits, any case (`hyd-123`, `HYD-42`) |
| Old model terms | The whole words "bundle", "space" or "work item" used as names for Hydrant objects (a Hydrant space, bundle the work items). Not "workspace", "bundler", or ordinary use in a sentence that has nothing to do with Hydrant |

A file with no signal is not reported, even when it mentions Hydrant. Record each hit's path, the signals and, for AGENTS.md and CLAUDE.md, their line numbers. Name the signal, never quote a token. Treat a skill's `.agents/skills` folder and its `.claude/skills` copy as one entry with both paths, as for clashes. This is read-only: never edit, move or back up a flagged file.

### Agents to install for

Without `-a`, the skills CLI links a skill into every agent folder it can find (`.windsurf/skills`, `.kiro/skills`, a top-level `skills/` and more) and deletes any same-named folder there first. So every install in this skill names its agents, and the scan covers exactly their folders:

| Agent | `-a` value | Skills folder | Choose it when |
| --- | --- | --- | --- |
| Claude Code | `claude-code` | `.claude/skills` | `.claude/` or `CLAUDE.md` exists, or setup is running in Claude Code |
| Codex | `codex` | `.agents/skills` | `.agents/` or `AGENTS.md` exists, or setup is running in Codex |

`.agents/skills` is also the CLI's shared copy: an install for more than one agent writes `.agents/skills/<name>` and links the other folders to it. So check `.agents/skills` for clashes, and back it up on replace, even when `codex` is not chosen.

Another agent is added only when the user asks, and only after listing its project skills folder for clashes the same way.

### The pack's skills

Find the source this skill was installed from, so a trial from a local clone lists the same clone:

- The `hydrant-setup` entry in `skills-lock.json`. A `local` source is a path relative to the repository root; resolve it and check that it exists.
- Otherwise `Background-Craft/hydrant-skills`.

```sh
npx skills add <source> --list
```

The installable set is every listed skill except `hydrant-setup`. Do not use a list from memory or from this file; the pack grows.

### Repository facts

| Fact | Where to look |
| --- | --- |
| Instructions | `AGENTS.md`, `CLAUDE.md` (read only, for conventions such as branch names or required checks, and for older Hydrant guidance above) |
| Base branch | `git symbolic-ref --short refs/remotes/origin/HEAD`, or `gh repo view --json defaultBranchRef` |
| Branch protection | `gh api repos/{owner}/{repo}/branches/<base>/protection` and `gh api repos/{owner}/{repo}/rules/branches/<base>`. A protection 404 whose `message` is `Branch not protected` is a readable answer: with an empty (`[]`) or 404 rules result it means "none"; if rules exist, list them; if the rules call fails any other way, "not readable". A 403, any other 404 (for example, the repository is not visible), no `gh` or no sign-in means "not readable". That is a normal result. |
| Package manager | Lockfile: `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`/`bun.lockb`, `package-lock.json`. With lockfiles from more than one manager, Install is an Ask: name each lockfile by file name and propose one manager with its reason (the README's recommendation, or else the lockfile committed most recently, from `git log -1 --format=%ct -- <lockfile>`; say so when neither settles it) |
| Commands | `package.json` `scripts`; otherwise the stack's equivalent: `Makefile` targets, `pyproject.toml` / `tox.ini` / `noxfile.py`, `Cargo.toml`, `go.mod`, `justfile`, `Taskfile.yml` |
| CI | `.github/workflows/*.yml`: workflows triggered by `pull_request`, and their job names |
| Deploy | Deploy workflows or scripts, `wrangler.toml`/`wrangler.jsonc`, `vercel.json`, `netlify.toml`, `fly.toml`, `render.yaml`, `Procfile` |
| Pull requests | `.github/pull_request_template.md`, conventions in the instructions files, merge method from `gh repo view --json squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed` |
| Review bots | `.coderabbit.yaml`/`.coderabbit.yml`, Greptile config (`greptile.json`, `.greptile/`), and bot authors on recent PR comments (command below). Optional. Having none is normal. |

```sh
gh api "repos/{owner}/{repo}/pulls/comments?per_page=100" \
  --jq '[.[].user | select(.type=="Bot") | .login] | unique'
```

Record where each fact came from. A command that is not in a file is not detected: never invent `npm test` because the repository uses Node.

## Phase 2: Plan and confirm

Classify each installable skill:

| Status | Meaning | Default action |
| --- | --- | --- |
| new | Nothing with that name in `.agents/skills` or any chosen agent's skills folder | Install |
| clash | Something with that name exists, from any source, including an earlier install from this pack | Keep the user's skill |

Show one plan before writing anything:

```text
Agents     claude-code, codex
Skill      Status   Existing                                    Action
hydrant    new      -                                           install
refine     clash    .agents/skills/refine (dir, not from pack)  keep yours (default) / replace with backup
           clash    .claude/skills/refine (dir, separate copy)
Profile    .agents/hydrant-workflow.md                          create

May conflict: older Hydrant guidance, left as is, your call
CLAUDE.md      lines 12, 15: tools this Hydrant server does not list (set_dependencies, replace_issue_description)
sauce-hydrant  .agents/skills/sauce-hydrant (dir), .claude/skills/sauce-hydrant (separate copy): hyd-NNN IDs, "work item"
```

When the tool signal was skipped and a scanned file names a Hydrant tool, the block gets one line: `Tool names not checked: no Hydrant tools in this session`, followed by the files and lines that name them. Show the "May conflict" block when Phase 1 flagged something or that line applies, and not otherwise. The user decides what to do with flagged files; setup asks nothing about them.

Then ask, in one message, for: approval of the plan, a keep-or-replace answer for each clash (keep is the default), the facts Phase 1 could not detect (see the profile's "When unknown" column), and Install whenever lockfiles from more than one manager exist. Wait for the answer. Replace only a skill the user named for replacement. If the user cannot answer a fact now, record `unknown`.

## Phase 3: Apply

### Install new skills

One skill per command, never the whole source:

```sh
npx skills add <source> -s <name> -a claude-code -a codex -y
```

Use the `-a` values from the plan. Never drop `-s` (the CLI would overwrite every same-named skill) or `-a` (it would reach agent folders the scan never looked at).

### Check each install on disk

The CLI can exit 0 when it wrote nothing: a sandboxed run prints `Failed to install …` and then `Done!`. Don't trust the exit code or the last line. After each install, check the files:

```sh
test -f .agents/skills/<name>/SKILL.md && echo ok || echo missing   # when codex or more than one agent is chosen
test -f .claude/skills/<name>/SKILL.md && echo ok || echo missing   # when claude-code is chosen
```

A single-agent install copies the skill straight into that agent's folder, so a Claude Code-only install has no `.agents/skills/<name>`. Check each other agent the user added in its own skills folder the same way.

A skill is installed only when every check prints `ok`. If your client denied the command, the output shows `EPERM`, `Operation not permitted` or `Failed to install`, or any check prints `missing`:

- Mark that skill **failed**, with the reason (the denial, the error line, or "exit 0 but no files").
- Stop. Don't run the remaining installs, replaces or backups.
- Print what is left for the user to run from their own terminal, with `<source>` resolved:
  - For each `new` skill that isn't installed yet, the same `npx skills add <source> -s <name> -a … -y` line.
  - For each replace not done yet, the backup and `diff` block below, then the `rm -rf` and that install line.
  - Nothing for a kept clash. An install there would overwrite the user's skill.
- Go on to write the profile, then report.

A sandboxed client usually fails this way. Codex's `workspace-write` sandbox protects `.agents/`. Ask for the escalation your client offers before you give up, and report a refused escalation as a denial.

### Clashes the user kept

Leave both locations untouched. Print this section for the user to paste into their own skill if they want it to work with Hydrant:

```markdown
## Hydrant

When the work is tracked in Hydrant, read the issue, all of its activity and its relationships over the Hydrant MCP server before acting. Use the server's own status keys, IDs and revisions; send one request UUID per write and the same one on an uncertain retry; read back after every write; record evidence on the issue. Repository facts (commands, CI gate, review bots, release steps) are in `.agents/hydrant-workflow.md`.
```

Skip the paste-in for a kept earlier install from this pack; `npx skills update -p <name>` (project only) or a replace brings it current.

### Clashes the user chose to replace

Back up every real directory first, into a folder no agent scans for skills:

```sh
b=.agents/hydrant-setup-backup/<name>
test -e "$b" && echo "backup exists: stop and ask"   # stop here if it prints
mkdir -p "$b"
cp -Rp .agents/skills/<name> "$b/agents"      # if it is a directory
cp -Rp .claude/skills/<name> "$b/claude"      # if it is a directory, not a symlink into .agents
diff -r .agents/skills/<name> "$b/agents"     # must print nothing
diff -r .claude/skills/<name> "$b/claude"
```

Only after every `diff` is clean, remove the originals (`rm -rf` on exactly those paths) and install ours with the same `-s <name> -a … -y` command as above. A symlink needs no backup; note its old target. If a backup already exists, stop and ask rather than overwrite it.

If a removal fails or your client denies it, stop for that skill: put back anything already removed (the numbered restore steps below), keep the backup, do not install over the original (the CLI would overwrite it), and report the path with the commands that finish the replace once the user has removed it (`rm -rf <path>`, then the same `npx skills add <source> -s <name> -a … -y`). A rerun does not replace skills, so do not tell the user to rerun setup for this.

If the install after the removal fails the on-disk check above, restore before you stop, so the user's skill is never left missing:

1. Remove whatever the failed install left at those paths (`rm -rf`).
2. `cp -Rp` each backup back.
3. Recreate a symlink from its noted target (`ln -s`).
4. Run `diff -r` again.

If the restore is denied too, keep the backup and print these restore commands for the user.

### Write the profile

`.agents/hydrant-workflow.md`, exactly these H2 sections in this order, so lifecycle skills can find each fact:

| Section | Contents | When unknown |
| --- | --- | --- |
| Repository | Base branch(es); branch protection: its rules, "none" or "not readable" | Ask |
| Commands | Install, quality/lint, typecheck, test, browser/e2e; each with its source. Install names every other lockfile present. Then an "Other" line naming every remaining script or target, so a later rerun can tell what is new | Ask; "none" is a valid answer. Also ask for Install when lockfiles from more than one manager exist |
| CI gate | Workflows/jobs that must pass before merge | "None detected"; never a question |
| Pull requests | Branch naming, PR title/body conventions, merge method | Ask, or "no convention" |
| Review bots | Bot logins and config files | "None detected (optional)"; never a question |
| Release and deploy | Steps, or "none" | "None detected (optional)"; never a question |
| Done | What "done" means here, beyond Hydrant's own acceptance | Ask |
| Installed skills | Each installable pack skill (not `hydrant-setup`): installed, kept (clash), replaced (backup path), failed (reason) or not attempted | - |

Template:

```markdown
# Hydrant workflow profile

Repository facts for the Hydrant workflow skills. Written by `hydrant-setup`; edit freely. Rerunning `hydrant-setup` proposes additions and never rewrites your lines. Workspace policy (statuses, acceptance, ship grants) lives in Hydrant, not here.

## Repository

- Base branch: `main` (origin/HEAD)
- Branch protection: none (protection 404 "Branch not protected", no rules)

## Commands

- Install: `pnpm install` (pnpm-lock.yaml; package-lock.json also present)
- Lint: `pnpm lint` (package.json)
- Typecheck: unknown
- Test: `pnpm test` (package.json)
- Browser/e2e: none
- Other: `build`, `dev` (package.json)

## CI gate

- `CI / test` on pull_request (.github/workflows/ci.yml)

## Pull requests

- Branches: no convention
- Merge method: squash

## Review bots

- None detected (optional)

## Release and deploy

- None detected (optional)

## Done

- Merged to `main` and accepted in Hydrant.

## Installed skills

- `hydrant`: installed
- `refine`: kept yours (.agents/skills/refine)
```

Record a failed skill as `failed (<reason>)` in "Installed skills", never as installed.

If the write is denied or the file isn't there afterwards (`test -f .agents/hydrant-workflow.md`), print the complete profile text in one fenced block. Ask the user to save it as `.agents/hydrant-workflow.md` themselves, and report the profile as not written.

Rules:

- Only the "Ask" rows become questions. CI gate, review bots and release are detected or "None detected", never `unknown`.
- Repository facts only. No workspace IDs, statuses, people's authority, keys, tokens or secrets.
- No timestamps, run counters or anything else that changes on every run.
- Keep each line short and give its source in parentheses when it was detected.

### Rerun

When the profile exists:

- Rescan (Phase 1) and compare each detected item (every script or target, workflow job, bot, deploy file) with the profile. An item the profile does not mention anywhere is new.
- Never change or remove an existing line. Treat every line as the user's. Two exceptions: new names may be appended to the `Other` commands line, and an "Installed skills" line that says `failed` or `not attempted` becomes `installed` once that skill passes the on-disk check and its `skills-lock.json` entry names the pack's source. A restored skill of the user's keeps its `failed` line.
- Propose, as a diff, only additions for newly detected facts, and questions for lines whose detected source has gone (for example a script that is no longer in `package.json`).
- Do not reinstall, update or replace installed skills. That is `npx skills update -p`, which overwrites local edits. A pack skill that is not here at all is `new` and may be offered through Phase 2.
- Show the "May conflict" block as in Phase 2 on every rerun. It is never a profile change: do not write it into the profile.
- If nothing changed, say so and write nothing.
- Write only after the user confirms the diff.

## Phase 4: Report

End with:

| Item | Result |
| --- | --- |
| Skills | Each pack skill: installed, kept, replaced (backup path), failed (reason) or not attempted (after a failure). "Installed" only when the on-disk check passed. After any failure, the user's commands again |
| Profile | Path, created / updated / unchanged / not written (denied, text printed), and every `unknown` left in it |
| Backups | Paths, or none. They are plain files: the user decides whether to commit, ignore or delete them |
| May conflict | Each flagged path in one line with its signals, left as is, and the "Tool names not checked" line if it applied. Omit the row when the plan had no "May conflict" block |
| Hydrant connection | Whether Hydrant tools are available in this session. If none, point to the Connect section of the pack's README: <https://github.com/Background-Craft/hydrant-skills#connect> |
| Next | Run `capture` or `refine` on an issue |

Offer this line for the user to add to AGENTS.md or CLAUDE.md themselves:

```markdown
Hydrant workflow facts for this repository are in `.agents/hydrant-workflow.md`.
```

## Checklist

- Scanned skills, lockfile, instructions, commands, CI, deploy, PR conventions and review bots before writing.
- Pack skills listed from the source with `--list`, not from memory.
- One plan shown and confirmed before any write.
- Every install used `-s <name>` and the plan's `-a` agents.
- Every "installed" skill was checked on disk; the first failure stopped the installs and printed the user's commands.
- No existing skill overwritten without a named yes and a verified backup.
- Profile has every section; nothing invented; no secrets or timestamps.
- Rerun changed no existing line beyond its two exceptions, and wrote nothing when nothing moved.
- AGENTS.md, CLAUDE.md and non-pack skills checked for older Hydrant guidance; hits listed as may conflict, none edited.
- No AGENTS.md/CLAUDE.md edit, no key, no Hydrant write.
