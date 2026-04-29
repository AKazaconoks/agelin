<!-- before / bash-expert / so-927358-undo-git-commit / run 3 -->

**Duration**: 38.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a comprehensive breakdown of your options:

---

## Undoing a Local (Unpushed) Git Commit

### First: orient yourself

```bash
git log --oneline -5
git status
```

These show you what commits exist and what the current state of your files is.

---

## Option 1 — Keep changes, keep them **staged**

```bash
git reset --soft HEAD~1
```

| Area | Effect |
|---|---|
| Working tree | Unchanged — files on disk are untouched |
| Staging area | Changes from the undone commit remain staged |
| Commit history | The last commit is removed |

Use this when you want to fix the commit message, add a forgotten file, or split into multiple commits.

---

## Option 2 — Keep changes, but **unstage** them

```bash
git reset HEAD~1
# or equivalently:
git reset --mixed HEAD~1
```

| Area | Effect |
|---|---|
| Working tree | Unchanged — files on disk are untouched |
| Staging area | Cleared; changes appear as unstaged modifications |
| Commit history | The last commit is removed |

`--mixed` is the default when no flag is given. Use this when you want to selectively re-stage only the correct files.

---

## Option 3 — **Discard** the changes entirely

```bash
git reset --hard HEAD~1
```

| Area | Effect |
|---|---|
| Working tree | Reverted to match the previous commit — **changes are gone** |
| Staging area | Cleared |
| Commit history | The last commit is removed |

**Warning:** This permanently destroys the changes from the undone commit. Use only when you are certain you do not need them.

---

## Undoing Multiple Commits

Replace `HEAD~1` with `HEAD~N` to go back N commits:

```bash
git reset --soft HEAD~3    # undo last 3, keep staged
git reset HEAD~3           # undo last 3, keep unstaged
git reset --hard HEAD~3    # undo last 3, discard everything
```

You can also target a specific commit hash shown by `git log --oneline`:

```bash
git reset --soft abc1234   # reset to just after that commit
```

---

## Recovery Safety Net

If you ran `--hard` by mistake and lost changes, Git's reflog keeps a trace for ~30 days:

```bash
git reflog                  # find the hash of your lost commit
git reset --hard abc1234    # restore to it
```

### Recommended workflow

1. **Backup branch (optional):** `git branch backup-before-reset`
2. Run `git reset HEAD~1` (mixed — safest default)
3. Review with `git status` and `git diff`
4. Re-stage only the correct files: `git add <correct-files>`
5. Commit again: `git commit -m "correct message"`