#!/bin/bash

# Automated Release Script for Schillinger SDK
# Handles version bumping, changelog generation, and release creation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHANGELOG_FILE="CHANGELOG.md"
DRY_RUN=false
SKIP_TESTS=false
SKIP_BUILD=false
AUTO_PUSH=false
RELEASE_TYPE=""
PRERELEASE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            RELEASE_TYPE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --auto-push)
            AUTO_PUSH=true
            shift
            ;;
        --prerelease)
            PRERELEASE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --type TYPE      Release type (major|minor|patch|prerelease)"
            echo "  --dry-run        Show what would be done without making changes"
            echo "  --skip-tests     Skip running tests"
            echo "  --skip-build     Skip building packages"
            echo "  --auto-push      Automatically push changes and tags"
            echo "  --prerelease     Mark as prerelease"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$RELEASE_TYPE" ]]; then
    echo -e "${RED}❌ Release type is required. Use --type (major|minor|patch|prerelease)${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting Automated Release Process${NC}"
echo -e "${BLUE}Release Type: $RELEASE_TYPE${NC}"
echo -e "${BLUE}Prerelease: $PRERELEASE${NC}"
echo -e "${BLUE}Dry Run: $DRY_RUN${NC}"

# Check if we're in a clean git state
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Working directory is not clean. Please commit or stash changes.${NC}"
    exit 1
fi

# Check if we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo -e "${YELLOW}⚠️  Not on main/master branch. Current: $CURRENT_BRANCH${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "1.0.0")
echo -e "${BLUE}Current Version: $CURRENT_VERSION${NC}"

# Bump version
if [[ "$DRY_RUN" == true ]]; then
    NEW_VERSION=$(./scripts/version-manager.sh --bump "$RELEASE_TYPE" --dry-run | grep "Would update to version" | sed 's/.*Would update to version \([0-9.-]*\).*/\1/')
else
    ./scripts/version-manager.sh --bump "$RELEASE_TYPE"
    NEW_VERSION=$(cat VERSION)
fi

echo -e "${BLUE}New Version: $NEW_VERSION${NC}"

# Run tests if not skipped
if [[ "$SKIP_TESTS" == false ]]; then
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    if [[ "$DRY_RUN" == false ]]; then
        npm run test
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${YELLOW}🔍 DRY RUN: Would run tests${NC}"
    fi
fi

# Build packages if not skipped
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${YELLOW}🔨 Building packages...${NC}"
    if [[ "$DRY_RUN" == false ]]; then
        npm run build
        echo -e "${GREEN}✅ Build completed${NC}"
    else
        echo -e "${YELLOW}🔍 DRY RUN: Would build packages${NC}"
    fi
fi

# Generate changelog entry
generate_changelog_entry() {
    local version=$1
    local date=$(date +"%Y-%m-%d")
    
    echo "## [$version] - $date"
    echo ""
    
    # Get commits since last tag
    local last_tag=$(git tag -l "v*" | sort -V | tail -1)
    if [[ -n "$last_tag" ]]; then
        echo "### Changes"
        git log --pretty=format:"- %s" "$last_tag"..HEAD | grep -v "^- Merge" | head -20
    else
        echo "### Changes"
        echo "- Initial release"
    fi
    
    echo ""
    echo "### Features"
    git log --pretty=format:"- %s" "$last_tag"..HEAD | grep -i "feat\|add\|new" | head -10
    
    echo ""
    echo "### Bug Fixes"
    git log --pretty=format:"- %s" "$last_tag"..HEAD | grep -i "fix\|bug" | head -10
    
    echo ""
    echo "### Documentation"
    git log --pretty=format:"- %s" "$last_tag"..HEAD | grep -i "doc\|readme" | head -5
    
    echo ""
}

# Update changelog
if [[ "$DRY_RUN" == false ]]; then
    echo -e "${YELLOW}📝 Updating changelog...${NC}"
    
    # Create changelog if it doesn't exist
    if [[ ! -f "$CHANGELOG_FILE" ]]; then
        cat > "$CHANGELOG_FILE" << EOF
# Changelog

All notable changes to the Schillinger SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
    fi
    
    # Generate new entry
    NEW_ENTRY=$(generate_changelog_entry "$NEW_VERSION")
    
    # Insert new entry after the header
    {
        head -6 "$CHANGELOG_FILE"
        echo "$NEW_ENTRY"
        tail -n +7 "$CHANGELOG_FILE"
    } > "${CHANGELOG_FILE}.tmp" && mv "${CHANGELOG_FILE}.tmp" "$CHANGELOG_FILE"
    
    echo -e "${GREEN}✅ Changelog updated${NC}"
else
    echo -e "${YELLOW}🔍 DRY RUN: Would update changelog${NC}"
fi

# Commit changes
if [[ "$DRY_RUN" == false ]]; then
    echo -e "${YELLOW}📝 Committing changes...${NC}"
    git add .
    git commit -m "chore: release v$NEW_VERSION"
    echo -e "${GREEN}✅ Changes committed${NC}"
else
    echo -e "${YELLOW}🔍 DRY RUN: Would commit changes${NC}"
fi

# Create git tag
TAG_NAME="v$NEW_VERSION"
if [[ "$DRY_RUN" == false ]]; then
    echo -e "${YELLOW}🏷️  Creating tag $TAG_NAME...${NC}"
    
    # Create annotated tag with release notes
    RELEASE_NOTES="Release $NEW_VERSION

$(generate_changelog_entry "$NEW_VERSION" | tail -n +3)"
    
    git tag -a "$TAG_NAME" -m "$RELEASE_NOTES"
    echo -e "${GREEN}✅ Tag created${NC}"
else
    echo -e "${YELLOW}🔍 DRY RUN: Would create tag $TAG_NAME${NC}"
fi

# Push changes and tags
if [[ "$AUTO_PUSH" == true ]]; then
    if [[ "$DRY_RUN" == false ]]; then
        echo -e "${YELLOW}🚀 Pushing changes and tags...${NC}"
        git push origin "$CURRENT_BRANCH"
        git push origin "$TAG_NAME"
        echo -e "${GREEN}✅ Changes and tags pushed${NC}"
    else
        echo -e "${YELLOW}🔍 DRY RUN: Would push changes and tags${NC}"
    fi
else
    echo -e "${BLUE}📋 Manual push required:${NC}"
    echo -e "${YELLOW}  git push origin $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}  git push origin $TAG_NAME${NC}"
fi

# Display release summary
echo -e "${GREEN}🎉 Release process completed!${NC}"
echo -e "${BLUE}📋 Release Summary:${NC}"
echo -e "${YELLOW}  Version: $CURRENT_VERSION → $NEW_VERSION${NC}"
echo -e "${YELLOW}  Tag: $TAG_NAME${NC}"
echo -e "${YELLOW}  Branch: $CURRENT_BRANCH${NC}"

if [[ "$DRY_RUN" == false ]]; then
    echo -e "${BLUE}🔗 Next Steps:${NC}"
    echo -e "${GREEN}  1. Push changes: git push origin $CURRENT_BRANCH${NC}"
    echo -e "${GREEN}  2. Push tag: git push origin $TAG_NAME${NC}"
    echo -e "${GREEN}  3. Create GitHub release from tag${NC}"
    echo -e "${GREEN}  4. Publish packages: ./scripts/publish-all.sh${NC}"
fi