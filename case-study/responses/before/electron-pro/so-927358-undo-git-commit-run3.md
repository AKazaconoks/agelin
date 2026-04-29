<!-- before / electron-pro / so-927358-undo-git-commit / run 3 -->

**Duration**: 78.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 78.84s > 60s

---
Here's a complete guide to undoing local (unpushed) Git commits:

---

## The Three Layers Git Manages

| Layer | Also Called | What It Is |
|---|---|---|
| **Commit History** | Repository / HEAD | The chain of snapshots in `.git/` |
| **Staging Area** | Index | The "draft" of your next commit (`git add` writes here) |
| **Working Tree** | Working Directory | The actual files on disk |

---

## `git reset` — The Core Command

```bash
git reset [--soft | --mixed | --hard] <target>
```

`<target>` is where HEAD will move. Common values:
```bash
HEAD~1        # one commit before current
HEAD~2        # two commits back
<commit-sha>  # any specific commit hash
```

---

## Flag-by-Flag Breakdown

### `--soft` — Undo the commit only

```bash
git reset --soft HEAD~1
```

| Layer | Effect |
|---|---|
| Commit History | HEAD moves back; the wrong commit is gone |
| Staging Area | **Unchanged** — files remain staged as-is |
| Working Tree | **Unchanged** — files on disk are untouched |

**Mental model:** As if you hit undo on just the `git commit` action. Files and staging are exactly as they were before you committed.

**Use when:** You want to rewrite the commit message, recommit to a different branch, or re-stage files selectively.

---

### `--mixed` — Undo the commit and unstage (default)

```bash
git reset HEAD~1        # --mixed is the default
git reset --mixed HEAD~1  # same thing, explicit
```

| Layer | Effect |
|---|---|
| Commit History | HEAD moves back |
| Staging Area | **Cleared** — files removed from the index |
| Working Tree | **Unchanged** — files on disk are untouched |

**Mental model:** Reverses both `git commit` and `git add`. Changes survive as unstaged modifications — you must consciously `git add` them again.

**Use when:** You want maximum flexibility to review and re-stage only what you actually want. **This is the safest default.**

---

### `--hard` — Undo the commit and wipe the files

```bash
git reset --hard HEAD~1
```

| Layer | Effect |
|---|---|
| Commit History | HEAD moves back |
| Staging Area | **Cleared** |
| Working Tree | **Overwritten** — files reset to match the target commit |

**Mental model:** The bad commit never existed — at every level. Git forcibly overwrites your disk.

**Use when:** You committed secrets, build artifacts, or files you never want back. **Warning: discards data permanently.**

---

## Side-by-Side Comparison

```
                  Commit History    Staging Area     Working Tree
                  --------------    ------------     ------------
git reset --soft  MOVES BACK        unchanged        unchanged
git reset --mixed MOVES BACK        CLEARED          unchanged
git reset --hard  MOVES BACK        CLEARED          OVERWRITTEN
```

---

## Scenario 1: KEEP the Changes (Just Uncommit)

```bash
# Recommended: undo commit, leave files modified but unstaged
git reset HEAD~1

# Or: undo commit, keep files staged (ready to re-commit immediately)
git reset --soft HEAD~1
```

After `--mixed`, you can selectively re-stage only what you want:
```bash
git add correct-file.ts
git commit -m "feat: only the right changes"
```

---

## Scenario 2: DISCARD the Changes Entirely

```bash
# Undo last commit and destroy the changes completely
git reset --hard HEAD~1

# Or reset to a specific known-good commit by SHA
git log --oneline        # find the SHA first
git reset --hard 9d4e8a1
```

---

## Safety Net: `git reflog`

Even after `--hard`, Git keeps a local log of every HEAD position for ~30 days:

```bash
git reflog
# HEAD@{0}: reset: moving to HEAD~1
# HEAD@{1}: commit: wrong commit   <-- "lost" commit is here

# Recover it:
git reset --hard HEAD@{1}
```

---

## Decision Tree

```
Did you already push the commit?
├── YES → Use `git revert <sha>`  (never rewrite shared history)
└── NO  → Do you want to keep the files?
          ├── YES, keep staged     → git reset --soft HEAD~1
          ├── YES, keep unstaged   → git reset HEAD~1   ← safest default
          └── NO, destroy them     → git reset --hard HEAD~1
```

---

**One critical rule:** `git reset` rewrites history — only safe for unpushed commits. If you've already pushed, use `git revert <sha>` instead, which creates a new "undo" commit without touching shared history.