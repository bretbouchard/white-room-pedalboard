#!/bin/bash

# DAID Core Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Default to patch if no argument provided
VERSION_TYPE=${1:-patch}

echo "🚀 Starting DAID Core release process..."

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Please switch to main branch before releasing"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run tests
echo "🧪 Running tests..."
npm test

# Build the package
echo "🔨 Building package..."
npm run build

# Bump version
echo "📈 Bumping $VERSION_TYPE version..."
npm version $VERSION_TYPE

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"

# Push changes and tags
echo "📤 Pushing changes and tags..."
git push origin main
git push origin "v$NEW_VERSION"

echo "🎉 Release v$NEW_VERSION completed!"
echo "📦 GitHub Actions will automatically publish to GitHub Packages"
echo "🔗 Check the workflow at: https://github.com/schillinger/daid-core/actions"
