<!-- after / full-stack-developer / so-927358-undo-git-commit / run 1 -->

**Duration**: 36.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete breakdown of how to undo local commits with `git reset`:

---

## The Three Areas Git Manages

| Area | What it is |
|---|---|
| **Commit history** | The chain of commits HEAD points to |
| **Staging area (index)** | What `git add` has collected; what the next commit would contain |
| **Working tree** | The actual files on disk |

---

## The Three `git reset` Flags

| Flag | Commit history | Staging area | Working tree |
|---|---|---|---|
| `--soft` | rewound | **unchanged** (changes appear staged) | unchanged |
| `--mixed` *(default)* | rewound | **cleared** (changes unstaged) | unchanged |
| `--hard` | rewound | cleared | **cleared** (edits destroyed) |

---

## Scenario 1: Keep Your Changes

**Option A — keep changes staged** (ready to re-commit right away):
```bash
git reset --soft HEAD~1
```
After: files unchanged on disk, diff from removed commit is staged. `git status` shows everything green.

**Option B — keep changes but unstaged** (re-add selectively, split commits, etc.):
```bash
git reset HEAD~1          # --mixed is the default
```
After: files unchanged on disk, nothing staged. `git status` shows everything red/unstaged.

---

## Scenario 2: Discard the Changes Entirely

```bash
git reset --hard HEAD~1
```
After: commits gone from history, staging area clean, files on disk restored to the prior state. **This is permanent.**

If you have unrelated in-progress edits mixed in, stash first:
```bash
git stash
git reset --hard HEAD~1
git stash pop
```

---

## Multiple Bad Commits

Just change the target — same flags apply:
```bash
git reset --soft  HEAD~3   # undo last 3, keep staged
git reset --mixed HEAD~3   # undo last 3, keep unstaged
git reset --hard  HEAD~3   # undo last 3, discard all
```

Or land on a specific SHA (use `git log --oneline` to find it):
```bash
git reset --hard abc1234
```

---

## Quick Decision Guide

```
Keep my edits?
├─ Yes, staged    →  git reset --soft  HEAD~1
├─ Yes, unstaged  →  git reset         HEAD~1
└─ No, discard    →  git reset --hard  HEAD~1
```