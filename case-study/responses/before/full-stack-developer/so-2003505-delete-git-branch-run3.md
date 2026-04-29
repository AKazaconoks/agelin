<!-- before / full-stack-developer / so-2003505-delete-git-branch / run 3 -->

**Duration**: 12.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

## Local Branch Deletion

`git branch -d` (lowercase) only deletes if the branch is **fully merged** into its upstream. Since it's not, use `-D` (uppercase) to force-delete:

```bash
git branch -D the_local_branch
```

## Remote Branch Deletion

The error `unable to push to unqualified destination` means **the branch doesn't exist on the remote** (either it was never pushed, or the name is wrong).

First, verify what remote branches actually exist:

```bash
git branch -r
```

Then delete using the modern syntax:

```bash
git push origin --delete the_remote_branch
```

The old colon syntax (`git push origin :branch`) also works, but only if the branch actually exists on the remote.

## Summary

```bash
# Delete locally (force, even if unmerged)
git branch -D the_local_branch

# Delete on remote
git push origin --delete the_remote_branch
```

If you want both in one line:

```bash
git branch -D the_local_branch && git push origin --delete the_remote_branch
```