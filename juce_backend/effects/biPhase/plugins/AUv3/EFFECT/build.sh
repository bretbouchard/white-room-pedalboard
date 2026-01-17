#!/bin/bash

#==============================================================================
# BiPhase AUv3 Build Script
#==============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
BUILD_DIR="$SCRIPT_DIR/build"
IPHONEOS_DIR="$BUILD_DIR/iphoneos"
IPHONESIMULATOR_DIR="$BUILD_DIR/iphonesimulator"
UNIVERSAL_DIR="$BUILD_DIR/universal"

echo "=========================================="
echo "BiPhase AUv3 Build Script"
echo "=========================================="

# Clean build directory
echo "Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    SIMULATOR_ARCH="arm64"
    echo "Building for Apple Silicon..."
else
    SIMULATOR_ARCH="x86_64"
    echo "Building for Intel..."
fi

#==============================================================================
# Build for iOS Simulator
#==============================================================================
echo ""
echo "Building for iOS Simulator ($SIMULATOR_ARCH)..."

xcodebuild \
    -project "$SCRIPT_DIR/BiPhasePlugin.xcodeproj" \
    -scheme BiPhasePluginExtension \
    -configuration Release \
    -sdk iphonesimulator \
    -arch "$SIMULATOR_ARCH" \
    ONLY_ACTIVE_ARCH=NO \
    BUILD_DIR="$IPHONESIMULATOR_DIR" \
    build

# Extract simulator framework
echo "Extracting simulator framework..."
SIMULATOR_FRAMEWORK="$IPHONESIMULATOR_DIR/Release-iphonesimulator/BiPhasePluginExtension.framework"
cp -R "$SIMULATOR_FRAMEWORK" "$UNIVERSAL_DIR/BiPhasePluginExtension-Simulator.framework"

#==============================================================================
# Build for iOS Device
#==============================================================================
echo ""
echo "Building for iOS Device (arm64)..."

xcodebuild \
    -project "$SCRIPT_DIR/BiPhasePlugin.xcodeproj" \
    -scheme BiPhasePluginExtension \
    -configuration Release \
    -sdk iphoneos \
    -arch arm64 \
    ONLY_ACTIVE_ARCH=NO \
    BUILD_DIR="$IPHONEOS_DIR" \
    build

# Extract device framework
echo "Extracting device framework..."
DEVICE_FRAMEWORK="$IPHONEOS_DIR/Release-iphoneos/BiPhasePluginExtension.framework"
cp -R "$DEVICE_FRAMEWORK" "$UNIVERSAL_DIR/BiPhasePluginExtension-Device.framework"

#==============================================================================
# Create Universal Framework
#==============================================================================
echo ""
echo "Creating universal framework..."

UNIVERSAL_FRAMEWORK="$UNIVERSAL_DIR/BiPhasePluginExtension.framework"
mkdir -p "$UNIVERSAL_FRAMEWORK"

# Merge frameworks
lipo -create \
    "$UNIVERSAL_DIR/BiPhasePluginExtension-Simulator.framework/BiPhasePluginExtension" \
    "$UNIVERSAL_DIR/BiPhasePluginExtension-Device.framework/BiPhasePluginExtension" \
    -output "$UNIVERSAL_FRAMEWORK/BiPhasePluginExtension"

# Copy Info.plist
cp -R "$DEVICE_FRAMEWORK/Info.plist" "$UNIVERSAL_FRAMEWORK/"

# Copy modules
if [ -d "$DEVICE_FRAMEWORK/Modules" ]; then
    cp -R "$DEVICE_FRAMEWORK/Modules" "$UNIVERSAL_FRAMEWORK/"
fi

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Universal framework: $UNIVERSAL_FRAMEWORK"
echo ""
echo "To install:"
echo "1. Build and archive the project in Xcode"
echo "2. Distribute via App Store Connect or TestFlight"
echo ""
