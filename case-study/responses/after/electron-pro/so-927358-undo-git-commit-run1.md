<!-- after / electron-pro / so-927358-undo-git-commit / run 1 -->

**Duration**: 45.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete guide to undoing a local (unpushed) Git commit:

---

## Understanding the Three Areas

| Area | What it is |
|---|---|
| **Working tree** | The actual files on your disk |
| **Staging area (index)** | Files queued up (`git add`-ed) for the next commit |
| **Commit history** | The chain of commits Git knows about |

---

## Scenario 1: Undo the Commit but KEEP the Changes

### Option A — `git reset --soft` (re-staged, ready to recommit)

```bash
git reset --soft HEAD~1
```

| Area | Result |
|---|---|
| Working tree | **Unchanged** — files are exactly as committed |
| Staging area | **Changes are re-staged** — ready to commit again |
| Commit history | **Bad commit removed** |

**Use when:** You want to amend the commit message, or re-commit immediately with corrections.

---

### Option B — `git reset --mixed` (unstaged, pick-and-choose)

```bash
git reset HEAD~1    # --mixed is the default
```

| Area | Result |
|---|---|
| Working tree | **Unchanged** — files still modified on disk |
| Staging area | **Cleared** — you must `git add` deliberately again |
| Commit history | **Bad commit removed** |

**Use when:** You want to selectively re-stage only the correct files before recommitting. This is the most common choice.

---

## Scenario 2: Undo the Commit and DISCARD Changes Entirely

### `git reset --hard` (wipe everything)

```bash
git reset --hard HEAD~1
```

| Area | Result |
|---|---|
| Working tree | **Wiped** — files reset to the state before the bad commit |
| Staging area | **Cleared** |
| Commit history | **Bad commit removed** |

> **Warning:** This is destructive and irreversible through normal means. Use `git reflog` as a safety net (see below).

---

## Safety Net: `git reflog`

If you reset too aggressively, Git keeps a local journal of all `HEAD` movements:

```bash
git reflog
# a3f9c1b HEAD@{0}: reset: moving to HEAD~1
# d8e2a04 HEAD@{1}: commit: my bad commit

git reset --hard d8e2a04   # restore to the bad commit if needed
```

Entries expire after ~90 days, so act promptly.

---

## Alternative: `git revert` (Non-Destructive, Safe for Shared History)

```bash
git revert HEAD
```

| Area | Result |
|---|---|
| Working tree | Updated to reverse the bad commit's changes |
| Staging area | Cleared after the revert commit is made |
| Commit history | **Bad commit stays** — a new "undo" commit is added on top |

**Use `git revert` when:** The commit was already pushed, or you're on a protected branch. Since yours is local-only, `reset` is simpler.

---

## Quick Decision Guide

```
Did you push the commit?
    YES → git revert HEAD           (safe for shared history)
    NO  → do you want the changes?
              YES, re-stage selectively → git reset HEAD~1          (--mixed)
              YES, already staged       → git reset --soft HEAD~1
              NO, wipe everything       → git reset --hard HEAD~1
```

---

## Side-by-Side Summary

| Command | Working Tree | Staging Area | Commit History |
|---|---|---|---|
| `git reset --soft HEAD~1` | Unchanged | Changes re-staged | Bad commit removed |
| `git reset --mixed HEAD~1` | Unchanged | Changes unstaged | Bad commit removed |
| `git reset --hard HEAD~1` | **Wiped to previous state** | Cleared | Bad commit removed |
| `git revert HEAD` | Reverted by new commit | Cleared | Bad commit kept + revert commit added |

For your case (local, unpushed), `git reset --mixed HEAD~1` is typically the safest and most flexible choice — it removes the commit, unstages everything, and leaves your files untouched so you can re-add only the correct ones.