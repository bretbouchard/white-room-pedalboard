#!/bin/bash
# Build JUCE backend for tvOS Simulator
set -e
JUCE_BACKEND="/Users/bretbouchard/apps/schill/white_room/juce_backend"
BUILD_DIR="$JUCE_BACKEND/build_tvos_simulator"
LIB_DIR="$JUCE_BACKEND/../swift_frontend/tvOS/SchillingerTV/Libraries"
mkdir -p "$LIB_DIR"
echo "🔨 Building JUCE backend for tvOS Simulator (arm64-sim)..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. \
  -DCMAKE_SYSTEM_NAME=tvOS \
  -DCMAKE_OSX_SYSROOT=appletvsimulator \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_BUILD_TYPE=Release \
  -DJUCE_BUILD_SHARED_LIBS=OFF
cmake --build . --config Release --target juce_backend_ios --parallel
cp libjuce_backend_ios.a "$LIB_DIR/libjuce_backend_tvos_simulator.a"
lipo -info "$LIB_DIR/libjuce_backend_tvos_simulator.a"
echo "✅ Built for tvOS Simulator: libjuce_backend_tvos_simulator.a"
