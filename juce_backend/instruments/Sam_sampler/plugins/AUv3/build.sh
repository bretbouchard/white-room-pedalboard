#!/bin/bash

# Build script for Sam Sampler AUv3 iOS Plugin
# Creates Xcode project and builds for iOS

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="SamSamplerPlugin"
BUILD_DIR="$SCRIPT_DIR/build"

echo "======================================"
echo "Sam Sampler AUv3 Build Script"
echo "======================================"

# Clean build directory
echo "Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Build SharedDSP static library first
echo "Building SharedDSP library..."
cd "$SCRIPT_DIR/SharedDSP"
mkdir -p build
cd build

# Configure CMake for iOS
cmake .. \
    -DCMAKE_SYSTEM_NAME=iOS \
    -DCMAKE_OSX_ARCHITECTURES=arm64 \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=15.0 \
    -DCMAKE_XCODE_GENERATE_SCHEME=OFF \
    -G Xcode

# Build static library
xcodebuild -project SamSamplerDSP.xcodeproj \
    -target SamSamplerDSP \
    -configuration Release \
    -sdk iphoneos \
    build

cd "$SCRIPT_DIR"

# Create main Xcode project
echo "Creating Xcode project..."

# Note: This is a simplified build script
# In production, you would create a proper .xcodeproj file
# with all the correct build settings and dependencies

echo ""
echo "======================================"
echo "Build Summary"
echo "======================================"
echo ""
echo "Project: $PROJECT_NAME"
echo "Build Directory: $BUILD_DIR"
echo ""
echo "Next Steps:"
echo "1. Open SamSamplerPlugin.xcodeproj in Xcode"
echo "2. Select target device (iOS Simulator or Device)"
echo "3. Build and run (⌘R)"
echo ""
echo "For distribution:"
echo "- Archive the app in Xcode"
echo "- Distribute through App Store Connect"
echo ""
echo "======================================"
