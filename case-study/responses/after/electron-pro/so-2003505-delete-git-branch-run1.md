<!-- after / electron-pro / so-2003505-delete-git-branch / run 1 -->

**Duration**: 28.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what's going wrong and how to fix it:

---

### Error 1: `git branch -d` — not fully merged

`-d` is a **safe delete** that refuses to remove a branch with unmerged commits. Use uppercase `-D` to force it:

```bash
git branch -D the_local_branch
```

---

### Error 2: `git push origin :the_remote_branch` — unable to push

The colon syntax is valid in principle, but this error usually means the branch **doesn't exist on the remote** (typo or already deleted). First verify the remote branch name:

```bash
git branch -r   # lists e.g. origin/the_remote_branch
```

Then use the clearer `--delete` flag:

```bash
git push origin --delete the_remote_branch
```

---

### Full correct sequence

```bash
# 1. Delete the remote branch
git push origin --delete the_remote_branch

# 2. Force-delete the local branch
git branch -D the_local_branch

# 3. Clean up stale remote-tracking refs
git fetch --prune
```

---

### Key caveats

| Concern | Guidance |
|---|---|
| Lost commits | After `-D`, commits are recoverable via `git reflog` for ~30 days before GC. |
| Protected branches | GitHub/GitLab block remote deletion of `main`/`master` — disable branch protection in the UI first. |
| Shared branches | Confirm no one else is using the branch before deleting remotely — their local remotes will lose it on next `git fetch --prune`. |
| Auto-prune | Set `git config --global fetch.prune true` so stale refs are cleaned on every fetch automatically. |