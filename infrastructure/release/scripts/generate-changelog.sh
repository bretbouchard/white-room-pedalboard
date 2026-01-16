#!/bin/bash
# White Room DAW - Changelog Generator
# Generates changelog from git history

set -e

VERSION="${1:-1.0.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CHANGELOG_FILE="$PROJECT_ROOT/CHANGELOG.md"
TEMP_CHANGELOG="/tmp/changelog-$VERSION.md"

echo "Generating changelog for v${VERSION}..."

# Get last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

echo "# White Room DAW $VERSION Release Notes" > "$TEMP_CHANGELOG"
echo "" >> "$TEMP_CHANGELOG"
echo "**Release Date**: $(date +%Y-%m-%d)" >> "$TEMP_CHANGELOG"
echo "" >> "$TEMP_CHANGELOG"

echo "## What's New" >> "$TEMP_CHANGELOG"
echo "" >> "$TEMP_CHANGELOG"

# Get commits since last tag
if [ -n "$LAST_TAG" ]; then
    COMMITS=$(git log $LAST_TAG..HEAD --pretty=format:"%h|%s|%an|%ad" --date=short)
else
    COMMITS=$(git log --pretty=format:"%h|%s|%an|%ad" --date=short)
fi

# Categorize commits
echo "### Features" >> "$TEMP_CHANGELOG"
echo "$COMMITS" | grep -i "^.*|feat:" | while IFS='|' read -r hash subject author date; do
    echo "- ${subject#feat: } ([\`$hash\`](https://github.com/schillinger/white_room/commit/$hash))" >> "$TEMP_CHANGELOG"
done
echo "" >> "$TEMP_CHANGELOG"

echo "### Bug Fixes" >> "$TEMP_CHANGELOG"
echo "$COMMITS" | grep -i "^.*|fix:" | while IFS='|' read -r hash subject author date; do
    echo "- ${subject#fix: } ([\`$hash\`](https://github.com/schillinger/white_room/commit/$hash))" >> "$TEMP_CHANGELOG"
done
echo "" >> "$TEMP_CHANGELOG"

echo "### Improvements" >> "$TEMP_CHANGELOG"
echo "$COMMITS" | grep -iE "^.*|(refactor|perf|style|test|docs|chore):" | while IFS='|' read -r hash subject author date; do
    echo "- ${subject#*: } ([\`$hash\`](https://github.com/schillinger/white_room/commit/$hash))" >> "$TEMP_CHANGELOG"
done
echo "" >> "$TEMP_CHANGELOG"

echo "## Contributors" >> "$TEMP_CHANGELOG"
echo "" >> "$TEMP_CHANGELOG"
echo "$COMMITS" | awk -F'|' '{print $3}' | sort -u | while read -r author; do
    echo "- $author" >> "$TEMP_CHANGELOG"
done
echo "" >> "$TEMP_CHANGELOG"

echo "## Full Changelog" >> "$TEMP_CHANGELOG"
echo "" >> "$TEMP_CHANGELOG"
echo "For full commit history, see [v$VERSION on GitHub](https://github.com/schillinger/white_room/commits/v$VERSION)." >> "$TEMP_CHANGELOG"

# Prepend to existing changelog
if [ -f "$CHANGELOG_FILE" ]; then
    tail -n +2 "$CHANGELOG_FILE" >> "$TEMP_CHANGELOG"
fi

# Move temp changelog to main changelog
mv "$TEMP_CHANGELOG" "$CHANGELOG_FILE"

echo "✓ Changelog generated: $CHANGELOG_FILE"
