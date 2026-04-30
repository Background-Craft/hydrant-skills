---
name: yeet
description: Ship a Hydrant branch — detect where you are in the commit→push→PR→merge→cleanup pipeline and pick up from there. Use when the user asks for `/yeet`, says "ship this", "yeet HYD-123", or wants the current branch fully delivered and `main` cleaned up.
---

# Yeet

Get a branch from wherever it is to fully shipped and tidied up. Detect current state, fill the gaps, and leave `main` clean. `/yeet` is built to be safe to invoke at any point — already-committed, already-pushed, already-PR'd, already-merged — and do the right thing each time.

## Source of truth

- The user's local git repo and the remote (via `git` and `gh` or whatever git host CLI the user has) for branch and PR state.
- Hydrant MCP (`mcp__hydrant__*`) for issue identifier resolution and status updates.
- The user's `AGENTS.md` Alignment block for stack-specific behavior — see below.

## Alignment lookup

Read the `<!-- BEGIN: hydrant alignment -->` block from `AGENTS.md` if it exists. The relevant keys for `/yeet`:

- `lint-cmd` — pre-commit gate. If present and Phase 1 is entered, run before staging.
- `typecheck-cmd` — pre-commit gate. Same as above.
- `pr-flow` — `same-repo` (default) or `fork-and-pr`. Picks how Phase 3 wires the PR.
- `merge-policy` — `review-required` (default) or `self-merge`. Picks whether Phase 4 prompts for merge or just hands off the PR URL.
- `branch-strategy` — informs Phase 5 cleanup (see `/cleanup`).

Missing keys → fall back to safe defaults (`pr-flow: same-repo`, `merge-policy: review-required`, no lint/typecheck gate). Print one nudge if the block is absent: `Tip: run /align once to record this codebase's shipping conventions.` Don't repeat it on subsequent invocations.

## Workflow

### Phase 0: Assess state

Gather everything needed to decide what to do. Run these checks; don't ask the user.

1. Detect whether the session is in a worktree (`git rev-parse --git-common-dir` vs `--git-dir`).
2. Capture the current branch name (`git rev-parse --abbrev-ref HEAD`).
3. Check for uncommitted changes (`git status --porcelain`).
4. Check for unpushed commits (`git log @{u}..HEAD` if upstream exists; otherwise treat as no-upstream).
5. Check for an existing PR (`gh pr view --json state,mergeable,mergeStateStatus,url`).
6. If a PR exists, capture its merge state.
7. Try to extract a Hydrant identifier from the branch name (e.g. `hyd-537-...` → `HYD-537`). If found, fetch with `mcp__hydrant__get_issue({ identifier })`.

Determine the **entry point** — the earliest unfinished step:

| State | Entry Point |
|---|---|
| Uncommitted changes | Phase 1: Commit |
| Committed but not pushed | Phase 2: Push |
| Pushed but no PR | Phase 3: PR |
| PR open, not merged | Phase 4: Merge |
| PR merged, or no PR + nothing local to push | Phase 5: Cleanup |
| Already on `main`/primary branch | Phase 5: Cleanup (sync-and-prune only) |

Run only the phases at and after the entry point. Don't redo work that's already done.

### Phase 1: Commit

Only entered when there are uncommitted changes.

1. If `lint-cmd` and/or `typecheck-cmd` are set in Alignment, run them. Failures are blocking — stop and report. The user fixes, then re-runs.
2. If no lint/typecheck commands are set, skip. Print one line noting the gate was skipped due to missing Alignment.
3. `git status --short` and a quick `git diff` review — sanity check that all staged-or-unstaged changes are intentional.
4. Stage explicitly. Prefer `git add <path>` for the changes you've identified; avoid `git add -A` and `git add .` which hoover up untracked files the user didn't mean to ship.
5. Draft a commit message in the repo's existing style (read `git log -10` for tone). If the branch maps to a Hydrant issue, prefix with the identifier (e.g. `HYD-537 Author public lifecycle skills`).
6. Commit. Never amend. Never skip hooks. Never bypass signing.

### Phase 2: Push

Only entered when there are local commits not on the remote.

1. `git push -u origin HEAD` if no upstream is set; otherwise `git push`.
2. If push is rejected because the remote has diverged, **stop and report**. Do not force-push. The user resolves manually.
3. Honor `pr-flow: fork-and-pr`: in that mode the user's `origin` is their fork. Pushing to `origin` is correct; the PR will be cross-repo. Don't try to push directly to the upstream.

### Phase 3: Create PR

Only entered when the branch is pushed but has no PR.

