<!-- before / full-stack-developer / so-2003505-delete-git-branch / run 2 -->

**Duration**: 12.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
This is a straightforward git question I can answer directly.

## What's going wrong

**Error 1 — local delete:**
`git branch -d` is a *safe* delete that refuses to remove branches with unmerged commits. Use `-D` (capital D) to force it:
```bash
git branch -D the_local_branch
```

**Error 2 — remote delete:**
The colon-prefix syntax (`origin :branch`) is the old way and can be finicky. The modern syntax is clearer and more reliable:
```bash
git push origin --delete the_remote_branch
```

The "unqualified destination" error usually means the remote branch name doesn't exist on `origin` (possibly a typo, or the branch was already deleted remotely).

## Correct commands

```bash
# Delete locally (force, even if unmerged)
git branch -D the_local_branch

# Delete on origin
git push origin --delete the_remote_branch
```

If local and remote share the same name:
```bash
git branch -D my_branch
git push origin --delete my_branch
```

## Tip: verify remote branches first

```bash
git branch -r   # list remote-tracking branches
```

This confirms the exact remote branch name before trying to delete it.