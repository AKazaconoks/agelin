<!-- after / electron-pro / so-927358-undo-git-commit / run 3 -->

**Duration**: 38.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the full breakdown from the agent:

---

## Undoing a Local (Unpushed) Git Commit

The primary tool is `git reset`, which moves the `HEAD` pointer (and the branch pointer) backward to a previous commit. The three flags control how aggressively the reset affects your working tree and staging area.

---

### The Three Flags at a Glance

| Flag | Commit History | Staging Area (Index) | Working Tree (Files on Disk) |
|---|---|---|---|
| `--soft` | Commit removed | Changes kept **staged** | Unchanged |
| `--mixed` | Commit removed | Changes **unstaged** | Unchanged |
| `--hard` | Commit removed | Wiped clean | **Files reverted** |

`HEAD~1` means "one commit before the current HEAD". You can also use a full commit hash, e.g. `git reset --soft a3f9c12`.

---

### Scenario 1: Keep the Changes

**Option A — `--soft`: Undo the commit, leave changes staged**

```bash
git reset --soft HEAD~1
```

- **History**: Bad commit removed, HEAD moves back one step.
- **Staging area**: Files remain staged (green in `git status`).
- **Working tree**: Untouched.

Best for: You committed too early or with the wrong message — just run `git commit -m "correct message"` after.

---

**Option B — `--mixed` (the default): Undo the commit and unstage everything**

```bash
git reset HEAD~1
```

- **History**: Bad commit removed.
- **Staging area**: All changes unstaged (red in `git status`), as if you never ran `git add`.
- **Working tree**: Untouched.

Best for: You need to selectively re-stage only the correct files before recommitting.

```bash
git add src/correct-file.ts
git commit -m "correct commit"
```

---

### Scenario 2: Discard the Changes Entirely

**`--hard`: Wipe the commit and all its changes**

```bash
git reset --hard HEAD~1
```

- **History**: Bad commit removed.
- **Staging area**: Wiped clean.
- **Working tree**: Files reverted to the previous commit state. **Changes are permanently lost.**

> **Warning**: This is the only flag that destroys data on disk. Untracked files are left alone. If you also want to delete those, follow up with `git clean -fd`.

---

### Other Useful Commands

**`git commit --amend`** — instead of removing the commit, rewrite it in place (fix the message, add/remove a file):

```bash
git add src/forgotten-file.ts
git commit --amend -m "new message"
```

**`git revert HEAD`** — creates a new "undo" commit rather than erasing history. The right choice for shared/pushed branches; for a local-only commit, `reset` is cleaner.

---

### Decision Tree

```
Was the commit pushed to a remote?
  YES → git revert (never rewrite shared history)
  NO  →
       Keep changes, already staged correctly → git reset --soft HEAD~1
       Keep changes, re-stage selectively    → git reset HEAD~1  (--mixed)
       Discard everything                    → git reset --hard HEAD~1

       Just fix the message or add one file? → git commit --amend
```