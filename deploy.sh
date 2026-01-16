#!/bin/bash
# White Room Pedals Deployment Script
# Codesigns and creates installers for distribution

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${PROJECT_ROOT}/juce_backend/effects/pedals/build"
OUTPUT_DIR="${PROJECT_ROOT}/build/plugins"
VERSION=$(grep "project(WhiteRoomPedals VERSION" "${PROJECT_ROOT}/juce_backend/effects/pedals/CMakeLists.txt" | sed 's/.*VERSION \([0-9.]*\).*/\1/')

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     White Room Pedals - Deployment Script             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo ""

# Check if we're on macOS
if [ "$(uname)" != "Darwin" ]; then
    echo -e "${RED}This deployment script only works on macOS${NC}"
    exit 1
fi

# Check for code signing certificate
CERTIFICATE_NAME="Developer ID Application: Your Name"

if ! security find-identity -v -p codesigning | grep -q "$CERTIFICATE_NAME"; then
    echo -e "${YELLOW}Warning: Code signing certificate not found: ${CERTIFICATE_NAME}${NC}"
    echo -e "${YELLOW}Plugins will be built but not signed${NC}"
    echo ""
    read -p "Continue without code signing? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    DO_SIGN=false
else
    DO_SIGN=true
fi

# =============================================================================
# Step 1: Code signing
# =============================================================================
if [ "$DO_SIGN" = true ]; then
    echo -e "${YELLOW}Step 1: Code signing plugins...${NC}"

    # Sign VST3
    if [ -d "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" ]; then
        codesign --force --deep --sign "$CERTIFICATE_NAME" \
            --options runtime \
            "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3"
        echo -e "${GREEN}✓ VST3 signed${NC}"
    fi

    # Sign AU
    if [ -d "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" ]; then
        codesign --force --deep --sign "$CERTIFICATE_NAME" \
            --options runtime \
            "${OUTPUT_DIR}/AU/WhiteRoomPedals.component"
        echo -e "${GREEN}✓ AU signed${NC}"
    fi

    # Sign Standalone
    if [ -d "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" ]; then
        codesign --force --deep --sign "$CERTIFICATE_NAME" \
            --options runtime \
            "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app"
        echo -e "${GREEN}✓ Standalone signed${NC}"
    fi

    echo ""
fi

# =============================================================================
# Step 2: Verify signatures
# =============================================================================
if [ "$DO_SIGN" = true ]; then
    echo -e "${YELLOW}Step 2: Verifying signatures...${NC}"

    if [ -d "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" ]; then
        codesign --verify --verbose "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" && echo -e "${GREEN}✓ VST3 verified${NC}"
    fi

    if [ -d "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" ]; then
        codesign --verify --verbose "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" && echo -e "${GREEN}✓ AU verified${NC}"
    fi

    if [ -d "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" ]; then
        codesign --verify --verbose "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" && echo -e "${GREEN}✓ Standalone verified${NC}"
    fi

    echo ""
fi

# =============================================================================
# Step 3: Create installer
# =============================================================================
echo -e "${YELLOW}Step 3: Creating installer package...${NC}"

INSTALLER_DIR="${PROJECT_ROOT}/build/installer"
mkdir -p "${INSTALLER_DIR}"

# Create component package for VST3
if [ -d "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" ]; then
    pkgbuild --component "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" \
        --install-location "/Library/Audio/Plug-Ins/VST3" \
        "${INSTALLER_DIR}/VST3.pkg"
    echo -e "${GREEN}✓ VST3 package created${NC}"
fi

# Create component package for AU
if [ -d "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" ]; then
    pkgbuild --component "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" \
        --install-location "/Library/Audio/Plug-Ins/Components" \
        "${INSTALLER_DIR}/AU.pkg"
    echo -e "${GREEN}✓ AU package created${NC}"
fi

