<!-- before / full-stack-developer / so-927358-undo-git-commit / run 1 -->

**Duration**: 47.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the complete breakdown:

---

## Undoing a Local Git Commit

Since the commit hasn't been pushed, you have full freedom to rewrite history safely. The key command is `git reset`, with different flags depending on your goal.

---

## Core Concept: The Three Trees

| Tree | What it is |
|---|---|
| **Working Tree** | Actual files on disk |
| **Staging Area (Index)** | What will go into the next commit (`git add` populates this) |
| **Commit History** | The chain of commits shown by `git log` |

---

## Scenario 1: KEEP the Changes (just un-commit them)

### Option A — Un-commit but leave files **staged**

```bash
git reset --soft HEAD~1
```

| Tree | Effect |
|---|---|
| Working Tree | Unchanged |
| Staging Area | Files remain staged (ready to re-commit) |
| Commit History | Commit is removed |

`--soft` only moves the `HEAD` pointer backward. Nothing else is touched.

**Use when:** You want to immediately re-commit with a corrected message or different file selection.

---

### Option B — Un-commit and leave files **unstaged** (most common)

```bash
git reset HEAD~1
# equivalent to:
git reset --mixed HEAD~1
```

| Tree | Effect |
|---|---|
| Working Tree | Unchanged |
| Staging Area | Cleared — files show as "modified" in `git status` |
| Commit History | Commit is removed |

`--mixed` (the default) moves `HEAD` backward and resets the index, but leaves your files on disk alone.

**Use when:** You want to review changes, selectively re-stage only the right files, and make a clean commit.

---

## Scenario 2: DISCARD the Changes entirely

```bash
git reset --hard HEAD~1
```

| Tree | Effect |
|---|---|
| Working Tree | **Reverted** — files are reset to the previous commit's state. Edits are gone. |
| Staging Area | Cleared |
| Commit History | Commit is removed |

`--hard` is the only flag that rewrites your actual files on disk.

> **Warning:** This is destructive. The changes are not recoverable through standard Git commands once discarded.

---

## Side-by-Side Comparison

| Command | Commit Gone? | Staging Area | Files on Disk |
|---|---|---|---|
| `git reset --soft HEAD~1` | Yes | Staged | Unchanged |
| `git reset --mixed HEAD~1` | Yes | Unstaged | Unchanged |
| `git reset --hard HEAD~1` | Yes | Cleared | **Reverted (lost)** |

---

## Quick Decision Guide

```
Did you push the commit?
├── YES → Use git revert instead (safe, creates an undo commit)
└── NO  → Safe to use git reset
         ├── Keep changes?
         │   ├── Staged?   → git reset --soft HEAD~1
         │   └── Unstaged? → git reset HEAD~1
         └── Discard?      → git reset --hard HEAD~1
```

---

## Undoing Multiple Commits

Swap `HEAD~1` for `HEAD~N` (e.g., `HEAD~3` for the last three commits), or use a specific commit hash from `git log --oneline`.

---

## Verify Afterwards

```bash
git log --oneline   # confirm the bad commit is gone
git status          # check staged vs. unstaged state
git diff            # review unstaged changes
git diff --cached   # review staged changes
```