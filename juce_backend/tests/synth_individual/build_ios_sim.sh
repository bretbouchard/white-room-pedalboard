#!/bin/bash
# Build synth tests for iOS Simulator
set -e
BUILD_DIR="build_ios_sim"
echo "🔨 Building synth tests for iOS Simulator (arm64-sim)..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. \
  -DCMAKE_SYSTEM_NAME=iOS \
  -DCMAKE_OSX_SYSROOT=iphonesimulator \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_IOS_INSTALL_COMBINED=NO \
  -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release --parallel
echo "✅ Built for iOS Simulator"
