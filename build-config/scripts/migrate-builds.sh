#!/bin/bash

##############################################################################
# White Room Build Migration Script
#
# This script migrates existing build artifacts from scattered locations to
# the centralized .build/ directory structure.
#
# Usage: ./build-config/scripts/migrate-builds.sh [--dry-run] [--force]
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
DRY_RUN=false
FORCE=false
BACKUP_DIR="$PROJECT_ROOT/.build_backup_$(date +%Y%m%d_%H%M%S)"

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--dry-run] [--force]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}White Room Build Migration${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Function to migrate directory
migrate_dir() {
    local src="$1"
    local dest="$2"
    local description="$3"

    if [ ! -d "$src" ]; then
        return 0
    fi

    local size=$(du -sh "$src" 2>/dev/null | cut -f1)

    echo -e "${BLUE}Migrating:${NC} $description"
    echo "  Source: $src"
    echo "  Dest:   $dest"
    echo "  Size:   $size"

    if [ "$DRY_RUN" = false ]; then
        # Create destination directory
        mkdir -p "$dest"

        # Move contents
        if [ -d "$src" ]; then
            # Copy contents to destination
            cp -R "$src"/* "$dest"/ 2>/dev/null || true

            # Remove source if force is enabled
            if [ "$FORCE" = true ]; then
                rm -rf "$src"
                echo -e "${GREEN}  ✓ Moved and cleaned source${NC}"
            else
                echo -e "${YELLOW}  ✓ Copied (use --force to remove source)${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}  [Would migrate]${NC}"
    fi

    echo ""
}

# Function to find and migrate CMake build directories
migrate_cmake_builds() {
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Migrating CMake Build Directories${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    # Find all CMake build directories in juce_backend
    for cmake_build in "$PROJECT_ROOT"/juce_backend/*/build; do
        if [ -d "$cmake_build" ]; then
            plugin_name=$(basename "$(dirname "$cmake_build")")
            migrate_dir "$cmake_build" "$BUILD_ROOT/cmake/$plugin_name" "CMake: $plugin_name"
        fi
    done

    # Handle dsp_test_harness
    if [ -d "$PROJECT_ROOT/juce_backend/dsp_test_harness/build" ]; then
        migrate_dir "$PROJECT_ROOT/juce_backend/dsp_test_harness/build" \
                    "$BUILD_ROOT/cmake/dsp_test_harness" \
                    "CMake: dsp_test_harness"
    fi
}

# Function to migrate Xcode derived data (if found in project)
migrate_xcode() {
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Migrating Xcode Build Artifacts${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    # Xcode typically uses ~/Library/Developer/Xcode/DerivedData
    # We can't migrate those, but we can check for any local build directories

    # Check for any build directories in swift_frontend
    if [ -d "$PROJECT_ROOT/swift_frontend/build" ]; then
        migrate_dir "$PROJECT_ROOT/swift_frontend/build" \
                    "$BUILD_ROOT/swift/WhiteRoomiOS" \
                    "Swift: WhiteRoomiOS"
    fi
}

# Function to migrate Python artifacts
migrate_python() {
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Migrating Python Build Artifacts${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    # Find all __pycache__ directories
    while IFS= read -r pycache; do
        local relative_path="${pycache#$PROJECT_ROOT/}"
        local dest_dir="$BUILD_ROOT/python/__pycache__/$(dirname "$relative_path")"

        migrate_dir "$pycache" "$dest_dir" "Python: $relative_path"
    done < <(find "$PROJECT_ROOT" -type d -name "__pycache__" -not -path "*/.build/*" -not -path "*/node_modules/*")

    # Find dist directories
    while IFS= read -r dist_dir; do
        local relative_path="${dist_dir#$PROJECT_ROOT/}"
        migrate_dir "$dist_dir" "$BUILD_ROOT/python/dist/$(dirname "$relative_path")" "Python dist: $relative_path"
    done < <(find "$PROJECT_ROOT" -type d -name "dist" -not -path "*/.build/*" -not -path "*/node_modules/*")
}

# Function to migrate compiled artifacts
migrate_artifacts() {
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Migrating Compiled Artifacts${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    # Find .vst3 files
    while IFS= read -r vst3; do
        local basename=$(basename "$vst3")
        migrate_dir "$vst3" "$ARTIFACTS_ROOT/plugins/$basename" "VST3: $basename"
    done < <(find "$PROJECT_ROOT" -type d -name "*.vst3" -not -path "*/.build/*" -not -path "*/.artifacts/*")

    # Find .app files
    while IFS= read -r app; do
        local basename=$(basename "$app")
        # Determine platform based on path
        if [[ "$app" == *"iOS"* ]] || [[ "$app" == *"ios"* ]]; then
            migrate_dir "$app" "$ARTIFACTS_ROOT/ios/$basename" "App: $basename"
        else
            migrate_dir "$app" "$ARTIFACTS_ROOT/macos/$basename" "App: $basename"
        fi
    done < <(find "$PROJECT_ROOT" -type d -name "*.app" -not -path "*/.build/*" -not -path "*/.artifacts/*" -not -path "*/DerivedData/*")
}

# Function to create backup
create_backup() {
    if [ "$DRY_RUN" = true ]; then
        return
    fi

    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Creating Backup${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Backup .gitignore
    if [ -f "$PROJECT_ROOT/.gitignore" ]; then
        cp "$PROJECT_ROOT/.gitignore" "$BACKUP_DIR/gitignore.backup"
        echo -e "${GREEN}Backed up .gitignore${NC}"
    fi

    echo ""
    echo "Backup location: $BACKUP_DIR"
    echo ""
}

# Main migration flow
main() {
    # Check if .build exists
    if [ ! -d "$BUILD_ROOT" ]; then
        echo -e "${RED}Error: .build/ directory does not exist${NC}"
        echo "Run ./build-config/scripts/setup-builds.sh first"
        exit 1
    fi

    # Create backup
    create_backup

    # Run migrations
    migrate_cmake_builds
    migrate_xcode
    migrate_python
    migrate_artifacts

    # Summary
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Migration Summary${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}Dry run complete. No changes were made.${NC}"
        echo "Run without --dry-run to perform actual migration."
    else
        echo -e "${GREEN}Migration complete!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Review the migrated artifacts"
        echo "2. Test your builds to ensure everything works"
        echo "3. Run: ./build-config/scripts/validate-builds.sh"
        echo "4. If everything works, run with --force to clean old directories"

        if [ "$FORCE" = false ]; then
            echo ""
            echo "Note: Source directories were preserved."
            echo "Run with --force to remove them after verification."
        fi

        echo ""
        echo "Backup location: $BACKUP_DIR"
    fi

    echo ""
}

# Run main function
main
