#!/bin/bash
#==============================================================================
# build_plugin.sh
# Build White Room Pedalboard VST3/AU/LV2/Standalone Plugin
#==============================================================================

set -e

# Script directory (pedalboard/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build directory
BUILD_DIR="${SCRIPT_DIR}/build_plugin"

# Clean previous build
if [[ "${1}" == "clean" ]]; then
    echo "🧹 Cleaning previous build..."
    rm -rf "${BUILD_DIR}"
fi

mkdir -p "${BUILD_DIR}"

# Copy the plugin CMakeLists to build directory
echo "🎸 Setting up pedalboard plugin build..."
cp "${SCRIPT_DIR}/CMakeLists_plugin.txt" "${BUILD_DIR}/CMakeLists.txt"

# Detect architecture
ARCH=$(uname -m)
if [[ "${ARCH}" == "arm64" ]]; then
    CMAKE_ARCH="arm64"
    echo "🍎 Detected Apple Silicon (arm64)"
else
    CMAKE_ARCH="x86_64"
    echo "💻 Detected Intel (x86_64)"
fi

# Configure
echo "⚙️  Configuring plugin build..."
cd "${BUILD_DIR}"
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_OSX_ARCHITECTURES="${CMAKE_ARCH}" \
      -DCMAKE_OSX_DEPLOYMENT_TARGET=10.15 \
      .

# Build
echo "🔧 Building plugin..."
cmake --build . --config Release --parallel $(sysctl -n hw.ncpu)

# Find the built plugin
echo ""
echo "============================================================================"
echo "  Build Complete!"
echo "============================================================================"
echo ""

if [ -d "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/VST3" ]; then
    VST3_PATH=$(find "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/VST3" -name "*.vst3" | head -1)
    echo "  ✅ VST3 Plugin: $VST3_PATH"
    echo ""
    echo "  To validate with pluginval:"
    echo "    pluginval --validate-in-place \"$VST3_PATH\""
    echo ""
fi

if [ -d "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/AU" ]; then
    AU_PATH=$(find "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/AU" -name "*.component" | head -1)
    echo "  ✅ AU Plugin: $AU_PATH"
    echo ""
    echo "  To validate with pluginval:"
    echo "    pluginval --validate-in-place \"$AU_PATH\""
    echo ""
fi

if [ -d "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/LV2" ]; then
    LV2_PATH=$(find "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/LV2" -name "*.lv2" | head -1)
    echo "  ✅ LV2 Plugin: $LV2_PATH"
    echo ""
fi

if [ -d "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/Standalone" ]; then
    APP_PATH=$(find "${BUILD_DIR}/WhiteRoomPedalboard_artefacts/Standalone" -name "*.app" | head -1)
    echo "  ✅ Standalone App: $APP_PATH"
    echo ""
    echo "  To run:"
    echo "    open \"$APP_PATH\""
    echo ""
fi

echo "============================================================================"
