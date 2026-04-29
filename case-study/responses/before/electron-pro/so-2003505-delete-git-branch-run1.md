<!-- before / electron-pro / so-2003505-delete-git-branch / run 1 -->

**Duration**: 29.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

## Error 1: Local Delete (`-d` vs `-D`)

```
error: The branch 'the_local_branch' is not fully merged.
```

`git branch -d` is a **safe delete** — it refuses to delete branches with commits not yet merged into your current branch. Use `-D` (uppercase) to force it:

```bash
git branch -D the_local_branch
```

`-D` is shorthand for `--delete --force`.

---

## Error 2: Remote Delete (branch name mismatch)

```
error: unable to push to unqualified destination: the_remote_branch
```

The colon-prefix syntax `git push origin :branch_name` requires the **exact** remote branch name. The error usually means the name doesn't exist on `origin`. Verify with:

```bash
git branch -r
```

Then use the **modern, recommended syntax**:

```bash
git push origin --delete the_remote_branch
```

This is clearer and less error-prone than the old colon syntax.

---

## Summary

| Goal | Command |
|---|---|
| Delete local (safe) | `git branch -d the_local_branch` |
| Delete local (force) | `git branch -D the_local_branch` |
| Delete remote (legacy) | `git push origin :the_remote_branch` |
| Delete remote (modern) | `git push origin --delete the_remote_branch` |

Always confirm the remote branch name with `git branch -r` before deleting to avoid the "unqualified destination" error.