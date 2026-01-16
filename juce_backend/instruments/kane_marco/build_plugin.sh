#!/bin/bash
# =============================================================================
# build_plugin.sh
# Build Kane Marco Aether VST3/AU Plugin for pluginval Validation
# =============================================================================

set -e

# Script directory (kane_marco/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build directory
BUILD_DIR="${SCRIPT_DIR}/build_plugin"

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf "$BUILD_DIR}"
fi

mkdir -p "$BUILD_DIR"

# Copy the standalone CMakeLists to build directory
echo "Setting up plugin build..."
cp "${SCRIPT_DIR}/CMakeLists_plugin_standalone_v2.txt" "${BUILD_DIR}/CMakeLists.txt"

# Configure
echo "Configuring plugin build..."
cd "$BUILD_DIR"
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
      .

# Build
echo ""
echo "Building plugin..."
cmake --build . --config Release --parallel $(sysctl -n hw.ncpu)

# Find the built plugin
echo ""
echo "============================================================================"
echo "  Build Complete!"
echo "============================================================================"
echo ""

if [ -d "${BUILD_DIR}/KaneMarcoAether_artefacts/VST3" ]; then
    VST3_PATH=$(find "${BUILD_DIR}/KaneMarcoAether_artefacts/VST3" -name "*.vst3" | head -1)
    echo "  VST3 Plugin: $VST3_PATH"
    echo ""
    echo "  To validate with pluginval:"
    echo "    pluginval --validate-in-place \"$VST3_PATH\""
fi

if [ -d "${BUILD_DIR}/KaneMarcoAether_artefacts/AU" ]; then
    AU_PATH=$(find "${BUILD_DIR}/KaneMarcoAether_artefacts/AU" -name "*.component" | head -1)
    echo "  AU Plugin: $AU_PATH"
    echo ""
    echo "  To validate with pluginval:"
    echo "    pluginval --validate-in-place \"$AU_PATH\""
fi

echo ""
echo "============================================================================"
