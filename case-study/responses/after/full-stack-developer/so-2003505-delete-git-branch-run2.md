<!-- after / full-stack-developer / so-2003505-delete-git-branch / run 2 -->

**Duration**: 31.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

### Error 1 — Local deletion: branch not fully merged

`git branch -d` (lowercase) is a **safe delete** — Git refuses if the branch has commits not yet merged into your current branch. It's protecting you from losing work.

**Fix:** use uppercase `-D` to force-delete:

```bash
git branch -D the_local_branch
```

---

### Error 2 — Remote deletion: unqualified destination

The `:the_remote_branch` refspec syntax is valid in principle, but Git can't resolve the destination — usually because the branch name is misspelled, doesn't exist on the remote, or was never pushed.

**Fix:** use the explicit `--delete` flag (available since Git 1.7):

```bash
git push origin --delete the_remote_branch
```

You can verify the branch actually exists on the remote first:

```bash
git ls-remote --heads origin the_remote_branch
```

---

### Full workflow to delete both

There's no single command that does both atomically. Run them in sequence:

```bash
# 1. Delete the remote branch
git push origin --delete the_remote_branch

# 2. Force-delete the local branch
git branch -D the_local_branch

# 3. Prune the stale remote-tracking ref (optional but clean)
git fetch --prune
```

The `git fetch --prune` step removes the leftover `origin/the_remote_branch` pointer from your local repo, which `--delete` alone doesn't clean up.