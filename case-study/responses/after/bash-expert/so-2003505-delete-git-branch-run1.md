<!-- after / bash-expert / so-2003505-delete-git-branch / run 1 -->

**Duration**: 24.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

## Problem 1: `git branch -d` — "not fully merged"

`-d` is a **safe delete** — Git refuses if the branch has commits not yet merged into your current branch or upstream. It's protecting you from losing work.

- Use `-D` (force) only when you're sure the commits are either already incorporated elsewhere or intentionally being discarded.

```bash
git branch -D the_local_branch
```

---

## Problem 2: `git push origin :the_remote_branch` — "unqualified destination"

The colon syntax is old and error-prone. Git can't resolve the destination because it doesn't know which remote ref you mean.

**Use the modern `--delete` flag instead:**

```bash
git push origin --delete the_remote_branch
```

---

## Complete workflow

```bash
# Force-delete local branch (safe delete if already merged)
git branch -D the_local_branch

# Delete remote branch
git push origin --delete the_remote_branch

# Optional: clean up stale remote-tracking refs
git remote prune origin
```

The `--delete` flag has been the recommended approach since Git 1.7.0 — it's unambiguous and easy to read. The colon syntax (`:branch`) still technically works but requires the full refspec (`refs/heads/branch`) in many cases, which is why it fails without it.