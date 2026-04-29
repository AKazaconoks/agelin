<!-- after / bash-expert / so-927358-undo-git-commit / run 3 -->

**Duration**: 37.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the full breakdown:

---

## Undoing a Local Git Commit

### The core command: `git reset`

`git reset <mode> HEAD~1` moves `HEAD` (the current branch pointer) back by one commit. The `--mode` flag controls what happens to the staging area and working tree.

---

### Scenario A: Keep the changes (just undo the commit)

**Option 1 — Unstage everything (`--mixed`, the default)**
```bash
git reset HEAD~1
# same as:
git reset --mixed HEAD~1
```
| Area | Effect |
|---|---|
| Working tree | Unchanged — your edits are still on disk |
| Staging area | Cleared — files are back to "unstaged" |
| Commit history | Commit is gone |

Use this when you want to re-examine and selectively re-add files before committing again.

**Option 2 — Keep files staged (`--soft`)**
```bash
git reset --soft HEAD~1
```
| Area | Effect |
|---|---|
| Working tree | Unchanged |
| Staging area | Unchanged — everything stays staged |
| Commit history | Commit is gone |

Use this when you just want to fix the commit message or add a missing file before re-committing.

---

### Scenario B: Discard the changes entirely

```bash
git reset --hard HEAD~1
```
| Area | Effect |
|---|---|
| Working tree | **Reverted** — files go back to the state before the commit |
| Staging area | Cleared |
| Commit history | Commit is gone |

> **Warning:** `--hard` is destructive. Those changes are gone (unless you have them stashed or in another branch). Run `git log --oneline -5` first to confirm which commit you're removing.

---

### Undoing multiple commits

Replace `HEAD~1` with `HEAD~N` (e.g. `HEAD~3` to undo the last 3 commits), or use a specific commit hash:
```bash
git reset --mixed <commit-hash>
```

---

### Quick decision guide

| Goal | Command |
|---|---|
| Re-commit with different files/message | `git reset --soft HEAD~1` |
| Unstage and cherry-pick what to keep | `git reset HEAD~1` (mixed) |
| Throw everything away | `git reset --hard HEAD~1` |

Since you haven't pushed yet, all of these are completely safe to use — they only rewrite local history.