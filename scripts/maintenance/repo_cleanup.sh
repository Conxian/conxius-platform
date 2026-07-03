#!/bin/bash
# Conxian Repository Maintenance Script
# Cleans merged and stale branches (>90 days)
# See: docs/BRANCH-MAINTENANCE.md

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

# Protected branches — never auto-delete
PROTECTED="$PRIMARY master staged develop dev"

# Fetch latest from all remotes
git fetch -p --all > /dev/null 2>&1

# Delete merged local branches (excluding primary and current)
git branch --merged "$PRIMARY" | grep -v "^\*" | grep -vE "^(\s*)($PRIMARY|master)$" | xargs -r git branch -d

# Delete stale branches (> 90 days)
CUTOFF_TS=$(date -d "90 days ago" +%s 2>/dev/null || echo 0)
if [ "$CUTOFF_TS" = "0" ]; then
  echo "Warning: could not compute cutoff date, skipping stale branch deletion"
else
  echo "Stale cutoff: $(date -d @$CUTOFF_TS +%Y-%m-%d)"
  for branch in $(git for-each-ref --format="%(refname:short)" refs/heads/); do
    skip=false
    for p in $PROTECTED; do
      [[ "$branch" == "$p" ]] && skip=true && break
    done
    [[ "$branch" == "$CURRENT" ]] && skip=true
    [[ "$skip" == "true" ]] && continue

    LAST_TS=$(git log -1 --format=%ct "$branch" 2>/dev/null || echo 0)
    if [ "$LAST_TS" != "0" ] && [ "$LAST_TS" -lt "$CUTOFF_TS" ]; then
      echo "Deleting stale branch: $branch (Last commit: $(date -d @$LAST_TS +%Y-%m-%d))"
      git branch -D "$branch"
    fi
  done
fi

if [ "$TARGET_PATH" != "." ]; then
    cd - > /dev/null
fi
