#!/bin/bash

# Build script for Comprehensive Integration Tests
# Tests all 9 instruments with Phases 1-3 improvements

set -e  # Exit on error

echo "=========================================="
echo "Comprehensive Integration Tests Build"
echo "=========================================="

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
TEST_DIR="$SCRIPT_DIR"

# Compiler settings
CXX="${CXX:-clang++}"
CXXFLAGS="-std=c++17 -O2 -Wall -Wextra"
INCLUDES="-I$PROJECT_ROOT/include -I$PROJECT_ROOT/external/JUCE/modules"

# JUCE modules needed
JUCE_MODULES=(
    "juce_core"
    "juce_audio_basics"
    "juce_dsp"
)

echo ""
echo "Configuration:"
echo "  Compiler: $CXX"
echo "  Build dir: $BUILD_DIR"
echo "  Test dir: $TEST_DIR"
echo ""

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Check if JUCE exists
JUCE_PATH="$PROJECT_ROOT/external/JUCE"
if [ ! -d "$JUCE_PATH" ]; then
    echo "ERROR: JUCE not found at $JUCE_PATH"
    echo "Please ensure JUCE is present in external/JUCE"
    exit 1
fi

echo "✓ JUCE found at $JUCE_PATH"

# Source files for comprehensive test
TEST_SOURCE="$TEST_DIR/ComprehensiveIntegrationTests.cpp"
OUTPUT_BINARY="$BUILD_DIR/comprehensive_integration_tests"

echo ""
echo "Building comprehensive integration tests..."
echo "  Source: $TEST_SOURCE"
echo "  Output: $OUTPUT_BINARY"
echo ""

# Build command
BUILD_CMD="$CXX $CXXFLAGS $INCLUDES \"$TEST_SOURCE\" -o \"$OUTPUT_BINARY\""

echo "Executing:"
echo "  $BUILD_CMD"
echo ""

# Execute build
eval $BUILD_CMD

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Build successful!"
    echo "=========================================="
    echo ""
    echo "Binary location: $OUTPUT_BINARY"
    echo ""
    echo "To run tests:"
    echo "  cd $BUILD_DIR"
    echo "  ./comprehensive_integration_tests"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "✗ Build failed!"
    echo "=========================================="
    echo ""
    echo "Troubleshooting:"
    echo "  1. Ensure all instrument source files are compiled"
    echo "  2. Check that include paths are correct"
    echo "  3. Verify JUCE modules are accessible"
    echo "  4. Try building individual instrument tests first"
    echo ""
    exit 1
fi
