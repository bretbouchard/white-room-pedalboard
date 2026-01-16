#!/bin/bash

##############################################################################
# White Room Build Cleanup Script
#
# This script cleans all build artifacts from the centralized .build/ directory.
#
# Usage: ./build-config/scripts/clean-builds.sh [--all] [--dry-run]
#
# Options:
#   --all       Clean everything including artifacts
#   --dry-run   Show what would be cleaned without actually cleaning
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Build directories
BUILD_ROOT="$PROJECT_ROOT/.build"
ARTIFACTS_ROOT="$PROJECT_ROOT/.artifacts"

# Parse arguments
CLEAN_ALL=false
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --all)
            CLEAN_ALL=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--all] [--dry-run]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}White Room Build Cleanup${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Function to get directory size
get_size() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sh "$dir" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

# Function to clean directory
clean_dir() {
    local dir="$1"
    local description="$2"

    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}Skipping (not found): $description${NC}"
        return
    fi

    local size=$(get_size "$dir")
    echo -e "${BLUE}Cleaning:${NC} $description"
    echo "  Path: $dir"
    echo "  Size: $size"

    if [ "$DRY_RUN" = false ]; then
        rm -rf "$dir"
        echo -e "${GREEN}  ✓ Cleaned${NC}"
    else
        echo -e "${YELLOW}  [Would clean]${NC}"
    fi

    echo ""
}

# Main cleanup flow
echo -e "${BLUE}Build Artifacts to Clean${NC}"
echo "============================================================="
echo ""

# Clean build intermediates
clean_dir "$BUILD_ROOT/xcode" "Xcode build intermediates"
clean_dir "$BUILD_ROOT/cmake" "CMake build intermediates"
clean_dir "$BUILD_ROOT/swift" "Swift Package Manager builds"
clean_dir "$BUILD_ROOT/python" "Python build artifacts"
clean_dir "$BUILD_ROOT/node" "Node.js cache"
clean_dir "$BUILD_ROOT/temp" "Temporary build files"

# Clean artifacts if --all is specified
if [ "$CLEAN_ALL" = true ]; then
    echo -e "${BLUE}Build Outputs${NC}"
    echo "============================================================="
    echo ""

    clean_dir "$ARTIFACTS_ROOT/ios" "iOS artifacts"
    clean_dir "$ARTIFACTS_ROOT/macos" "macOS artifacts"
    clean_dir "$ARTIFACTS_ROOT/plugins" "Plugin artifacts"
    clean_dir "$ARTIFACTS_ROOT/packages" "Package artifacts"
else
    echo -e "${YELLOW}Note: Use --all to also clean .artifacts/ (binaries, plugins)${NC}"
    echo ""
fi

# Summary
echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}Cleanup Summary${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Dry run complete. No changes were made.${NC}"
    echo "Run without --dry-run to perform actual cleanup."
else
    echo -e "${GREEN}Cleanup complete!${NC}"
    echo ""
    echo "Build directories cleaned."
    echo "Next build will recreate necessary directories."

    if [ "$CLEAN_ALL" = false ]; then
        echo ""
        echo "Note: Artifacts (.artifacts/) were preserved."
        echo "Use --all to clean everything including compiled binaries."
    fi
fi

echo ""
