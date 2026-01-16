#!/bin/bash

# Master Distribution Script for Schillinger SDK
# This script orchestrates publishing across all platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
SKIP_TESTS=false
PLATFORMS=("npm" "pypi" "swift" "cpp")
SELECTED_PLATFORMS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --platform)
            IFS=',' read -ra SELECTED_PLATFORMS <<< "$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run      Perform a dry run without actually publishing"
            echo "  --skip-tests   Skip running tests for all platforms"
            echo "  --platform     Comma-separated list of platforms (npm,pypi,swift,cpp)"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Use selected platforms or default to all
if [[ ${#SELECTED_PLATFORMS[@]} -eq 0 ]]; then
    SELECTED_PLATFORMS=("${PLATFORMS[@]}")
fi

echo -e "${BLUE}🚀 Starting Multi-Platform Publishing Process${NC}"
echo -e "${BLUE}Platforms: ${SELECTED_PLATFORMS[*]}${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"

# Build common arguments
COMMON_ARGS=""
if [[ "$DRY_RUN" == true ]]; then
    COMMON_ARGS="$COMMON_ARGS --dry-run"
fi
if [[ "$SKIP_TESTS" == true ]]; then
    COMMON_ARGS="$COMMON_ARGS --skip-tests"
fi

# Function to run platform-specific publishing
publish_platform() {
    local platform=$1
    echo -e "${BLUE}📦 Publishing to ${platform}...${NC}"
    
    case $platform in
        npm)
            ./scripts/publish-npm.sh $COMMON_ARGS
            ;;
        pypi)
            ./scripts/publish-pypi.sh $COMMON_ARGS
            ;;
        swift)
            ./scripts/publish-swift.sh $COMMON_ARGS
            ;;
        cpp)
            ./scripts/publish-cpp.sh $COMMON_ARGS
            ;;
        *)
            echo -e "${RED}❌ Unknown platform: $platform${NC}"
            return 1
            ;;
    esac
}

# Publish to each selected platform
for platform in "${SELECTED_PLATFORMS[@]}"; do
    if publish_platform "$platform"; then
        echo -e "${GREEN}✅ Successfully published to $platform${NC}"
    else
        echo -e "${RED}❌ Failed to publish to $platform${NC}"
        exit 1
    fi
done

echo -e "${GREEN}🎉 Multi-platform publishing completed successfully!${NC}"