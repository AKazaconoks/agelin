<!-- after / bash-expert / so-927358-undo-git-commit / run 2 -->

**Duration**: 32.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## Undoing a Local Commit (Not Yet Pushed)

### First, check what you're dealing with

```bash
git log --oneline -5   # see recent commits
git show HEAD          # see exactly what the last commit changed
```

---

## Scenario 1: KEEP the changes

### Option A — Keep changes **staged** (ready to re-commit)

```bash
git reset --soft HEAD~1
```

| Area | Result |
|---|---|
| Working tree | Unchanged — files on disk stay as-is |
| Staging area | Changes remain staged |
| Commit history | Last commit is removed; HEAD moves back one |

Use this when you just want to re-word the commit message or split the commit differently.

---

### Option B — Keep changes **unstaged** (back to edited-but-not-added state)

```bash
git reset HEAD~1
# same as: git reset --mixed HEAD~1
```

| Area | Result |
|---|---|
| Working tree | Unchanged — files on disk stay as-is |
| Staging area | Cleared |
| Commit history | Last commit removed |

Use this when you want to selectively `git add` only the right files before re-committing.

---

## Scenario 2: DISCARD the changes entirely

```bash
git reset --hard HEAD~1
```

| Area | Result |
|---|---|
| Working tree | **Files reverted** to the state of the prior commit |
| Staging area | Cleared |
| Commit history | Last commit removed |

> **Warning:** This destroys your changes permanently (for tracked files). No undo unless you use `git reflog`.

If you also have **untracked files** to remove:

```bash
git clean -fd   # deletes untracked files and directories
```

---

## Undoing Multiple Commits

Replace `HEAD~1` with `HEAD~N` for N commits:

```bash
git reset --soft HEAD~3    # undo last 3, keep staged
git reset HEAD~3           # undo last 3, keep unstaged
git reset --hard HEAD~3    # undo last 3, discard all
```

---

## Safety net: `git reflog`

If you reset too aggressively, your commits aren't immediately gone — they live in the reflog:

```bash
git reflog                        # find the hash of the commit you want back
git reset --hard <commit-hash>    # restore to it
```

---

**Quick rule of thumb:**
- `--soft` → history only
- `--mixed` (default) → history + unstage
- `--hard` → history + unstage + revert files ⚠️