<!-- before / electron-pro / so-2003505-delete-git-branch / run 2 -->

**Duration**: 25.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

### 1. Local branch: `-d` vs `-D`

`git branch -d` is a **safe delete** — it refuses to delete branches with unmerged commits. Use `-D` to force it:

```bash
git branch -D the_local_branch
```

---

### 2. Remote branch: wrong syntax or branch name

`git push origin :<branch>` is the old colon-prefix syntax for remote deletion. The "unqualified destination" error usually means the branch name doesn't exist on the remote (typo, or it was never pushed). Use the modern `--delete` flag instead:

```bash
git push origin --delete the_remote_branch
```

---

### Complete correct sequence

```bash
# Force-delete the local branch (safe to use if you're sure)
git branch -D the_local_branch

# Delete the remote branch
git push origin --delete the_remote_branch

# Optional: prune stale remote-tracking refs
git fetch --prune
```

The `--prune` step removes the lingering `origin/the_remote_branch` reference from your local tracking list after the remote branch is gone.