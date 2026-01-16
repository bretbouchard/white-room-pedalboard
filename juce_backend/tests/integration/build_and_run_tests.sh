#!/bin/bash

# Quick build and run script for Comprehensive Integration Tests
# This script compiles and runs the tests in one go

set -e

echo "=========================================="
echo "Comprehensive Integration Test Runner"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"

cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Check if we need to build using cmake or direct compilation
if [ -f "$BUILD_DIR/Makefile" ]; then
    echo "Using existing CMake build..."
    cd "$BUILD_DIR"

    # Try to add the comprehensive test to the build
    echo ""
    echo "Attempting to build with CMake..."
    echo ""

    # For now, let's create a simple standalone test binary
    cd "$PROJECT_ROOT"
fi

echo "Building comprehensive integration test..."

# Compiler
CXX="${CXX:-clang++}"

# Compilation flags
CXXFLAGS="-std=c++17 -O2 -Wall -Iinclude -Iexternal/JUCE/modules"

# Output
OUTPUT="$BUILD_DIR/comprehensive_test"

# Source
SOURCE="tests/integration/ComprehensiveIntegrationTests.cpp"

echo ""
echo "Compiler: $CXX"
echo "Flags: $CXXFLAGS"
echo "Source: $SOURCE"
echo "Output: $OUTPUT"
echo ""

# Check if source exists
if [ ! -f "$SOURCE" ]; then
    echo "ERROR: Source file not found: $SOURCE"
    exit 1
fi

# Compile
echo "Compiling..."
$CXX $CXXFLAGS "$SOURCE" -o "$OUTPUT"

if [ $? -eq 0 ]; then
    echo "✓ Compilation successful!"
    echo ""
    echo "Running tests..."
    echo "=========================================="
    echo ""

    # Run the test
    "$OUTPUT"

    echo ""
    echo "=========================================="
    echo "Test execution complete"
    echo "=========================================="
else
    echo "✗ Compilation failed"
    echo ""
    echo "Note: This test requires all instrument DSP implementations"
    echo "to be linked. For now, this is a demonstration of the test"
    echo "structure. To run full tests, use the individual instrument"
    echo "test suites in tests/dsp/"
fi
