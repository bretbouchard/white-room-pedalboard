#!/bin/bash

# Build script for AetherDrive AUv3 iOS Effect Plugin

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${PROJECT_DIR}/build"
XCODE_PROJECT="${PROJECT_DIR}/AetherDrivePlugin.xcodeproj"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}AetherDrive AUv3 iOS Effect Build Script${NC}"
echo "======================================"
echo ""
echo "Effect Type: aufx (Audio Effect)"
echo "NOT an instrument - processes input to output"
echo ""

# Parse arguments
SCHEME="AetherDrivePlugin"
CONFIGURATION="Release"
SDK="iphoneos"
DESTINATION="generic/platform=iOS"

while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      CONFIGURATION="Debug"
      shift
      ;;
    --simulator)
      SDK="iphonesimulator"
      DESTINATION="platform=iOS Simulator,name=iPhone 15"
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Configuration: ${CONFIGURATION}"
echo "SDK: ${SDK}"
echo ""

# Clean if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}Cleaning build directory...${NC}"
    rm -rf "${BUILD_DIR}"
fi

# Check if Xcode project exists
if [ ! -f "${XCODE_PROJECT}/project.pbxproj" ]; then
    echo -e "${RED}Error: Xcode project not found at ${XCODE_PROJECT}${NC}"
    echo ""
    echo "You need to create the Xcode project first."
    echo "This script requires a properly configured Xcode project."
    echo ""
    echo "To create manually:"
    echo "1. Open Xcode"
    echo "2. Create new project: iOS → App → AetherDrivePluginApp"
    echo "3. Add AUv3 Extension target"
    echo "4. Add SharedDSP static library target"
    echo "5. Configure for EFFECT type (aufx, not aumu)"
    exit 1
fi

# Build
echo -e "${GREEN}Building AetherDrivePlugin...${NC}"

xcodebuild \
  -project "${XCODE_PROJECT}" \
  -scheme "${SCHEME}" \
  -configuration "${CONFIGURATION}" \
  -sdk "${SDK}" \
  -destination "${DESTINATION}" \
  -derivedDataPath "${BUILD_DIR}" \
  build

# Check build result
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Build successful!${NC}"
    echo ""
    echo "Output: ${BUILD_DIR}/Build/Products/${CONFIGURATION}-${SDK}/"
    echo ""
    echo "To install on device:"
    echo "1. Connect iOS device"
    echo "2. Open Xcode organizer"
    echo "3. Archive and distribute"
    echo ""
    echo "AUv3 Effect Plugin Components:"
    echo "- Type: aufx (Effect)"
    echo "- Subtype: athr (AetherDrive)"
    echo "- Manufacturer: WHRM (WhiteRoom)"
    echo ""
    echo "Compatible hosts: GarageBand, AUM, Audiobus, etc."
else
    echo ""
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
