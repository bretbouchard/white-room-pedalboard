#!/bin/bash

# Build script for Aether Giant Percussion Test
# Compile Objective-C separately

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build_test"

echo "Building Aether Giant Percussion Test..."
echo "Project Root: $PROJECT_ROOT"
echo "Build Dir: $BUILD_DIR"

mkdir -p "$BUILD_DIR"

# Compile Objective-C files
echo "Compiling Objective-C files..."
clang++ -std=c++17 -x objective-c++ \
    -DDEBUG=1 \
    -DJUCE_UNIT_TESTS=1 \
    -DJUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1 \
    -I"$PROJECT_ROOT/external/JUCE/modules" \
    -I"$PROJECT_ROOT/include" \
    -I"$PROJECT_ROOT/instruments/giant_instruments/include" \
    -c "$PROJECT_ROOT/external/JUCE/modules/juce_core/juce_core.cpp" \
    -o "$BUILD_DIR/juce_core.o" \
    -framework CoreAudio -framework CoreMIDI -framework Cocoa -framework Accelerate

clang++ -std=c++17 -x objective-c++ \
    -DDEBUG=1 \
    -DJUCE_UNIT_TESTS=1 \
    -DJUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1 \
    -I"$PROJECT_ROOT/external/JUCE/modules" \
    -I"$PROJECT_ROOT/include" \
    -I"$PROJECT_ROOT/instruments/giant_instruments/include" \
    -c "$PROJECT_ROOT/external/JUCE/modules/juce_audio_basics/juce_audio_basics.cpp" \
    -o "$BUILD_DIR/juce_audio_basics.o" \
    -framework CoreAudio -framework CoreMIDI -framework Cocoa -framework Accelerate

clang++ -std=c++17 -x objective-c++ \
    -DDEBUG=1 \
    -DJUCE_UNIT_TESTS=1 \
    -DJUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1 \
    -I"$PROJECT_ROOT/external/JUCE/modules" \
    -I"$PROJECT_ROOT/include" \
    -I"$PROJECT_ROOT/instruments/giant_instruments/include" \
    -c "$PROJECT_ROOT/external/JUCE/modules/juce_dsp/juce_dsp.cpp" \
    -o "$BUILD_DIR/juce_dsp.o" \
    -framework CoreAudio -framework CoreMIDI -framework Cocoa -framework Accelerate

# Compile test code as C++
echo "Compiling test code..."
clang++ -std=c++17 \
    -DDEBUG=1 \
    -DJUCE_UNIT_TESTS=1 \
    -DJUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1 \
    -I"$PROJECT_ROOT/external/JUCE/modules" \
    -I"$PROJECT_ROOT/include" \
    -I"$PROJECT_ROOT/instruments/giant_instruments/include" \
    -c "$SCRIPT_DIR/AetherGiantPercussionTests.cpp" \
    -o "$BUILD_DIR/test.o"

clang++ -std=c++17 \
    -DDEBUG=1 \
    -DJUCE_UNIT_TESTS=1 \
    -DJUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1 \
    -I"$PROJECT_ROOT/external/JUCE/modules" \
    -I"$PROJECT_ROOT/include" \
    -I"$PROJECT_ROOT/instruments/giant_instruments/include" \
    -c "$PROJECT_ROOT/instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp" \
    -o "$BUILD_DIR/dsp.o"

# Link
echo "Linking..."
clang++ -std=c++17 \
    "$BUILD_DIR/test.o" \
    "$BUILD_DIR/dsp.o" \
    "$BUILD_DIR/juce_core.o" \
    "$BUILD_DIR/juce_audio_basics.o" \
    "$BUILD_DIR/juce_dsp.o" \
    -o "$SCRIPT_DIR/aether_giant_percussion_test" \
    -framework CoreAudio -framework CoreMIDI -framework Cocoa -framework Accelerate \
    -framework Security -framework Foundation

echo "✅ Build complete: $SCRIPT_DIR/aether_giant_percussion_test"
echo ""
echo "Run test with: $SCRIPT_DIR/aether_giant_percussion_test"
