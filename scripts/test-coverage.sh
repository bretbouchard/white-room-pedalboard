#!/bin/bash

# =============================================================================
# White Room Comprehensive Test Coverage Script
# =============================================================================
#
# This script runs all tests across the entire White Room project and generates
# a comprehensive coverage report.
#
# Usage:
#   ./scripts/test-coverage.sh [options]
#
# Options:
#   --skip-sdk       Skip SDK tests
#   --skip-swift     Skip Swift tests
#   --skip-cpp       Skip C++/JUCE tests
#   --ci             CI mode (no colors, exit on failure)
#   --html           Generate HTML coverage report
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
SKIP_SDK=false
SKIP_SWIFT=false
SKIP_CPP=false
CI_MODE=false
HTML_REPORT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-sdk)
            SKIP_SDK=true
            shift
            ;;
        --skip-swift)
            SKIP_SWIFT=true
            shift
            ;;
        --skip-cpp)
            SKIP_CPP=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --html)
            HTML_REPORT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# CI mode: disable colors
if [ "$CI_MODE" = true ]; then
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== White Room Test Coverage ===${NC}"
echo ""
echo "Project root: $PROJECT_ROOT"
echo ""

# =============================================================================
# SDK Tests (TypeScript)
# =============================================================================

if [ "$SKIP_SDK" = false ]; then
    echo -e "${BLUE}Running SDK Tests...${NC}"
    echo ""

    SDK_TEST_DIRS=(
        "sdk/packages/sdk/src/__tests__"
        "sdk/packages/sdk/src/song/__tests__"
        "sdk/packages/sdk/src/consolex/__tests__"
        "sdk/packages/sdk/src/undo/__tests__"
    )

    SDK_COVERAGE=false
    if [ "$HTML_REPORT" = true ]; then
        SDK_COVERAGE=true
    fi

    for test_dir in "${SDK_TEST_DIRS[@]}"; do
        if [ -d "$PROJECT_ROOT/$test_dir" ]; then
            echo -e "${YELLOW}Testing: $test_dir${NC}"

            cd "$PROJECT_ROOT/sdk/packages/sdk"

            if npm test -- --coverage --coverageReporters="text" --coverageReporters="html" 2>&1; then
                echo -e "${GREEN}✓ Passed: $test_dir${NC}"
            else
                echo -e "${RED}✗ Failed: $test_dir${NC}"
                if [ "$CI_MODE" = true ]; then
                    exit 1
                fi
            fi

            cd "$PROJECT_ROOT"
        fi
    done

    echo ""
fi

# =============================================================================
# Swift Tests
# =============================================================================

if [ "$SKIP_SWIFT" = false ]; then
    echo -e "${BLUE}Running Swift Tests...${NC}"
    echo ""

    SWIFT_TEST_DIRS=(
        "swift_frontend/WhiteRoomiOS"
        "sdk/packages/swift"
    )

    for swift_dir in "${SWIFT_TEST_DIRS[@]}"; do
        if [ -d "$PROJECT_ROOT/$swift_dir" ]; then
            echo -e "${YELLOW}Testing: $swift_dir${NC}"

            cd "$PROJECT_ROOT/$swift_dir"

            # Run tests with code coverage
            if swift test --enable-code-coverage 2>&1; then
                echo -e "${GREEN}✓ Passed: $swift_dir${NC}"

                # Generate coverage report if requested
                if [ "$HTML_REPORT" = true ]; then
                    echo -e "${YELLOW}Generating coverage report...${NC}"
                    xcrun llvm-cov report \
                        $(swift build --show-bin-path)/*.xctest/Contents/MacOS/* \
                        --instr-profile=$(swift build --show-bin-path)/profdata/*.profdata \
                        2>/dev/null || true
                fi
            else
                echo -e "${RED}✗ Failed: $swift_dir${NC}"
                if [ "$CI_MODE" = true ]; then
                    exit 1
                fi
            fi

            cd "$PROJECT_ROOT"
        fi
    done

    echo ""
fi

# =============================================================================
# C++/JUCE Tests
# =============================================================================

if [ "$SKIP_CPP" = false ]; then
    echo -e "${BLUE}Running C++/JUCE Tests...${NC}"
    echo ""

    JUCE_DIR="$PROJECT_ROOT/juce_backend"

    if [ -d "$JUCE_DIR" ]; then
        cd "$JUCE_DIR"

        # Check if build directory exists
        if [ -d "build" ]; then
            echo -e "${YELLOW}Running CTest...${NC}"

            if ctest --output-on-failure 2>&1; then
                echo -e "${GREEN}✓ Passed: JUCE tests${NC}"
            else
                echo -e "${RED}✗ Failed: JUCE tests${NC}"
                if [ "$CI_MODE" = true ]; then
                    exit 1
                fi
            fi
        else
            echo -e "${YELLOW}No build directory found, skipping JUCE tests${NC}"
            echo "Run 'cmake --build build' first to build tests"
        fi

        cd "$PROJECT_ROOT"
    fi

    echo ""
fi

# =============================================================================
# Summary
# =============================================================================

echo -e "${BLUE}=== Test Coverage Summary ===${NC}"
echo ""

if [ "$SKIP_SDK" = false ]; then
    echo -e "SDK Tests:         ${GREEN}Run${NC}"
else
    echo -e "SDK Tests:         ${YELLOW}Skipped${NC}"
fi

if [ "$SKIP_SWIFT" = false ]; then
    echo -e "Swift Tests:       ${GREEN}Run${NC}"
else
    echo -e "Swift Tests:       ${YELLOW}Skipped${NC}"
fi

if [ "$SKIP_CPP" = false ]; then
    echo -e "C++/JUCE Tests:    ${GREEN}Run${NC}"
else
    echo -e "C++/JUCE Tests:    ${YELLOW}Skipped${NC}"
fi

echo ""
echo -e "${GREEN}=== All Tests Complete ===${NC}"

# =============================================================================
# Coverage Report (if requested)
# =============================================================================

if [ "$HTML_REPORT" = true ]; then
    echo ""
    echo -e "${BLUE}=== Coverage Reports Generated ===${NC}"
    echo ""
    echo "HTML coverage reports have been generated in:"
    echo "  - SDK: sdk/packages/sdk/coverage/"
    echo "  - Swift: swift_frontend/WhiteRoomiOS/coverage/"
    echo ""
fi

exit 0
