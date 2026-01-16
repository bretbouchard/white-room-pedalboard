#!/bin/bash

# Build script for LocalGalDSP Test
# Standalone compilation for testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build_simple"

echo "Building LocalGalDSP Test..."
echo "Project Root: $PROJECT_ROOT"
echo "Build Dir: $BUILD_DIR"

# Compile test
g++ -std=c++17 \
    -DDEBUG=1 \
    -I"$PROJECT_ROOT/external/JUCE/modules" \
    -I"$PROJECT_ROOT" \
    -I"$PROJECT_ROOT/tests" \
    -I"$PROJECT_ROOT/include" \
    -I"$PROJECT_ROOT/src" \
    -I"$BUILD_DIR/SchillingerEcosystemWorkingDAW_artefacts" \
    "$SCRIPT_DIR/LocalGalDSPTest.cpp" \
    "$PROJECT_ROOT/src/dsp/LocalGalDSP.cpp" \
    -o "$SCRIPT_DIR/local_gal_dsp_test" \
    $(find "$PROJECT_ROOT/external/JUCE/modules" -name "*.cpp" | grep -E "(juce_core|juce_audio_basics|juce_audio_processors|juce_dsp)" | head -20) \
    -framework CoreAudio -framework CoreMIDI -framework Cocoa

echo "✅ Build complete: $SCRIPT_DIR/local_gal_dsp_test"
echo ""
echo "Run test with: $SCRIPT_DIR/local_gal_dsp_test"
