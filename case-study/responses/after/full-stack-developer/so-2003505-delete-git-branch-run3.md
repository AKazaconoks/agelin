<!-- after / full-stack-developer / so-2003505-delete-git-branch / run 3 -->

**Duration**: 36.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

## Error 1: Local branch not fully merged

`git branch -d` (lowercase) is a **safe delete** — it refuses if the branch has commits not yet merged into your current HEAD. To force-delete regardless:

```bash
git branch -D the_local_branch
```

`-D` is shorthand for `--delete --force`. Before doing this, check if you'd lose any commits:

```bash
git log the_local_branch --not --remotes --not --branches=main
```

---

## Error 2: Remote branch not found

The `:branch` refspec syntax pushes "nothing" to a destination to delete it — but if `the_remote_branch` doesn't exist on `origin` (wrong name, already deleted, or never pushed), Git can't find the destination.

**Verify the remote branch name first:**

```bash
git branch -r
```

Then delete it using either syntax:

```bash
# Old syntax (still works)
git push origin :the_remote_branch

# Modern syntax (preferred)
git push origin --delete the_remote_branch
```

---

## Common pitfall: name mismatch

Your local branch and its remote counterpart may have different names. Always confirm with `git branch -r` before deleting remotely.

**Tip:** Keep your remote refs clean with:

```bash
git fetch --prune
```

This removes stale remote-tracking refs for branches that have already been deleted on the server.