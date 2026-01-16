#!/bin/bash
# White Room DAW - Release Build Script
# Creates production release builds for all platforms

set -e

VERSION="${1:-1.0.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build/release"
RELEASE_DIR="$BUILD_DIR/$VERSION"

echo "================================================"
echo "White Room DAW v${VERSION} - Release Build"
echo "================================================"
echo ""

# Create release directory
mkdir -p "$RELEASE_DIR"

# Function to build platform
build_platform() {
    local platform=$1
    local arch=$2

    echo "Building $platform ($arch)..."

    cd "$PROJECT_ROOT/juce_backend"

    # Configure
    cmake -B "build_${platform}_${arch}" \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_OSX_ARCHITECTURES="$arch" \
        -DWHITE_ROOM_VERSION="$VERSION"

    # Build
    cmake --build "build_${platform}_${arch}" --config Release -j$(sysctl -n hw.ncpu)

    echo "✓ $platform ($arch) build complete"
}

# Build macOS Intel
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Building macOS releases..."
    build_platform "macos" "x86_64"
    build_platform "macos" "arm64"

    # Create universal binary
    echo "Creating universal macOS binary..."
    mkdir -p "$RELEASE_DIR/macos"
    lipo -create \
        -output "$RELEASE_DIR/macos/White Room" \
        "build_macos_x86_64/White Room.app/Contents/MacOS/White Room" \
        "build_macos_arm64/White Room.app/Contents/MacOS/White Room"

    # Create DMG
    echo "Creating DMG..."
    hdiutil create \
        -volname "White Room $VERSION" \
        -srcfolder "build_macos_x86_64/White Room.app" \
        -ov \
        -format UDZO \
        "$RELEASE_DIR/white_room-${VERSION}-macos-universal.dmg"

    echo "✓ macOS release complete"
fi

# Build Windows (if on Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "Building Windows release..."

    cd "$PROJECT_ROOT/juce_backend"

    # Configure
    cmake -B "build_windows" \
        -DCMAKE_BUILD_TYPE=Release \
        -DWHITE_ROOM_VERSION="$VERSION"

    # Build
    cmake --build "build_windows" --config Release -j$(nproc)

    # Create installer
    echo "Creating Windows installer..."
    mkdir -p "$RELEASE_DIR/windows"
    cp "build_windows/Release/White Room.exe" "$RELEASE_DIR/windows/"

    echo "✓ Windows release complete"
fi

echo ""
echo "================================================"
echo "Release build complete!"
echo "Location: $RELEASE_DIR"
echo "================================================"