1. Determine the base branch — usually `main`. If the repo's default branch is named differently, detect via `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` or `git symbolic-ref refs/remotes/origin/HEAD`.
2. Gather the full diff against base (`git diff origin/<base>...HEAD`) and all commit messages (`git log origin/<base>..HEAD --format=%B`).
3. If the branch maps to a Hydrant issue, fetch its title and acceptance criteria via `mcp__hydrant__get_issue` for richer PR copy.
4. Draft PR title and body:
   - **Title**: short, under 70 characters, prefixed with the issue identifier if applicable.
   - **Body**: a few summary bullets, an explicit test plan, a link to the Hydrant issue (`https://hydrant.dev/issues/HYD-NNN`) if applicable.
5. Create the PR via `gh pr create` (or the equivalent for the user's git host).
   - For `pr-flow: fork-and-pr`, use `gh pr create --repo <upstream-owner>/<upstream-repo>` or rely on `gh`'s auto-detection of the upstream remote.
6. If `gh` (or the configured CLI) isn't available, **stop and print clear next-step instructions**: the branch is pushed; the user can open a PR via the host's web UI. Don't fail silently.
7. If the Hydrant issue exists, `mcp__hydrant__update_issue({ id, status: "inReview" })`.
8. Report the PR URL.

### Phase 4: Merge

Only entered when a PR exists and is open.

1. Check CI via `gh pr checks`.
2. If checks are failing, **stop and report**. Don't merge with red CI.
3. If `merge-policy: review-required`, the PR may require approval before merge. Don't try to bypass; report the PR URL and stop.
4. If `merge-policy: self-merge`, ask the user once whether to merge now. On approval: `gh pr merge --squash` (or whatever merge style the repo's CI configuration enforces — check `gh pr view --json mergeStateStatus` first).
5. Default merge style is **squash** unless the user's Alignment or repo settings say otherwise.

### Phase 5: Cleanup

Always runs after shipping (or entered directly if already merged).

#### 5a — Update issue status

If the branch maps to a Hydrant issue and the PR is merged (or the local branch was already squash-merged): `mcp__hydrant__update_issue({ id, status: "done" })`.

#### 5b — Checkout primary branch and sync

If **not** in a worktree:

1. Switch to the primary branch (`main`, or whatever `origin/HEAD` points at).
2. `git fetch --prune origin`.
3. `git rebase origin/main` (or the primary branch name).

If **in** a worktree, skip primary-checkout sync. The user's primary checkout is a separate concern; tell them to run `/cleanup` there.

#### 5c — Delete stale branches

Delete local branches whose upstream is gone — the just-finished branch plus any others that fit. See `/cleanup` for the full rules; `/yeet` mirrors them.

### Phase 6: Report

If **in** a worktree:

- The branch was yeeted.
- The worktree can be exited or removed when the user is ready.
- Run `/cleanup` on the primary checkout to finalize sync.

If **not** in a worktree:

- Resulting `main` (or primary) SHA.
- Branch cleanup count.
- Issue status update if applied.
- PR URL if one was created.

## Edge cases

- **No git remote configured.** Stop after Phase 1 (commit). Print: `No remote configured — commit landed locally; configure a remote and re-run /yeet to push and open a PR.` Do not attempt Phases 2–5.
- **No `gh` (or equivalent host CLI) available.** Phases 1–2 work fine with plain `git`. Phase 3 stops with clear instructions; Phase 4 stops with a "merge in your host's UI" message.
- **PR already exists for the branch but `gh pr view` doesn't see it.** Re-fetch via `gh pr list --head <branch>`. If still nothing, ask the user before creating a duplicate.
- **Merge conflicts on the PR.** Stop. The user resolves manually; don't auto-rebase or force-push.
- **CI is configured but no checks have run yet.** Wait briefly (one short retry) then report; do not block forever.
- **Multiple commits, divergent style.** Don't try to rewrite history. Squash will normalize on merge.
- **Issue identifier in branch but issue is in `canceled` or `done` status.** Skip the status updates in 5a; report the unusual state so the user can investigate.

## What this skill never does

- Force-push, amend, or rewrite published history.
- Skip git hooks or signature requirements.
- Merge with failing CI.
- Auto-resolve merge conflicts.
- Mutate Hydrant issue status without a corresponding git event (commit, PR, merge).
- Push to a remote other than `origin` without explicit user direction.

## Why this matters

Shipping is a state machine, not a fixed sequence. The user might land in any state: uncommitted, committed, pushed, PR'd, merged. `/yeet` reads the state and finishes from there, so the user gets one command for "make it done" instead of remembering which sub-step is next.
