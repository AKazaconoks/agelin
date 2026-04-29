<!-- before / bash-expert / so-927358-undo-git-commit / run 1 -->

**Duration**: 56.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete breakdown of your options:

---

## The Three Git Areas

| Area | What it is |
|---|---|
| **Working Tree** | Files on disk |
| **Staging Area (Index)** | Files queued for the next commit |
| **Commit History** | The chain of commits |

---

## Option A: Keep Your Changes (just uncommit them)

### `git reset --soft HEAD~1`
```bash
git reset --soft HEAD~1
```
- **Working Tree**: untouched
- **Staging Area**: untouched (files remain staged)
- **Commit History**: last commit removed

Best for: fixing a commit message, or adding more files to the same commit before recommitting.

---

### `git reset --mixed HEAD~1` (default — same as `git reset HEAD~1`)
```bash
git reset HEAD~1
```
- **Working Tree**: untouched (your edits survive)
- **Staging Area**: cleared (files become unstaged)
- **Commit History**: last commit removed

Best for: selectively re-staging only the files you actually want, then making a new commit.

---

## Option B: Discard Changes Entirely

### `git reset --hard HEAD~1`
```bash
git reset --hard HEAD~1
```
- **Working Tree**: reverted to the previous commit state
- **Staging Area**: cleared
- **Commit History**: last commit removed

**Warning:** changes are gone. Use `git reflog` to recover if you act fast.

---

## Multiple Commits

Replace `~1` with however many commits to undo:
```bash
git reset --soft HEAD~3   # keep staged, undo 3 commits
git reset HEAD~3           # keep in working tree, undo 3 commits
git reset --hard HEAD~3   # discard everything, undo 3 commits
```

Or reset to a specific commit hash shown in `git log --oneline`:
```bash
git reset --mixed abc1234
```

---

## Quick Reference

| Command | Working Tree | Staging Area | History |
|---|---|---|---|
| `reset --soft HEAD~1` | Keep | Keep staged | Remove commit |
| `reset HEAD~1` | Keep | Unstage | Remove commit |
| `reset --hard HEAD~1` | **Revert** | Clear | Remove commit |

---

## Emergency Recovery

If you used `--hard` by mistake:
```bash
git reflog          # find the lost commit's hash
git reset --hard HEAD@{1}   # restore to it
```

`git reflog` tracks all HEAD movements — it's your safety net for local-only disasters.