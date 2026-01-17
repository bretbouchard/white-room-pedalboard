#!/bin/bash

#==============================================================================
# Build BiPhase as standalone VST3/AU plugin
#==============================================================================
# This script builds the BiPhase effect as a standalone plugin for DAW testing
# Usage: ./build_plugin.sh [clean]
#==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build_plugin"

# Optional clean build
if [[ "${1}" == "clean" ]]; then
    echo "🧹 Cleaning build directory..."
    rm -rf "${BUILD_DIR}"
fi

echo "🔨 Building BiPhase Plugin..."
echo "📁 Build directory: ${BUILD_DIR}"

# Create build directory
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

# Detect architecture
ARCH=$(uname -m)
if [[ "${ARCH}" == "arm64" ]]; then
    CMAKE_ARCH="arm64"
    echo "🍎 Detected Apple Silicon (arm64)"
else
    CMAKE_ARCH="x86_64"
    echo "💻 Detected Intel (x86_64)"
fi

# Configure with CMake
echo "⚙️  Configuring CMake..."
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_OSX_ARCHITECTURES="${CMAKE_ARCH}" \
      -DCMAKE_OSX_DEPLOYMENT_TARGET=10.15 \
      -S "${SCRIPT_DIR}" \
      -B . \
      -DBUILD_PLUGIN=ON \
      ..

# Build
echo "🔧 Building plugin..."
cmake --build . --config Release --parallel $(sysctl -n hw.ncpu)

# Install (optional - comment out if you don't want automatic installation)
# VST3 installation path
VST3_PATH="$HOME/Library/Audio/Plug-Ins/VST3"
AU_PATH="$HOME/Library/Audio/Plug-Ins/Components"

echo ""
echo "✅ Plugin built successfully!"
echo ""
echo "📦 Build Outputs:"
if [[ -d "${BUILD_DIR}/BiPhase_artefacts/VST3" ]]; then
    VST3_PLUGIN=$(find "${BUILD_DIR}/BiPhase_artefacts/VST3" -name "*.vst3" | head -n 1)
    if [[ -n "${VST3_PLUGIN}" ]]; then
        echo "    VST3: ${VST3_PLUGIN}"
        echo "          → Install to: ${VST3_PATH}"
    fi
fi

if [[ -d "${BUILD_DIR}/BiPhase_artefacts/AU" ]]; then
    AU_PLUGIN=$(find "${BUILD_DIR}/BiPhase_artefacts/AU" -name "*.component" | head -n 1)
    if [[ -n "${AU_PLUGIN}" ]]; then
        echo "    AU:   ${AU_PLUGIN}"
        echo "          → Install to: ${AU_PATH}"
    fi
fi

echo ""
echo "🎛️  To install manually (if needed):"
echo "   cp -R ${BUILD_DIR}/BiPhase_artefacts/VST3/*.vst3 ${VST3_PATH}/"
echo "   cp -R ${BUILD_DIR}/BiPhase_artefacts/AU/*.component ${AU_PATH}/"
echo ""
echo "🧪 To validate with pluginval:"
echo "   pluginval --validate-in-place ${BUILD_DIR}/BiPhase_artefacts/VST3/BiPhase.vst3"
echo ""
