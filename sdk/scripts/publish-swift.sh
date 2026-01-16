#!/bin/bash

# Swift Package Manager Publishing Script for Schillinger SDK
# This script handles tagging and releasing the Swift package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SWIFT_PACKAGE_DIR="packages/swift"
DRY_RUN=false
SKIP_BUILD=false
SKIP_TESTS=false
FORCE_TAG=false
TAG_PREFIX="swift-v"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_TAG=true
            shift
            ;;
        --tag-prefix)
            TAG_PREFIX="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run      Perform a dry run without actually creating tags"
            echo "  --skip-build   Skip the build step"
            echo "  --skip-tests   Skip running tests"
            echo "  --force        Force create tag even if it exists"
            echo "  --tag-prefix   Custom tag prefix (default: swift-v)"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🍎 Starting Swift Package Publishing Process${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"

# Check if we're in the right directory
if [[ ! -d "$SWIFT_PACKAGE_DIR" ]]; then
    echo -e "${RED}❌ Swift package directory not found: $SWIFT_PACKAGE_DIR${NC}"
    exit 1
fi

# Check if required tools are installed
check_tool() {
    local tool=$1
    if ! command -v "$tool" &> /dev/null; then
        echo -e "${RED}❌ $tool is not installed. Please install it first.${NC}"
        exit 1
    fi
}

check_tool swift
check_tool git

echo -e "${GREEN}✅ Required tools verified${NC}"

# Change to Swift package directory
cd "$SWIFT_PACKAGE_DIR"

# Get package version from Package.swift or use git tags
get_package_version() {
    # Try to extract version from Package.swift if it exists
    if grep -q "version:" Package.swift 2>/dev/null; then
        grep "version:" Package.swift | sed 's/.*version: *"\([^"]*\)".*/\1/' | head -1
    else
        # Use semantic versioning based on git tags or default
        local latest_tag=$(git tag -l "${TAG_PREFIX}*" | sort -V | tail -1)
        if [[ -n "$latest_tag" ]]; then
            echo "${latest_tag#$TAG_PREFIX}"
        else
            echo "1.0.0"
        fi
    fi
}

PACKAGE_VERSION=$(get_package_version)
TAG_NAME="${TAG_PREFIX}${PACKAGE_VERSION}"

echo -e "${BLUE}📦 Package Version: ${PACKAGE_VERSION}${NC}"
echo -e "${BLUE}🏷️  Tag Name: ${TAG_NAME}${NC}"

# Check if tag already exists
if git tag -l | grep -q "^${TAG_NAME}$"; then
    if [[ "$FORCE_TAG" == false ]]; then
        echo -e "${YELLOW}⚠️  Tag ${TAG_NAME} already exists${NC}"
        if [[ "$DRY_RUN" == false ]]; then
            echo -e "${RED}❌ Cannot create existing tag. Use --force to override or update version.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Tag ${TAG_NAME} exists but will be overridden${NC}"
    fi
fi

# Build package if not skipped
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${YELLOW}🔨 Building Swift package...${NC}"
    swift build
    echo -e "${GREEN}✅ Build completed successfully${NC}"
fi

# Run tests if not skipped
if [[ "$SKIP_TESTS" == false ]]; then
    echo -e "${YELLOW}🧪 Running Swift tests...${NC}"
    swift test
    echo -e "${GREEN}✅ Tests passed${NC}"
fi

# Validate package
echo -e "${YELLOW}🔍 Validating Swift package...${NC}"
swift package validate

# Check package dependencies
echo -e "${YELLOW}📋 Resolving package dependencies...${NC}"
swift package resolve

echo -e "${GREEN}✅ Package validation completed${NC}"

# Create git tag and push
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}🔍 DRY RUN: Would create tag ${TAG_NAME}${NC}"
    echo -e "${YELLOW}Package would be available at:${NC}"
    echo -e "${BLUE}  Repository: $(git remote get-url origin 2>/dev/null || echo 'No remote origin set')${NC}"
    echo -e "${BLUE}  Tag: ${TAG_NAME}${NC}"
else
    # Ensure we're on the main branch and up to date
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${BLUE}📍 Current branch: ${CURRENT_BRANCH}${NC}"
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        echo -e "${RED}❌ There are uncommitted changes. Please commit or stash them first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🏷️  Creating tag ${TAG_NAME}...${NC}"
    
    # Create annotated tag with release notes
    git tag -a "$TAG_NAME" -m "Release ${PACKAGE_VERSION}

Swift Package Manager release for Schillinger SDK

Features:
- Mathematical pattern generation for rhythm, melody, and harmony
- Real-time audio processing capabilities
- Comprehensive music analysis tools
- iOS/macOS native integration
- Core Audio and AVFoundation support

Installation:
Add to your Package.swift dependencies:
.package(url: \"$(git remote get-url origin)\", from: \"${PACKAGE_VERSION}\")

Documentation: https://docs.schillinger.ai/sdk/swift"
    
    echo -e "${GREEN}🚀 Pushing tag to remote...${NC}"
    git push origin "$TAG_NAME"
    
    echo -e "${GREEN}✅ Successfully published Swift package${NC}"
    echo -e "${BLUE}🔗 Package available at: $(git remote get-url origin)${NC}"
    echo -e "${BLUE}🏷️  Tag: ${TAG_NAME}${NC}"
fi

# Generate Package.swift template for consumers
cat > Package.swift.template << EOF
// Swift Package Manager integration example
// Add this to your Package.swift dependencies array:

.package(url: "$(git remote get-url origin 2>/dev/null || echo 'https://github.com/schillinger-system/sdk')", from: "${PACKAGE_VERSION}")

// Then add to your target dependencies:
.product(name: "SchillingerSDK", package: "sdk")
EOF

echo -e "${BLUE}📋 Package.swift template created${NC}"

# Return to root directory
cd ../..

echo -e "${GREEN}🎉 Swift package publishing process completed successfully!${NC}"

# Display usage instructions
echo -e "${BLUE}📖 Usage Instructions:${NC}"
echo -e "${GREEN}  1. Add to Package.swift dependencies:${NC}"
echo -e "${YELLOW}     .package(url: \"$(cd "$SWIFT_PACKAGE_DIR" && git remote get-url origin 2>/dev/null || echo 'https://github.com/schillinger-system/sdk')\", from: \"${PACKAGE_VERSION}\")${NC}"
echo -e "${GREEN}  2. Import in your Swift files:${NC}"
echo -e "${YELLOW}     import SchillingerSDK${NC}"
echo -e "${GREEN}  3. Initialize the SDK:${NC}"
echo -e "${YELLOW}     let sdk = SchillingerSDK(apiKey: \"your-api-key\")${NC}"