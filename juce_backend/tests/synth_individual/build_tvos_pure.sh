#!/bin/bash
# Build PURE synth tests for tvOS Simulator (no JUCE dependencies)
set -e
BUILD_DIR="build_tvos_pure"
echo "🔨 Building PURE synth tests for tvOS Simulator (arm64-sim)..."
echo "   No JUCE dependencies - pure DSP + stdlib only"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake \
  -DCMAKE_SYSTEM_NAME=tvOS \
  -DCMAKE_OSX_SYSROOT=appletvsimulator \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_IOS_INSTALL_COMBINED=NO \
  -DCMAKE_BUILD_TYPE=Release \
  -C ../CMakeListsPure.txt \
  ..
cmake --build . --config Release --parallel
echo "✅ Built for tvOS Simulator (Pure)"
echo ""
echo "Run tests with:"
echo "  xcrun simctl spawn <device_id> $PWD/TestLocalGalPure"
echo "  xcrun simctl spawn <device_id> $PWD/TestKaneMarcoPure"
echo "  etc."
