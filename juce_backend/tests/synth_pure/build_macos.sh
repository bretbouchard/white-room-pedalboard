#!/bin/bash
# Build PURE synth tests for macOS (no JUCE dependencies)
set -e
BUILD_DIR="build_macos"
echo "🔨 Building PURE synth tests for macOS"
echo "   No JUCE dependencies - pure DSP + stdlib only"
echo ""
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. \
  -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release --parallel
echo ""
echo "✅ Built for macOS"
echo ""
echo "Run tests:"
echo "  ./TestLocalGalPure"
echo "  ./TestKaneMarcoPure"
echo "  etc."
