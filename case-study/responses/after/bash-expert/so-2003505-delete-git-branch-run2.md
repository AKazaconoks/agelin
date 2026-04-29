<!-- after / bash-expert / so-2003505-delete-git-branch / run 2 -->

**Duration**: 32.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what was wrong and how to fix it:

---

## Error 1: Local branch not fully merged

```
error: The branch 'the_local_branch' is not fully merged.
```

`git branch -d` is a **safe delete** — it refuses to delete a branch with commits not yet merged into your current branch. Git is protecting you from losing work.

**Fix:**
```bash
# If you're sure you want to delete it (force):
git branch -D the_local_branch
```

---

## Error 2: Remote branch deletion failed

```
error: unable to push to unqualified destination: the_remote_branch
```

The `:branch_name` shorthand either requires the full refspec (`refs/heads/the_remote_branch`) or the remote branch name must be quoted correctly. The modern way is simply:

**Fix:**
```bash
git push origin --delete the_remote_branch
```

---

## Summary: Delete both at once

```bash
# Force-delete local branch (skip -D if it's fully merged):
git branch -D the_local_branch

# Delete from remote:
git push origin --delete the_remote_branch
```

> **Tip:** Before force-deleting, check what unmerged commits exist so you don't lose work unintentionally:
> ```bash
> git log --oneline the_local_branch ^main
> ```