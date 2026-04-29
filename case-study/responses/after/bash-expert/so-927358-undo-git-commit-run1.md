<!-- after / bash-expert / so-927358-undo-git-commit / run 1 -->

**Duration**: 38.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## Safety First: Check Before You Reset

```bash
git log --oneline -5          # see recent commits
git show HEAD --name-only     # see what's in the last commit
git status                    # check working tree and staging area
git diff --cached             # see staged changes
```

---

## Scenario 1: KEEP the Changes

### `git reset --soft HEAD~1`
```bash
git reset --soft HEAD~1
```
| Area | Result |
|---|---|
| Working tree | Unchanged |
| Staging area | Changes remain **staged** |
| Commit history | Last commit removed |

**Best for:** Fixing a bad commit message — everything stays staged, just re-run `git commit`.

---

### `git reset --mixed HEAD~1` (the default)
```bash
git reset HEAD~1
```
| Area | Result |
|---|---|
| Working tree | Unchanged |
| Staging area | Changes **unstaged** (back to modified-but-not-staged) |
| Commit history | Last commit removed |

**Best for:** Re-selecting which files to stage — the most common, safest choice. You can then `git add` only the right files and recommit.

---

## Scenario 2: DISCARD the Changes Entirely

### `git reset --hard HEAD~1`
```bash
git reset --hard HEAD~1
```
| Area | Result |
|---|---|
| Working tree | **Files reverted** to previous commit state — changes lost |
| Staging area | Cleared |
| Commit history | Last commit removed |

**Best for:** When the commit was a mistake and you want a clean slate.
> **Warning:** `--hard` permanently destroys changes in tracked files. No undo without `git reflog`.

---

## Undoing Multiple Commits

Swap `HEAD~1` for however many commits back you need:
```bash
git reset HEAD~3          # undo last 3 commits, keep changes unstaged
git reset abc1234         # reset to a specific commit hash
```

---

## Recovery Hatch (if you used `--hard` by mistake)

```bash
git reflog                      # find the lost commit's hash
git reset --hard HEAD@{1}       # restore to it
```

`git reflog` tracks every place HEAD has pointed, even after resets — your safety net for hard resets gone wrong.