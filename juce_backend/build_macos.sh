#!/bin/bash
# Build JUCE backend for macOS
set -e
JUCE_BACKEND="/Users/bretbouchard/apps/schill/white_room/juce_backend"
BUILD_DIR="$JUCE_BACKEND/build_macos"
LIB_DIR="$JUCE_BACKEND/../swift_frontend/macos/SchillingerMac/Libraries"
mkdir -p "$LIB_DIR"
echo "🔨 Building JUCE backend for macOS (arm64 + x86_64)..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. \
  -DCMAKE_SYSTEM_NAME=Darwin \
  -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
  -DCMAKE_BUILD_TYPE=Release \
  -DJUCE_BUILD_SHARED_LIBS=OFF
cmake --build . --config Release --target juce_backend_ios --parallel
cp libjuce_backend_ios.a "$LIB_DIR/libjuce_backend_macos.a"
lipo -info "$LIB_DIR/libjuce_backend_macos.a"
echo "✅ Built for macOS: libjuce_backend_macos.a"