# Create component package for Standalone
if [ -d "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" ]; then
    pkgbuild --component "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" \
        --install-location "/Applications" \
        "${INSTALLER_DIR}/Standalone.pkg"
    echo -e "${GREEN}✓ Standalone package created${NC}"
fi

# Create distribution package
if [ -f "${INSTALLER_DIR}/VST3.pkg" ] || [ -f "${INSTALLER_DIR}/AU.pkg" ] || [ -f "${INSTALLER_DIR}/Standalone.pkg" ]; then

    # Build productbuild command
    PRODUCTBUILD_CMD="productbuild"

    if [ -f "${INSTALLER_DIR}/VST3.pkg" ]; then
        PRODUCTBUILD_CMD+=" --package ${INSTALLER_DIR}/VST3.pkg /Library/Audio/Plug-Ins/VST3"
    fi

    if [ -f "${INSTALLER_DIR}/AU.pkg" ]; then
        PRODUCTBUILD_CMD+=" --package ${INSTALLER_DIR}/AU.pkg /Library/Audio/Plug-Ins/Components"
    fi

    if [ -f "${INSTALLER_DIR}/Standalone.pkg" ]; then
        PRODUCTBUILD_CMD+=" --package ${INSTALLER_DIR}/Standalone.pkg /Applications"
    fi

    PRODUCTBUILD_CMD+=" ${PROJECT_ROOT}/build/WhiteRoomPedals-${VERSION}.pkg"

    eval $PRODUCTBUILD_CMD

    echo -e "${GREEN}✓ Distribution package created${NC}"
fi

echo ""

# =============================================================================
# Step 4: Create DMG (optional)
# =============================================================================
read -p "Create DMG installer? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Step 4: Creating DMG installer...${NC}"

    DMG_DIR="${PROJECT_ROOT}/build/dmg"
    mkdir -p "${DMG_DIR}"

    # Copy components to DMG staging
    DMG_STAGING="${DMG_DIR}/WhiteRoomPedals"
    mkdir -p "${DMG_STAGING}"

    if [ -d "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" ]; then
        mkdir -p "${DMG_STAGING}/VST3"
        cp -R "${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3" "${DMG_STAGING}/VST3/"
    fi

    if [ -d "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" ]; then
        mkdir -p "${DMG_STAGING}/AU"
        cp -R "${OUTPUT_DIR}/AU/WhiteRoomPedals.component" "${DMG_STAGING}/AU/"
    fi

    if [ -d "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" ]; then
        mkdir -p "${DMG_STAGING}/Applications"
        cp -R "${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app" "${DMG_STAGING}/Applications/"
    fi

    # Create DMG
    hdiutil create -volname "WhiteRoom Pedals" \
        -srcfolder "${DMG_STAGING}" \
        -ov \
        -format UDBZ \
        "${PROJECT_ROOT}/build/WhiteRoomPedals-${VERSION}.dmg"

    echo -e "${GREEN}✓ DMG created${NC}"

    # Cleanup staging
    rm -rf "${DMG_STAGING}"

    echo ""
fi

# =============================================================================
# Deployment Summary
# =============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Deployment Summary                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Version:${NC} ${VERSION}"
echo -e "${GREEN}Output Directory:${NC} ${PROJECT_ROOT}/build"
echo ""

if [ -f "${PROJECT_ROOT}/build/WhiteRoomPedals-${VERSION}.pkg" ]; then
    echo -e "${GREEN}✓${NC} Installer: WhiteRoomPedals-${VERSION}.pkg"
fi

if [ -f "${PROJECT_ROOT}/build/WhiteRoomPedals-${VERSION}.dmg" ]; then
    echo -e "${GREEN}✓${NC} DMG: WhiteRoomPedals-${VERSION}.dmg"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Deployment completed successfully! 🚀${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the installer on a clean system"
echo "2. Notarize the package for distribution (if needed)"
echo "3. Upload to distribution platform"
echo "4. Update website and documentation"
