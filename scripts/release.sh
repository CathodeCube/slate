#!/usr/bin/env bash
set -euo pipefail

# Usage: bin/release.sh [patch|minor|major]
#
# Increments the package version, updates the `latest` git tag to point to
# the newly created release commit, and pushes everything to origin.
#
# Examples:
#   bin/release.sh patch   # 0.1.0 → 0.1.1
#   bin/release.sh minor   # 0.1.0 → 0.2.0
#   bin/release.sh major   # 0.1.0 → 1.0.0

BUMP_TYPE="${1:?Usage: bin/release.sh [patch|minor|major]}"

case "$BUMP_TYPE" in
  patch|minor|major) ;;
  *)
    echo "Error: unknown bump type '$BUMP_TYPE'. Expected patch, minor, or major." >&2
    exit 1
    ;;
esac

# Step 1: Bump version (commits + tags the new version)
echo "Bumping version ($BUMP_TYPE)..."
npm version "$BUMP_TYPE" -m "Release: v%s"

# Step 2: Update the `latest` tag to point to the new release commit
NEW_TAG=$(git describe --tags --abbrev=0)
echo "Updating 'latest' tag to $NEW_TAG..."
git tag -f latest
git push origin latest --force

# Step 3: Push the version commit and tag
git push origin main --follow-tags

echo "Done! Released $NEW_TAG"
