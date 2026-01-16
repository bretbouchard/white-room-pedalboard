#!/bin/bash
# Build PURE synth tests for tvOS Simulator (no JUCE dependencies)
set -e
BUILD_DIR="build_tvos_sim"
echo "🔨 Building PURE synth tests for tvOS Simulator (arm64-sim)"
echo "   No JUCE dependencies - pure DSP + stdlib only"
echo ""
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. \
  -DCMAKE_SYSTEM_NAME=tvOS \
  -DCMAKE_OSX_SYSROOT=appletvsimulator \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_IOS_INSTALL_COMBINED=NO \
  -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release --parallel
echo ""
echo "✅ Built for tvOS Simulator"
echo ""
echo "Available tests:"
ls -1 Test*
echo ""
echo "Run with: xcrun simctl spawn <device_id> ./TestLocalGalPure"
