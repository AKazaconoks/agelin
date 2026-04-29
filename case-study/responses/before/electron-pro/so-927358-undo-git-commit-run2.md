<!-- before / electron-pro / so-927358-undo-git-commit / run 2 -->

**Duration**: 50.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete walkthrough of how to undo a local (unpushed) commit:

---

## The Three-Tree Mental Model

Git tracks three separate areas:

```
Working Tree  →  (git add)  →  Staging Area / Index  →  (git commit)  →  Commit History
```

`git reset` rolls HEAD (and your branch pointer) back to a previous commit, and its flags control how far the reset reaches.

---

## Scenario 1 — Keep the Changes

### `--soft`: undo commit, leave changes **staged**

```bash
git reset --soft HEAD~1
```

| Tree | Effect |
|---|---|
| Commit History | Last commit removed, HEAD moves back one step |
| Staging Area | Changes from the undone commit remain **staged** |
| Working Tree | Untouched |

**Use when:** You want to reword a commit message, or split/squash it — everything is already staged so you just `git commit` again.

---

### `--mixed` (the default): undo commit, leave changes **unstaged**

```bash
git reset HEAD~1
# or explicitly:
git reset --mixed HEAD~1
```

| Tree | Effect |
|---|---|
| Commit History | Last commit removed, HEAD moves back one step |
| Staging Area | **Cleared** — changes moved out of the index |
| Working Tree | Untouched |

**Use when:** You want to cherry-pick which files to re-commit. From here you `git add only-the-right-file.ts` and commit cleanly.

---

## Scenario 2 — Discard the Changes Entirely

### `--hard`: undo commit AND delete the changes

```bash
git reset --hard HEAD~1
```

| Tree | Effect |
|---|---|
| Commit History | Last commit removed, HEAD moves back one step |
| Staging Area | Reset to match new HEAD |
| Working Tree | **Reset to match new HEAD — file changes are gone** |

**Use when:** The committed work is genuinely throwaway (build artifacts, accidentally committed secrets, etc.). No built-in undo — see the safety net below.

---

## Quick Decision Reference

```
Keep the changes?
├── Want them pre-staged?   → git reset --soft HEAD~1
└── Want them unstaged?    → git reset --mixed HEAD~1  (default)

Throw away the changes?    → git reset --hard HEAD~1
```

---

## Summary Table

| Flag | History | Staging Area | Working Tree | Safe? |
|---|---|---|---|---|
| `--soft` | Rolled back | Unchanged (staged) | Unchanged | Yes |
| `--mixed` | Rolled back | Cleared (unstaged) | Unchanged | Yes |
| `--hard` | Rolled back | Cleared | **Cleared** | Destructive |

---

## Safety Net: `git reflog`

Even after `--hard`, Git keeps a hidden log of where HEAD has been (typically 90 days). If you reset too aggressively:

```bash
git reflog
# b7d4e01 HEAD@{0}: reset: moving to HEAD~1
# f3a9c12 HEAD@{1}: commit: Accidentally committed wrong files  ← still here!

git reset --hard f3a9c12   # fully restores the "lost" commit
```

---

**One important boundary:** all of the above is safe because the commit was never pushed. If it were already on a remote that others may have pulled, you'd use `git revert <hash>` instead — which adds a new commit that undoes the changes rather than rewriting history.