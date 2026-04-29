<!-- after / full-stack-developer / so-2003505-delete-git-branch / run 1 -->

**Duration**: 18.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what went wrong and how to fix it:

### Local branch deletion

**The error:** `git branch -d` is a *safe delete* — it refuses to delete branches with unmerged commits. Use `-D` (capital D) to force it:

```bash
git branch -D the_local_branch
```

Use `-d` only when the branch has already been merged into your current branch.

### Remote branch deletion

**The error:** The old refspec syntax (`push origin :branch`) is fragile — if the remote branch name doesn't exist exactly as typed, it fails. Use `--delete` instead:

```bash
git push origin --delete the_remote_branch
```

### Quick reference

```bash
# Delete local (safe — only if fully merged)
git branch -d branch-name

# Delete local (force — skip merge check)
git branch -D branch-name

# Delete remote
git push origin --delete branch-name

# Verify remote is gone
git branch -r
```

The key takeaways:
- `-d` vs `-D` controls whether Git checks for unmerged commits
- `--delete` is the modern, unambiguous way to delete a remote branch