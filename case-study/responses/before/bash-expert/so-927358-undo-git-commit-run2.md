<!-- before / bash-expert / so-927358-undo-git-commit / run 2 -->

**Duration**: 34.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## Understanding Git's Three Areas

| Area | What it is |
|------|-----------|
| **Working Tree** | Your actual files on disk |
| **Staging Area (Index)** | Files queued for the next commit (`git add`) |
| **Commit History** | The chain of commits on your branch |

---

## Option A — KEEP the changes, undo the commit

### `git reset --soft HEAD~1`
```bash
git reset --soft HEAD~1
```
- **Commit history**: Last commit is removed
- **Staging area**: Changes remain **staged** (exactly as they were before the commit)
- **Working tree**: Untouched

Use this when you want to re-commit with a different message or add more files.

---

### `git reset HEAD~1` *(aka `--mixed`, the default)*
```bash
git reset HEAD~1
```
- **Commit history**: Last commit is removed
- **Staging area**: **Cleared** — changes are unstaged
- **Working tree**: Untouched — files still contain your modifications

Use this when you want to selectively re-stage only the right files before committing.

---

## Option B — DISCARD the changes entirely

### `git reset --hard HEAD~1`
```bash
git reset --hard HEAD~1
```
- **Commit history**: Last commit is removed
- **Staging area**: Cleared
- **Working tree**: **Reverted** to the state of the previous commit — your changes are gone

> **Warning**: This is destructive. Your uncommitted changes cannot be recovered through normal means.

---

## Undoing multiple commits

Adjust the number after `~`:
```bash
git reset --soft HEAD~3   # undo last 3 commits, keep staged
git reset HEAD~3          # undo last 3 commits, keep unstaged
git reset --hard HEAD~3   # undo last 3 commits, discard everything
```

---

## Quick reference

| Command | Commit history | Staging area | Working tree |
|--------|---------------|--------------|--------------|
| `git reset --soft HEAD~1` | Commit removed | Kept staged | Unchanged |
| `git reset HEAD~1` | Commit removed | Unstaged | Unchanged |
| `git reset --hard HEAD~1` | Commit removed | Cleared | **Reverted** |

---

## Emergency recovery after `--hard`

If you accidentally used `--hard`, Git's reflog can save you:
```bash
git reflog          # find the commit hash before the reset
git reset --hard <hash>   # restore to that point
```

The reflog tracks every movement of `HEAD`, even after a hard reset.