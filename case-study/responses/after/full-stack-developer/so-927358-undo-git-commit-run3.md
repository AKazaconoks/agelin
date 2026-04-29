<!-- after / full-stack-developer / so-927358-undo-git-commit / run 3 -->

**Duration**: 63.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 63.52s > 60s

---
Here's the full breakdown from the agent:

---

## The Three Areas Git Manages

Before diving into commands, understand the three places Git tracks your work:

```
Working Tree        Staging Area (Index)        Commit History
─────────────       ────────────────────        ──────────────
Files on disk  -->  git add  -->  Staged files  -->  git commit  -->  Commits
```

Every "undo" command moves things backward through this pipeline. The mode controls how far back it reaches.

---

## `git reset`: The Core Command

Suppose your history looks like this, and you want to undo the last commit:

```
A --- B --- C   <-- HEAD (main)
```

You run `git reset [mode] HEAD~1` to move HEAD back to `B`.

---

### `--soft` — Move HEAD only

```bash
git reset --soft HEAD~1
```

| Area | Effect |
|------|--------|
| Commit history | Commit `C` removed |
| Staging area | **Unchanged** — changes from `C` are still staged |
| Working tree | **Unchanged** — files on disk are as they were |

Changes end up **staged, ready to re-commit**. The safest option — nothing is lost.

**Use when:** You committed too early, want to reword the message, or squash commits.

---

### `--mixed` — Move HEAD + reset the index (the default)

```bash
git reset HEAD~1        # --mixed is the default
```

| Area | Effect |
|------|--------|
| Commit history | Commit `C` removed |
| Staging area | **Reset** — changes from `C` are unstaged |
| Working tree | **Unchanged** — files on disk are as they were |

Changes end up as **unstaged modifications** on disk — as if you edited the files but never ran `git add`.

**Use when:** You committed the wrong files and want to cherry-pick what goes back into the index.

---

### `--hard` — Move HEAD + reset index + reset working tree

```bash
git reset --hard HEAD~1
```

| Area | Effect |
|------|--------|
| Commit history | Commit `C` removed |
| Staging area | **Reset** |
| Working tree | **Reset** — changes from `C` are **gone from disk** |

> **Warning:** `--hard` is destructive and irreversible through normal means.

---

## Side-by-Side Summary

| Mode | HEAD moves | Index reset | Working tree reset | Changes end up... |
|------|-----------|------------|-------------------|-------------------|
| `--soft` | Yes | No | No | Staged, ready to commit |
| `--mixed` (default) | Yes | Yes | No | Unstaged, still on disk |
| `--hard` | Yes | Yes | Yes | **Gone** |

---

## Scenario 1: Keep the Changes (just undo the commit)

You committed `config.json` and `secrets.txt` together but only want `config.json`:

```bash
# Undo the commit, leave changes unstaged on disk
git reset HEAD~1

# Stage only what you want
git add config.json
git commit -m "Add config.json"

# secrets.txt remains in your working tree, untouched
```

Or with `--soft` if you want changes pre-staged:

```bash
git reset --soft HEAD~1
git restore --staged secrets.txt   # unstage just that one file
git commit -m "Add config.json"
```

---

## Scenario 2: Discard the Changes Entirely

```bash
# Wipe the commit AND the changes from disk
git reset --hard HEAD~1
```

If there are also **untracked files** to clean up:

```bash
git clean -fdn   # dry run first — see what would be deleted
git clean -fd    # -f = force, -d = include directories
```

---

## Decision Flowchart

```
Want to keep the changes?
├── Keep them staged?          --> git reset --soft HEAD~N
├── Keep them unstaged?        --> git reset HEAD~N   (--mixed)
└── Discard everything?
    ├── Tracked files only?    --> git reset --hard HEAD~N
    └── Also untracked files?  --> git reset --hard HEAD~N && git clean -fd
```

---

## Safety Net: Recovering from Accidental `--hard`

If you ran `--hard` by mistake, the reflog can save you (entries survive ~90 days):

```bash
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~1
# d4e5f6a HEAD@{1}: commit: the commit you lost

git reset --hard HEAD@{1}   # jump back to before the reset
```