<!-- before / electron-pro / so-927358-undo-git-commit / run 1 -->

**Duration**: 37.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete walkthrough of your options:

---

## The Three Areas Git Manages

| Area | What it is |
|---|---|
| **Commit history** | The chain of commits (`git log`) |
| **Staging area (index)** | Files queued for the next commit (green in `git status`) |
| **Working tree** | Your actual files on disk |

---

## 1. Keep the Changes — Two Options

### `git reset --soft HEAD~1`

```bash
git reset --soft HEAD~1
```

| Area | Effect |
|---|---|
| Commit history | Last commit is **removed** |
| Staging area | Files remain **staged** (green) |
| Working tree | Untouched |

Use when you want to immediately recommit with a corrected message or after tweaking what's staged.

---

### `git reset --mixed HEAD~1` (the default)

```bash
git reset HEAD~1
```

| Area | Effect |
|---|---|
| Commit history | Last commit is **removed** |
| Staging area | Files are **unstaged** (red) |
| Working tree | Untouched |

Use when you want to review, selectively re-stage only the right files, and recommit. **This is the safest and most common recovery option.**

---

## 2. Discard the Changes Entirely

### `git reset --hard HEAD~1`

```bash
git reset --hard HEAD~1
```

| Area | Effect |
|---|---|
| Commit history | Last commit is **removed** |
| Staging area | **Wiped clean** |
| Working tree | **Files overwritten** to match the previous commit |

> **WARNING:** `--hard` permanently deletes your working tree changes with no undo. Only use this if you are certain you want to throw that work away.

---

## 3. Bonus: Remove One Wrong File, Keep the Rest

If the commit is mostly fine but one file shouldn't be there:

```bash
# Pull just that file back out of the commit
git reset HEAD~1 -- path/to/wrong-file.txt

# Recommit the rest, reusing the same message
git commit --amend --no-edit
```

The wrong file lands back in your working tree (unstaged), and the commit is rewritten without it.

---

## Quick Decision Guide

```
Want to keep all changes?
├── Still staged, ready to recommit  →  git reset --soft HEAD~1
└── Back in working tree, unstaged   →  git reset HEAD~1   ← safest default

Want to remove one file from the commit?
└── reset + amend approach above

Want to throw everything away?
└── git reset --hard HEAD~1   ⚠ permanent, no undo
```

The **safest default** for most situations is `git reset HEAD~1` (mixed) — zero risk of data loss, full control over what gets re-staged.