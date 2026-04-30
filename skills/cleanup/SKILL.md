---
name: cleanup
description: Sync `main` and prune stale local branches after merging Hydrant work. Use when the user asks for `/cleanup`, says "clean up after merge", "tidy my branches", or wants `main` resynced and merged-but-still-local branches removed. The post-`yeet` housekeeping pass.
---

# Cleanup

Run a quick post-merge maintenance flow on the local repo: pull `main` up to date, drop branches whose remotes are gone, and report what was tidied. This is the pair to `/yeet` — `/yeet` ships the work, `/cleanup` keeps the local checkout sane afterwards.

## Source of truth

- The user's local git repo is the source of truth for branch state.
- The user's git remote is the source of truth for "is this branch still needed?".
- Hydrant MCP isn't called here — issue-status updates belong to `/yeet`. `/cleanup` is purely local housekeeping.

## Preconditions

Abort with a short message — do not silently fix any of these — unless **all** of the following are true:

- The current branch is `main` (or the local primary branch the user named in their Alignment block, see below).
- The working tree is clean (no uncommitted or unstaged changes).
- A git remote called `origin` exists.

If the user is on a feature branch with uncommitted work, tell them to `git stash` or commit first, then re-run `/cleanup` from `main`. Do not switch branches for them.

## Alignment lookup

Read the `<!-- BEGIN: hydrant alignment -->` block from `AGENTS.md` (at the repo root) if it exists. The relevant key for `/cleanup` is:

- `branch-strategy` — `trunk-based` | `feature-branches` | `gitflow`. Affects what counts as a "stale" branch:
  - `trunk-based` and `feature-branches` (default): any local branch whose upstream is gone is a delete candidate.
  - `gitflow`: leave long-lived branches like `develop`, `release/*`, and `hotfix/*` alone even if their upstream looks gone — they probably aren't.

If `AGENTS.md` is missing or the Alignment block is absent, fall back to `feature-branches` and print a one-line nudge: `Tip: run /align once to record this codebase's branching conventions.`

## Workflow

1. **Fetch with prune.** `git fetch --prune origin`. This updates remote refs and removes references to remote branches that have been deleted server-side.

2. **Rebase `main` onto `origin/main`.** `git rebase origin/main`. If the rebase has conflicts, stop and report — do not try to resolve them. The user has unpushed commits on `main`, which is unusual; let them sort it out.

3. **Identify stale local branches.** A local branch is stale when:
   - Its upstream tracking ref is gone (`gone` shown by `git branch -vv`), and
   - Its tip is reachable from `origin/main` (i.e. it was merged or its commits already landed via squash/rebase).

   Squash-merge is the common case in Hydrant flows — the local branch tip won't be an ancestor of `main`, but the *patch* has landed. Treat `[gone]` upstream as the primary signal; the merge check is a sanity filter.

4. **Apply `branch-strategy` exceptions.** If the Alignment value is `gitflow`, exclude `develop`, `master` (when distinct from `main`), and any branch matching `release/*` or `hotfix/*` from the delete list, even if their upstream looks gone.

5. **Delete stale branches.** Use `git branch -D <name>` only after the `[gone]` check above passes. Never delete branches that have unmerged work and still have an upstream.

6. **Report.** Print:
   - Synced `main` SHA (short form, e.g. `a1b2c3d`).
   - Number of branches deleted, with names.
   - Anything skipped due to `branch-strategy: gitflow` exceptions.
   - Anything skipped because it had unmerged work — surface those by name so the user knows they exist.

## What this skill never does

- Switch branches without being asked. If the user isn't on `main`, abort with instructions; don't move them.
- Force-delete branches with unmerged work. `[gone]` upstream is a permission to clean up landed branches, not to nuke unfinished ones.
- Push, force-push, or otherwise mutate the remote.
- Call any Hydrant MCP tool. Issue-status updates happen in `/yeet`.
- Run any test, lint, or build command. This is housekeeping, not verification.

## Edge cases

- **No remote configured.** Abort with a one-line note. There's nothing meaningful to "sync" without a remote.
- **`main` is named differently** (e.g. `master`, `trunk`, `develop`). Detect via `git symbolic-ref refs/remotes/origin/HEAD` or fall back to whatever branch `origin/HEAD` points at. If detection fails, ask the user once which branch is canonical.
- **User is in a worktree.** Cleanup is meaningful per checkout — sync that worktree's `main` (or alternative primary), and prune local branches as usual. Do not try to clean up other worktrees you don't control.
- **Many stale branches at once** (10+). Print the list and ask for confirmation before bulk-deleting. Don't surprise the user.
- **Branch is checked out in another worktree.** `git branch -D` will refuse. Skip it and report it — the user will resolve manually.

## Why this matters

Stale local branches accumulate fast in a fast-moving repo. The next time the user runs `git branch` they'll squint at 40 dead refs and miss the live one. `/cleanup` keeps the local view aligned with what's actually in flight.
