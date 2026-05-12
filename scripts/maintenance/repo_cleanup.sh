#!/bin/bash
REPO_PATH=${1:-"."}
echo "--- Cleaning repo at $REPO_PATH ---"
cd "$REPO_PATH" || return 1

PRIMARY="main"
git show-ref --verify --quiet refs/heads/main || PRIMARY="master"
CURRENT=$(git rev-parse --abbrev-ref HEAD)

# Clean merged
git branch --merged "$PRIMARY" | grep -v "^\*" | grep -vE "^(\s*)($PRIMARY|master)$" | xargs -r git branch -d

# Clean stale (> 90 days: before 2026-02-12)
CUTOFF_TS=1770768000
for branch in $(git for-each-ref --format="%(refname:short)" refs/heads/); do
  if [[ "$branch" == "$PRIMARY" || "$branch" == "master" || "$branch" == "$CURRENT" ]]; then continue; fi
  LAST_TS=$(git log -1 --format=%ct "$branch")
  if [ "$LAST_TS" -lt "$CUTOFF_TS" ]; then
    echo "Deleting stale branch: $branch"
    git branch -D "$branch"
  fi
done
cd - > /dev/null
