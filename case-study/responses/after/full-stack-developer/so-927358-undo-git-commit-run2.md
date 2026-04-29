<!-- after / full-stack-developer / so-927358-undo-git-commit / run 2 -->

**Duration**: 43.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete guide to undoing a local (unpushed) commit:

---

## The Core Concept

All three `reset` commands move `HEAD` back to the previous commit. The difference is how far the "reset wave" travels:

```
Working Tree  <--  Staging Area (Index)  <--  Commit History
```

The further the wave travels, the more data you lose.

---

## The Three Commands

### `git reset --soft HEAD~1`
**Wave stops at commit history only.**

| Area | Effect |
|---|---|
| Commit history | Last commit removed, HEAD moves back |
| Staging area | **Unchanged** — files remain staged |
| Working tree | **Unchanged** — files on disk untouched |

```bash
git reset --soft HEAD~1
```

Use when: You want to recommit immediately with a different message or file selection. Your work is pre-staged and ready.

---

### `git reset --mixed HEAD~1` (the default)
**Wave rolls back through history and the staging area.**

| Area | Effect |
|---|---|
| Commit history | Last commit removed, HEAD moves back |
| Staging area | **Cleared** — files are unstaged |
| Working tree | **Unchanged** — files on disk untouched |

```bash
git reset HEAD~1   # --mixed is the default
```

Use when: You want full control — nothing is lost, but you're forced to deliberately `git add` only the correct files before recommitting. **Most common choice.**

---

### `git reset --hard HEAD~1`
**Wave rolls all the way through everything.**

| Area | Effect |
|---|---|
| Commit history | Last commit removed, HEAD moves back |
| Staging area | **Cleared** |
| Working tree | **Reverted** to the previous commit's state |

```bash
git reset --hard HEAD~1
```

> **Warning:** Changes are gone from disk. They may be recoverable via `git reflog` briefly, but treat this as permanent.

Use when: You want to discard every change from that commit entirely.

---

## Decision Guide

### Keep the changes, recommit correctly
```bash
git reset HEAD~1          # unstage everything, keep files on disk
git add correct-file.txt  # stage only what should be committed
git commit -m "Corrected commit"
```

### Discard the changes entirely
```bash
git reset --hard HEAD~1
git status  # should show "nothing to commit, working tree clean"
```

---

## Why NOT `git revert` here?

`git revert` creates a *new* commit that inverts changes — it doesn't remove history. That's the right tool when a bad commit has **already been pushed** (rewriting shared history would break other contributors). Since yours hasn't been pushed, `git reset` rewrites local history cleanly, leaving no trace of the mistake.

---

## Quick Reference

| Command | History | Staging Area | Working Tree | Destructive? |
|---|---|---|---|---|
| `reset --soft` | Commit removed | Kept staged | Untouched | No |
| `reset --mixed` | Commit removed | Cleared | Untouched | No |
| `reset --hard` | Commit removed | Cleared | **Reverted** | **Yes** |
| `revert` | Commit *added* | Clean | Untouched | No (use for pushed commits) |