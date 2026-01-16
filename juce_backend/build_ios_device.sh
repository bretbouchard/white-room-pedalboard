#!/bin/bash
# Build JUCE backend for iOS Device (physical iPhone/iPad)
set -e
JUCE_BACKEND="/Users/bretbouchard/apps/schill/white_room/juce_backend"
BUILD_DIR="$JUCE_BACKEND/build_ios_device"
LIB_DIR="$JUCE_BACKEND/../swift_frontend/WhiteRoomiOS/WhiteRoomiOSProject/Libraries"
echo "🔨 Building JUCE backend for iOS Device (arm64-ios)..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. \
  -DCMAKE_SYSTEM_NAME=iOS \
  -DCMAKE_OSX_SYSROOT=iphoneos \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_IOS_INSTALL_COMBINED=NO \
  -DCMAKE_BUILD_TYPE=Release \
  -DJUCE_BUILD_SHARED_LIBS=OFF
cmake --build . --config Release --target juce_backend_ios --parallel
mkdir -p "$LIB_DIR"
cp libjuce_backend_ios.a "$LIB_DIR/libjuce_backend_ios_device.a"
lipo -info "$LIB_DIR/libjuce_backend_ios_device.a"
echo "✅ Built for iOS Device: libjuce_backend_ios_device.a"
