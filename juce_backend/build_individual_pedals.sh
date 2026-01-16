#!/bin/bash

# Build script for individual guitar pedal plugins
# Creates separate plugins for Overdrive, Fuzz, Chorus, and Delay

set -e  # Exit on error

echo "🎸 Building White Room Guitar Pedal Plugins"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of pedals to build
PEDALS=("Overdrive" "Fuzz" "Chorus" "Delay")

for PEDAL in "${PEDALS[@]}"; do
    echo -e "${YELLOW}Building ${PEDAL}...${NC}"

    BUILD_DIR="${PEDAL}_pedal_build"
    PLUGIN_NAME="${PEDAL}Pedal"

    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        echo "⚠️  ${PEDAL} build directory not found: $BUILD_DIR"
        echo "   Skipping ${PEDAL}"
        echo ""
        continue
    fi

    # Configure
    cd "$BUILD_DIR"
    cmake -B ../../../.build/cmake/${BUILD_DIR} -GXcode > /dev/null 2>&1

    # Build
    if cmake --build ../../../.build/cmake/${BUILD_DIR} --config Release -j8 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${PEDAL} built successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  ${PEDAL} build failed${NC}"
        echo "   Check build output for errors"
    fi

    cd - > /dev/null
    echo ""
done

echo "=============================================="
echo "🎸 Build complete!"
echo ""
echo "Built plugins can be found in:"
echo "  - .build/cmake/*_pedal_build/AudioUnit/       (AU)"
echo "  - .artifacts/plugins/*.vst3                   (VST3)"
echo "  - .build/cmake/*_pedal_build/CLAP/            (CLAP)"
echo "  - .artifacts/macos/*.app                      (Standalone)"
echo ""
echo "Install to system plugins folder:"
echo "  mkdir -p ~/Library/Audio/Plug-Ins/VST3"
echo "  cp -r .artifacts/plugins/*.vst3 ~/Library/Audio/Plug-Ins/VST3/"
