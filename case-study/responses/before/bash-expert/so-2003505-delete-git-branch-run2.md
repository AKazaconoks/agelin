<!-- before / bash-expert / so-2003505-delete-git-branch / run 2 -->

**Duration**: 30.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what went wrong and how to fix it:

## Error 1: Local deletion (`-d` vs `-D`)

`git branch -d` is a **safe delete** — it refuses to remove a branch with unmerged commits to protect you from data loss. Use `-D` to force it:

```bash
git branch -D the_local_branch
```

## Error 2: Remote deletion (ambiguous refspec)

The `:branch_name` shorthand can be ambiguous. Use the modern explicit flag instead:

```bash
git push origin --delete the_remote_branch
```

## Full workflow

```bash
# Make sure you're not on the branch you're deleting
git checkout main

# Force-delete locally
git branch -D the_local_branch

# Delete from remote
git push origin --delete the_remote_branch
```

**Note:** Local and remote branch names are independent — you can name them differently, but they're typically the same. Make sure you're deleting the right names in each command.