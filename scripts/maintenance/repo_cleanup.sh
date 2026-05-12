#!/bin/bash
# Conxian Repository Maintenance Script
# Cleans merged and stale branches (>90 days)

# If an argument is provided, we assume we want to clean that path from HERE.
# If no argument, we clean the current directory.
TARGET_PATH=${1:-"."}

if [ "$TARGET_PATH" != "." ]; then
    cd "$TARGET_PATH" || { echo "Failed to cd to $TARGET_PATH"; return 1; }
fi

echo "--- Cleaning repo at $(pwd) ---"

# Determine primary branch
PRIMARY="main"
git show-ref --verify --quiet refs/heads/main || PRIMARY="master"
CURRENT=$(git rev-parse --abbrev-ref HEAD)

echo "Primary branch: $PRIMARY"
echo "Current branch: $CURRENT"

# Fetch latest from all remotes
git fetch -p --all > /dev/null 2>&1

# Delete merged local branches (excluding primary and current)
# We use -d for safe deletion, -D if you want to force.
# The prompt says "delete all already merged", which implies safety.
git branch --merged "$PRIMARY" | grep -v "^\*" | grep -vE "^(\s*)($PRIMARY|master)$" | xargs -r git branch -d

# Delete stale branches (> 90 days: before 2026-02-12)
# Today is 2026-05-12. 90 days ago is 2026-02-11.
CUTOFF_TS=1739232000 # 2026-02-11 00:00:00 UTC
for branch in $(git for-each-ref --format="%(refname:short)" refs/heads/); do
  if [[ "$branch" == "$PRIMARY" || "$branch" == "master" || "$branch" == "$CURRENT" ]]; then
    continue
  fi
  LAST_TS=$(git log -1 --format=%ct "$branch")
  if [ "$LAST_TS" -lt "$CUTOFF_TS" ]; then
    echo "Deleting stale branch: $branch (Last commit: $(date -d @$LAST_TS +%Y-%m-%d))"
    git branch -D "$branch"
  fi
done

if [ "$TARGET_PATH" != "." ]; then
    cd - > /dev/null
fi
