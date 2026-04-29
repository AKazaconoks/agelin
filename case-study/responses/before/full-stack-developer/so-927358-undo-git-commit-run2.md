<!-- before / full-stack-developer / so-927358-undo-git-commit / run 2 -->

**Duration**: 48.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a full breakdown of how to undo a local (unpushed) commit:

---

## Core Concept: The Three Git Areas

| Area | What it is |
|---|---|
| **Working tree** | Actual files on your disk |
| **Staging area (index)** | Files queued for the next commit (`git add`) |
| **Commit history** | The chain of commits in `.git/` |

---

## Scenario 1: Undo the Commit but KEEP the Changes

### Option A — `git reset --soft` (safest)

```bash
git reset --soft HEAD~1
```

| Area | Effect |
|---|---|
| Working tree | **Untouched** |
| Staging area | **Changes re-staged** (still queued) |
| Commit history | **Last commit removed** |

Best when you want to immediately fix the staged file selection and re-commit:

```bash
git reset --soft HEAD~1
git restore --staged path/to/wrong/file.txt   # unstage the mistake
git commit -m "Correct commit message"
```

---

### Option B — `git reset --mixed` (default)

```bash
git reset HEAD~1         # --mixed is the default when no flag is given
```

| Area | Effect |
|---|---|
| Working tree | **Untouched** |
| Staging area | **Cleared** (everything unstaged) |
| Commit history | **Last commit removed** |

Best when you want a clean slate to selectively re-add only the right files:

```bash
git reset HEAD~1
git add path/to/correct/file.js
git commit -m "Correct commit message"
```

---

## Scenario 2: Undo the Commit AND DISCARD Changes Entirely

### `git reset --hard`

```bash
git reset --hard HEAD~1
```

| Area | Effect |
|---|---|
| Working tree | **Wiped** — reverted to state before that commit |
| Staging area | **Cleared** |
| Commit history | **Last commit removed** |

This is irreversible for uncommitted edits. Use with care.

> If the commit added **new (untracked) files**, add `git clean -fd` after the reset to remove them from disk. Run `git clean -nfd` first for a dry-run preview.

---

## Quick Reference

| Command | Working Tree | Staging Area | Commit History |
|---|---|---|---|
| `git reset --soft HEAD~1` | Unchanged | Re-staged | Removed |
| `git reset --mixed HEAD~1` | Unchanged | Cleared | Removed |
| `git reset --hard HEAD~1` | Reverted | Cleared | Removed |

---

## Key Caveats

1. **`--hard` has no undo for disk changes.** The commit pointer can be recovered via `git reflog`, but edits that were never committed are gone.
2. **Safe only because you haven't pushed.** `git reset` rewrites history — force-pushing after a reset harms collaborators who already pulled.
3. **`HEAD~1` is relative.** Run `git log --oneline` first to confirm your position before resetting.
4. **After `--soft`, everything lands in the staging area together.** Use `git status` carefully if you had other staged changes before the reset.