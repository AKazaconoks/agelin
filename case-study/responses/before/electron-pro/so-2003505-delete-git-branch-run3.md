<!-- before / electron-pro / so-2003505-delete-git-branch / run 3 -->

**Duration**: 32.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

### Error 1: Local branch (`-d` vs `-D`)

```
error: The branch 'the_local_branch' is not fully merged.
```

`git branch -d` is a **safe delete** — it refuses to remove a branch if it has commits not yet merged into your current branch. Git is protecting you from losing those commits.

**Fix:** Force-delete with capital `-D` if you're sure you don't need the work:
```bash
git branch -D the_local_branch
```

---

### Error 2: Remote branch (branch doesn't exist on remote)

```
error: unable to push to unqualified destination: the_remote_branch
```

The colon-prefix syntax (`git push origin :branch-name`) means "push nothing to this destination," which deletes it. The error occurs because **`the_remote_branch` doesn't exist on the remote** (wrong name, or already deleted).

**Fix:** First confirm the exact name, then use the modern `--delete` syntax:
```bash
# Confirm the remote branch name
git branch -r

# Delete it
git push origin --delete the_remote_branch
```

---

### Full workflow

```bash
# Delete local (force if unmerged)
git branch -D the_local_branch

# Delete remote
git push origin --delete the_remote_branch

# Clean up stale remote-tracking refs locally
git fetch --prune
```

The `--prune` step is optional but keeps your local list of remote branches clean after deletions.