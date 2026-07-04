#!/usr/bin/env bash
# Generate a CHANGELOG.md section from conventional commits since the last tag.
# Usage: ./scripts/generate-changelog.sh [--dry-run]
#
# With --dry-run: prints the generated section to stdout, does not modify CHANGELOG.md.
# Without --dry-run: inserts the generated section into CHANGELOG.md under [Unreleased]
#   and moves any existing [Unreleased] content into the new version section.

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

CHANGELOG="CHANGELOG.md"
VERSION="${VERSION:-}"

if [[ -z "$VERSION" ]]; then
    echo "ERROR: VERSION environment variable is required (e.g. VERSION=0.3.0)"
    exit 1
fi

# Strip leading 'v' if present
VERSION_NUM="${VERSION#v}"
DATE="$(date +%Y-%m-%d)"

# Find the last tag for commit range
LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "")"
if [[ -n "$LAST_TAG" ]]; then
    RANGE="${LAST_TAG}..HEAD"
    echo "Generating changelog for ${LAST_TAG}..HEAD → v${VERSION_NUM}"
else
    RANGE=""
    echo "No previous tag found. Generating changelog from all commits → v${VERSION_NUM}"
fi

# Collect commits grouped by conventional commit type
# Use --no-merges to avoid duplicate entries from merge commits
collect_commits() {
    local prefix="$1"
    if [[ -n "$RANGE" ]]; then
        git log --no-merges "$RANGE" --pretty=format:"- %s" --grep="^${prefix}" 2>/dev/null || true
    else
        git log --no-merges --pretty=format:"- %s" --grep="^${prefix}" 2>/dev/null || true
    fi
}

# Clean commit messages: strip conventional commit prefix and scope, then deduplicate
clean_messages() {
    sed -E \
        -e 's/^-( feat| fix| docs| chore| refactor| perf| test| build| ci| style| revert)(\([^)]*\))?: /- /' \
        -e 's/^-( feat| fix| docs| chore| refactor| perf| test| build| ci| style| revert): /- /' \
        | sort -u
}

FEATURES="$(collect_commits "feat" | clean_messages)"
FIXES="$(collect_commits "fix" | clean_messages)"
CHANGES="$(collect_commits "refactor|perf" | clean_messages)"
DOCS="$(collect_commits "docs" | clean_messages)"
CHORES="$(collect_commits "chore|build|ci|style|test" | clean_messages)"
OTHER="$(if [[ -n "$RANGE" ]]; then
    git log --no-merges "$RANGE" --pretty=format:"- %s" --invert-grep --grep="^(feat|fix|docs|chore|refactor|perf|test|build|ci|style|revert)" 2>/dev/null || true
else
    git log --no-merges --pretty=format:"- %s" --invert-grep --grep="^(feat|fix|docs|chore|refactor|perf|test|build|ci|style|revert)" 2>/dev/null || true
fi)"

# Build the new changelog section
SECTION="## [${VERSION_NUM}] - ${DATE}\n"

if [[ -n "$FEATURES" ]]; then
    SECTION+="\n### Added\n${FEATURES}\n"
fi
if [[ -n "$FIXES" ]]; then
    SECTION+="\n### Fixed\n${FIXES}\n"
fi
if [[ -n "$CHANGES" ]]; then
    SECTION+="\n### Changed\n${CHANGES}\n"
fi
if [[ -n "$DOCS" ]]; then
    SECTION+="\n### Documentation\n${DOCS}\n"
fi
if [[ -n "$CHORES" ]]; then
    SECTION+="\n### Maintenance\n${CHORES}\n"
fi
if [[ -n "$OTHER" ]]; then
    SECTION+="\n### Other\n${OTHER}\n"
fi

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "$SECTION"
    exit 0
fi

# Insert into CHANGELOG.md
# Find the [Unreleased] section and insert the new version section after it,
# preserving any existing [Unreleased] content by moving it into the new section.

if [[ ! -f "$CHANGELOG" ]]; then
    echo "ERROR: $CHANGELOG not found"
    exit 1
fi

# Extract any content currently under [Unreleased]
UNRELEASED_CONTENT="$(sed -n '/^## \[Unreleased\]/,/^## \[/p' "$CHANGELOG" | sed '1d;$d' | sed '/^$/d' || true)"

# Build replacement: [Unreleased] (empty) + new version section (with any old unreleased content)
REPLACEMENT="## [Unreleased]\n\n${SECTION}"

if [[ -n "$UNRELEASED_CONTENT" ]]; then
    # Append old unreleased content to the new version section
    REPLACEMENT="${REPLACEMENT}\n${UNRELEASED_CONTENT}"
fi

REPLACEMENT="${REPLACEMENT}\n"

# Use python for reliable multi-line replacement
python3 -c "
import re, sys
with open('$CHANGELOG', 'r') as f:
    content = f.read()

replacement = '''$REPLACEMENT'''

# Find the [Unreleased] block up to the next version header
pattern = r'## \[Unreleased\].*?(?=\n## \[\d+\.)'
content = re.sub(pattern, replacement.strip(), content, count=1, flags=re.DOTALL)

with open('$CHANGELOG', 'w') as f:
    f.write(content)
"

echo "CHANGELOG.md updated with version [${VERSION_NUM}] section."
