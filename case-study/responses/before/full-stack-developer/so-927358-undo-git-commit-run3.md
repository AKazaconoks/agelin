<!-- before / full-stack-developer / so-927358-undo-git-commit / run 3 -->

**Duration**: 49.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete breakdown of your options:

---

## Core Concept: What `HEAD~1` Means

`HEAD` always points to your most recent commit. `HEAD~1` means "one commit before HEAD." Every `git reset HEAD~1` variant rewinds the branch pointer to that parent commit — what differs is what happens to your files.

---

## Scenario 1: Keep the Changes

### Option A — `git reset --soft HEAD~1`

```bash
git reset --soft HEAD~1
```

| Layer | What happens |
|---|---|
| Commit history | Bad commit is removed |
| Staging area | Files remain **staged** (ready to commit) |
| Working tree | **Untouched** |

Use when you want to re-commit immediately, perhaps with a corrected message or after adding one more file.

---

### Option B — `git reset --mixed HEAD~1` *(the default)*

```bash
git reset --mixed HEAD~1
# or simply:
git reset HEAD~1
```

| Layer | What happens |
|---|---|
| Commit history | Bad commit is removed |
| Staging area | Files are **unstaged** (back to "modified") |
| Working tree | **Untouched** |

Use when you committed the wrong mix of files and want to re-stage only the correct ones from scratch. This is the most common choice.

```bash
# After reset, selectively re-stage the right files:
git add correctfile.ts
git commit -m "correct commit message"
```

---

## Scenario 2: Discard the Changes Entirely

### `git reset --hard HEAD~1`

```bash
git reset --hard HEAD~1
```

| Layer | What happens |
|---|---|
| Commit history | Bad commit is removed |
| Staging area | Cleared |
| Working tree | **Overwritten** — all changes are gone |

Use when you want every trace of the bad commit erased. **This is destructive and irreversible** — the file changes are lost.

---

## Lighter Alternative (pre-commit): `git restore --staged`

If you haven't committed yet but just staged the wrong files:

```bash
git restore --staged wrongfile.txt   # unstage a single file
git restore --staged .               # unstage everything
```

History and the working tree are both untouched — only the staging area is fixed.

---

## Quick Decision Guide

```
Did you already run `git commit`?
│
├── NO  ── git restore --staged <file>
│          (fix staging area only, history untouched)
│
└── YES ── Keep the file changes?
           │
           ├── YES ── Want them pre-staged?
           │          ├── YES ── git reset --soft HEAD~1
           │          └── NO  ── git reset --mixed HEAD~1  ← DEFAULT
           │
           └── NO  ── git reset --hard HEAD~1
                      !! DESTRUCTIVE — file changes permanently deleted !!
```

---

## Summary Table

| Command | History | Staging area | Working tree |
|---|---|---|---|
| `git restore --staged <file>` | Unchanged | File unstaged | Unchanged |
| `git reset --soft HEAD~1` | Commit removed | Stays staged | Unchanged |
| `git reset --mixed HEAD~1` | Commit removed | Cleared | Unchanged |
| `git reset --hard HEAD~1` | Commit removed | Cleared | **Overwritten** |

---

**Before running any reset**, inspect what you're about to undo:

```bash
git log --oneline -3      # see recent commits
git show --stat HEAD      # see files in the last commit
git status                # see staged vs. unstaged state
```