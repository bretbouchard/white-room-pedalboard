#!/bin/bash

##############################################################################
# White Room Build Validation Script
#
# This script validates that all build artifacts are in the centralized
# .build/ directory and reports any violations.
#
# Usage: ./build-config/scripts/validate-builds.sh [--exit-code]
#
# Exit codes:
#   0 - No violations found
#   1 - Violations found
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

# Parse arguments
EXIT_CODE=false
for arg in "$@"; do
    case $arg in
        --exit-code)
            EXIT_CODE=true
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--exit-code]"
            exit 1
            ;;
    esac
done

# Violation counter
VIOLATIONS=0

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}White Room Build Validation${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Function to check for violation
check_violation() {
    local path="$1"
    local description="$2"

    if [ -e "$path" ]; then
        echo -e "${RED}❌ VIOLATION:${NC} $description"
        echo "   Path: $path"
        VIOLATIONS=$((VIOLATIONS + 1))
        return 1
    else
        return 0
    fi
}

# Function to check for violations in a directory
check_directory_violations() {
    local base_dir="$1"
    local description="$2"

    # Skip if doesn't exist
    [ ! -d "$base_dir" ] && return 0

    echo -e "${BLUE}Checking:${NC} $description"

    # Check for build directories
    while IFS= read -r build_dir; do
        # Skip if it's in .build or .artifacts
        if [[ "$build_dir" == */.build/* ]] || [[ "$build_dir" == */.artifacts/* ]]; then
            continue
        fi

        # Skip node_modules
        if [[ "$build_dir" == */node_modules/* ]]; then
            continue
        fi

        check_violation "$build_dir" "Build directory in $description"
    done < <(find "$base_dir" -maxdepth 2 -type d -name "build" -o -name "cmake-build-*")

    # Check for __pycache__
    while IFS= read -r pycache; do
        if [[ "$pycache" == */.build/* ]] || [[ "$pycache" == */.artifacts/* ]]; then
            continue
        fi
        if [[ "$pycache" == */node_modules/* ]]; then
            continue
        fi
        check_violation "$pycache" "Python cache in $description"
    done < <(find "$base_dir" -maxdepth 3 -type d -name "__pycache__")

    # Check for dist directories
    while IFS= read -r dist_dir; do
        if [[ "$dist_dir" == */.build/* ]] || [[ "$dist_dir" == */.artifacts/* ]]; then
            continue
        fi
        if [[ "$dist_dir" == */node_modules/* ]]; then
            continue
        fi
        check_violation "$dist_dir" "Python dist in $description"
    done < <(find "$base_dir" -maxdepth 3 -type d -name "dist")

    echo ""
}

# Function to check for CMake artifacts
check_cmake_artifacts() {
    echo -e "${BLUE}Checking:${NC} CMake artifacts"

    # Check for CMakeCache.txt outside .build
    while IFS= read -r cmake_cache; do
        if [[ "$cmake_cache" == */.build/* ]]; then
            continue
        fi
        check_violation "$cmake_cache" "CMake cache file"
    done < <(find "$PROJECT_ROOT" -name "CMakeCache.txt" -not -path "*/.build/*" -not -path "*/node_modules/*")

    # Check for CMakeFiles directories
    while IFS= read -r cmake_files; do
        if [[ "$cmake_files" == */.build/* ]]; then
            continue
        fi
        check_violation "$cmake_files" "CMake files directory"
    done < <(find "$PROJECT_ROOT" -type d -name "CMakeFiles" -not -path "*/.build/*" -not -path "*/node_modules/*")

    echo ""
}

# Function to check for Xcode artifacts
check_xcode_artifacts() {
    echo -e "${BLUE}Checking:${NC} Xcode artifacts"

    # Check for DerivedData in project root
    if [ -d "$PROJECT_ROOT/DerivedData" ]; then
        check_violation "$PROJECT_ROOT/DerivedData" "DerivedData in project root"
    fi

    # Check for .xcuserstate files
    while IFS= read -r xcuserstate; do
        check_violation "$xcuserstate" "Xcode user state file"
    done < <(find "$PROJECT_ROOT" -name "*.xcuserstate" -not -path "*/.build/*")

    echo ""
}

# Function to check for compiled binaries in wrong locations
check_binary_artifacts() {
    echo -e "${BLUE}Checking:${NC} Compiled binaries"

    # Check for .vst3 files outside .artifacts
    while IFS= read -r vst3; do
        if [[ "$vst3" == */.artifacts/* ]]; then
            continue
        fi
        if [[ "$vst3" == */.build/* ]]; then
            continue
        fi
        check_violation "$vst3" "VST3 plugin outside .artifacts/"
    done < <(find "$PROJECT_ROOT" -type d -name "*.vst3" -not -path "*/.build/*" -not -path "*/.artifacts/*")

    # Check for .app files outside .artifacts
    while IFS= read -r app; do
        if [[ "$app" == */.artifacts/* ]]; then
            continue
        fi
        if [[ "$app" == */.build/* ]]; then
            continue
        fi
        if [[ "$app" == */DerivedData/* ]]; then
            continue
        fi
        check_violation "$app" "App bundle outside .artifacts/"
    done < <(find "$PROJECT_ROOT" -type d -name "*.app" -not -path "*/.build/*" -not -path "*/.artifacts/*" -not -path "*/DerivedData/*")

    echo ""
}

# Function to check .gitignore compliance
check_gitignore() {
    echo -e "${BLUE}Checking:${NC} .gitignore compliance"

    if ! grep -q "^\.build/$" "$PROJECT_ROOT/.gitignore"; then
        echo -e "${YELLOW}⚠ WARNING:${NC} .build/ not in .gitignore"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    if ! grep -q "^\.artifacts/$" "$PROJECT_ROOT/.gitignore"; then
        echo -e "${YELLOW}⚠ WARNING:${NC} .artifacts/ not in .gitignore"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    echo ""
}

# Main validation flow
main() {
    # Check if .build exists
    if [ ! -d "$PROJECT_ROOT/.build" ]; then
        echo -e "${RED}❌ ERROR:${NC} .build/ directory does not exist"
        echo "Run ./build-config/scripts/setup-builds.sh first"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # Check if .artifacts exists
    if [ ! -d "$PROJECT_ROOT/.artifacts" ]; then
        echo -e "${YELLOW}⚠ WARNING:${NC} .artifacts/ directory does not exist"
        echo "Run ./build-config/scripts/setup-builds.sh first"
    fi

    echo ""

    # Run checks
    check_directory_violations "$PROJECT_ROOT/juce_backend" "JUCE backend"
    check_directory_violations "$PROJECT_ROOT/swift_frontend" "Swift frontend"
    check_directory_violations "$PROJECT_ROOT/sdk" "SDK"
    check_directory_violations "$PROJECT_ROOT/ios" "iOS"

    check_cmake_artifacts
    check_xcode_artifacts
    check_binary_artifacts
    check_gitignore

    # Print summary
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}Validation Summary${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""

    if [ $VIOLATIONS -eq 0 ]; then
        echo -e "${GREEN}✓ No violations found!${NC}"
        echo "All build artifacts are properly centralized in .build/ or .artifacts/"
        echo ""

        if [ "$EXIT_CODE" = true ]; then
            exit 0
        fi
    else
        echo -e "${RED}✗ Found $VIOLATIONS violation(s)${NC}"
        echo ""
        echo "To fix violations:"
        echo "1. Run: ./build-config/scripts/migrate-builds.sh --dry-run"
        echo "2. Review what will be migrated"
        echo "3. Run: ./build-config/scripts/migrate-builds.sh"
        echo "4. Run: ./build-config/scripts/validate-builds.sh again"
        echo ""

        if [ "$EXIT_CODE" = true ]; then
            exit 1
        fi
    fi
}

# Run main function
main
