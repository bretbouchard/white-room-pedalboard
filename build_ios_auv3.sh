#!/bin/bash
#==============================================================================
# Build AUv3 (iOS) Plugin
#==============================================================================
# Builds the White Room Pedalboard as an AUv3 plugin for iOS
# This requires Xcode and iOS SDK
#==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build_ios"

echo "📱 Building White Room Pedalboard AUv3 (iOS)..."
echo "📁 Build directory: ${BUILD_DIR}"

# Clean build if requested
if [[ "${1}" == "clean" ]]; then
    echo "🧹 Cleaning build directory..."
    rm -rf "${BUILD_DIR}"
fi

# Create build directory
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

# Detect iOS SDK
if [[ "$(uname -m)" == "arm64" ]]; then
    # Apple Silicon can build iOS natively
    IOS_PLATFORM="iOS"
    IOS_ARCH="arm64"
else
    echo "❌ AUv3 iOS builds require Apple Silicon Mac or iOS device"
    exit 1
fi

# Configure for iOS using CMake
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_TOOLCHAIN_FILE="${IOS_PLATFORM}" \
      -DCMAKE_OSX_ARCHITECTURES="${IOS_ARCH}" \
      -DCMAKE_OSX_SYSROOT="$(xcrun --sdk iphoneos --show-sdk-path)" \
      -DCMAKE_SYSTEM_NAME="iOS" \
      -S "${SCRIPT_DIR}" \
      -B . \
      -DBUILD_PLUGIN=ON \
      -DJUCE_BUILD_AUv3=ON

# Build AUv3
echo "🔧 Building AUv3 plugin..."
cmake --build . --config Release --target WhiteRoomPedalboard_AUv3 --parallel $(sysctl -n hw.ncpu)

echo ""
echo "✅ AUv3 build complete!"
echo ""
echo "📱 AUv3 Plugin Location:"
echo "   ${BUILD_DIR}/WhiteRoomPedalboard_artefacts/Release/AUv3/WhiteRoomPedalboard.appex"
echo ""
echo "📝 To embed AUv3 in an iOS app:"
echo "   1. Create Xcode iOS app project"
echo "   2. Add WhiteRoomPedalboard.appex as embedded app extension"
echo "   3. Configure extension points in Info.plist"
echo "   4. Sign and deploy to iOS device"
echo ""
