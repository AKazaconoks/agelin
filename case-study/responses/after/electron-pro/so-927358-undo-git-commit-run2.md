<!-- after / electron-pro / so-927358-undo-git-commit / run 2 -->

**Duration**: 39.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete walkthrough:

---

## Undoing Local Commits in Git

### The three layers

| Layer | What it is |
|---|---|
| Commit history | The chain of commits `git log` shows |
| Staging area (index) | What `git add` has queued up for the next commit |
| Working tree | The actual files on disk |

---

### Scenario A — KEEP the changes

#### Option 1: `git reset --soft` — uncommit but keep staged

```bash
git reset --soft HEAD~1
```

| Layer | Effect |
|---|---|
| Commit history | Last commit removed |
| Staging area | Changes **kept staged** (ready to recommit) |
| Working tree | Untouched |

Use this when you committed too early and want to re-commit with different files or a better message.

---

#### Option 2: `git reset --mixed` — uncommit and unstage (the default)

```bash
git reset HEAD~1
# or explicitly:
git reset --mixed HEAD~1
```

| Layer | Effect |
|---|---|
| Commit history | Last commit removed |
| Staging area | Changes **unstaged** (moved out of the index) |
| Working tree | Untouched — edits remain as modified/untracked files |

This is the most common recovery option. Lets you selectively `git add` only the right files before committing again.

---

### Scenario B — DISCARD the changes entirely

#### `git reset --hard` — wipe everything

```bash
git reset --hard HEAD~1
```

| Layer | Effect |
|---|---|
| Commit history | Last commit removed |
| Staging area | Wiped clean |
| Working tree | **Files reverted** to the new HEAD state — edits are gone |

**This is destructive.** Verify first with `git log --oneline` and `git show HEAD`.

---

### Quick comparison

| Command | History | Staging area | Working tree | Destructive? |
|---|---|---|---|---|
| `git reset --soft HEAD~1` | Commit removed | Changes staged | Untouched | No |
| `git reset --mixed HEAD~1` | Commit removed | Changes unstaged | Untouched | No |
| `git reset --hard HEAD~1` | Commit removed | Wiped | **Reverted** | **Yes** |

---

### When to use `git revert` instead

`git revert` is the right tool when a commit **has already been pushed** to a shared remote — it adds a new commit that undoes the changes rather than rewriting history:

```bash
git revert HEAD
```

For purely local unpushed commits, `git reset` is simpler and cleaner.

---

### Practical workflow

```bash
# 1. See what you have
git log --oneline -10

# 2. Inspect the bad commit
git show HEAD

# 3a. Keep changes, unstage them (most common)
git reset --mixed HEAD~1

# 3b. Keep changes, leave them staged
git reset --soft HEAD~1

# 3c. Nuke everything in the commit
git reset --hard HEAD~1

# 4. Verify
git status
git log --oneline -5
```

**Emergency recovery:** If you ran `--hard` and immediately regret it, `git reflog` shows you the lost commit hash. You can recover it with `git reset --hard <lost-hash>` — but only before Git's garbage collector runs (typically 90 days).