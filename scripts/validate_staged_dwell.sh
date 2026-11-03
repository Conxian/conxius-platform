#!/usr/bin/env bash
set -euo pipefail

MIN_HOURS="${1-}"
SOURCE_SHA="${2-}"
NOW_EPOCH="${3-}"

case "$MIN_HOURS" in
  ''|*[!0-9]*)
    echo "error=MIN_MAINNET_DWELL_HOURS must be an integer of at least 12" >&2
    exit 2
    ;;
esac

if [ "$MIN_HOURS" -lt 12 ]; then
  echo "error=MIN_MAINNET_DWELL_HOURS must be at least 12" >&2
  exit 2
fi

case "$NOW_EPOCH" in
  ''|*[!0-9]*)
    echo "error=current epoch must be a non-negative integer" >&2
    exit 2
    ;;
esac

if ! git cat-file -e "${SOURCE_SHA}^{commit}" 2>/dev/null; then
  echo "error=source SHA is not an available commit" >&2
  exit 3
fi

read -r _ FIRST_PARENT SECOND_PARENT EXTRA <<EOF
$(git rev-list --parents -n 1 "$SOURCE_SHA")
EOF

if [ -z "${FIRST_PARENT:-}" ] || [ -z "${SECOND_PARENT:-}" ] || [ -n "${EXTRA:-}" ]; then
  echo "error=staged head must be an exact two-parent merge commit; staged-entry evidence is unavailable" >&2
  exit 4
fi

STAGED_ENTRY_EPOCH=$(git show -s --format=%ct "$SOURCE_SHA")
if [ "$NOW_EPOCH" -lt "$STAGED_ENTRY_EPOCH" ]; then
  echo "error=staged-entry timestamp is in the future" >&2
  exit 5
fi

AGE_SECONDS=$((NOW_EPOCH - STAGED_ENTRY_EPOCH))
MINIMUM_SECONDS=$((MIN_HOURS * 3600))

echo "staged_entry_epoch=$STAGED_ENTRY_EPOCH"
echo "age_seconds=$AGE_SECONDS"
echo "minimum_seconds=$MINIMUM_SECONDS"
if [ "$AGE_SECONDS" -ge "$MINIMUM_SECONDS" ]; then
  echo "eligible=true"
else
  echo "eligible=false"
fi
