#!/bin/bash
# Master build script for iOS - builds both device and simulator, creates symlinks
set -e
JUCE_BACKEND="/Users/bretbouchard/apps/schill/white_room/juce_backend"
LIB_DIR="$JUCE_BACKEND/../swift_frontend/WhiteRoomiOS/WhiteRoomiOSProject/Libraries"

echo "🚀 Building JUCE backend for iOS (device + simulator)..."

# Build for device
echo "📱 Building for iOS Device..."
"$JUCE_BACKEND/build_ios_device.sh"

# Build for simulator  
echo "📱 Building for iOS Simulator..."
"$JUCE_BACKEND/build_ios_simulator.sh"

# Create platform-specific symlinks
echo "🔗 Creating platform symlinks..."
cd "$LIB_DIR"
ln -sf libjuce_backend_ios_device.a libjuce_backend_ios_iphoneos.a
ln -sf libjuce_backend_ios_simulator.a libjuce_backend_ios_iphonesimulator.a

echo "✅ iOS libraries ready!"
echo "   - Device: libjuce_backend_ios_iphoneos.a"
echo "   - Simulator: libjuce_backend_ios_iphonesimulator.a"
echo ""
echo "You can now build in Xcode for either platform - it will auto-link the correct library."
