#!/bin/bash
# White Room Pedals Build Script
# Builds all plugin formats and runs tests

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
TEST_DIR="${PROJECT_ROOT}/juce_backend/dsp_test_harness/build"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     White Room Pedals - Build & Test Suite            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse command line arguments
BUILD_TYPE="Release"
RUN_TESTS=true
BUILD_VST3=true
BUILD_AU=true
BUILD_STANDALONE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            BUILD_TYPE="Debug"
            shift
            ;;
        --no-tests)
            RUN_TESTS=false
            shift
            ;;
        --vst3-only)
            BUILD_AU=false
            BUILD_STANDALONE=false
            shift
            ;;
        --au-only)
            BUILD_VST3=false
            BUILD_STANDALONE=false
            shift
            ;;
        --standalone-only)
            BUILD_VST3=false
            BUILD_AU=false
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --debug           Build in Debug mode (default: Release)"
            echo "  --no-tests        Skip running tests"
            echo "  --vst3-only       Build only VST3 format"
            echo "  --au-only         Build only AU format (macOS only)"
            echo "  --standalone-only Build only Standalone app"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# =============================================================================
# Step 1: Clean build directory
# =============================================================================
echo -e "${YELLOW}Step 1: Cleaning build directory...${NC}"
if [ -d "${BUILD_DIR}" ]; then
    rm -rf "${BUILD_DIR}"
fi
mkdir -p "${BUILD_DIR}"
echo -e "${GREEN}✓ Build directory cleaned${NC}"
echo ""

# =============================================================================
# Step 2: Configure CMake
# =============================================================================
echo -e "${YELLOW}Step 2: Configuring CMake...${NC}"
cd "${BUILD_DIR}"

CMAKE_ARGS="-DCMAKE_BUILD_TYPE=${BUILD_TYPE}"
if [ "$RUN_TESTS" = false ]; then
    CMAKE_ARGS+=" -DWHITEROOM_BUILD_TESTS=OFF"
fi

cmake .. ${CMAKE_ARGS}
echo -e "${GREEN}✓ CMake configured${NC}"
echo ""

# =============================================================================
# Step 3: Build plugins
# =============================================================================
echo -e "${YELLOW}Step 3: Building plugins...${NC}"
echo -e "Build type: ${BUILD_TYPE}"

BUILD_TARGETS=""

if [ "$BUILD_VST3" = true ]; then
    BUILD_TARGETS+=" WhiteRoomPedals_VST3"
fi

if [ "$BUILD_AU" = true ] && [ "$(uname)" = "Darwin" ]; then
    BUILD_TARGETS+=" WhiteRoomPedals_AU"
fi

if [ "$BUILD_STANDALONE" = true ]; then
    BUILD_TARGETS+=" WhiteRoomPedals_Standalone"
fi

make -j$(sysctl -n hw.ncpu) ${BUILD_TARGETS}
echo -e "${GREEN}✓ Plugins built successfully${NC}"
echo ""

# =============================================================================
# Step 4: Run tests
# =============================================================================
if [ "$RUN_TESTS" = true ]; then
    echo -e "${YELLOW}Step 4: Running DSP tests...${NC}"

    # Build test harness
    if [ ! -d "${TEST_DIR}" ]; then
        mkdir -p "${TEST_DIR}"
        cd "${TEST_DIR}"
        cmake ../..
    fi

    cd "${TEST_DIR}"
    make comprehensive_pedal_test_host

    # Run tests
    if ./comprehensive_pedal_test_host; then
        echo -e "${GREEN}✓ All tests passed${NC}"
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
    echo ""
fi

# =============================================================================
# Step 5: Generate UI
# =============================================================================
echo -e "${YELLOW}Step 5: Generating pedal UIs...${NC}"
cd "${PROJECT_ROOT}"
python3 swift_frontend/scripts/generate_pedal_ui.py
echo -e "${GREEN}✓ UIs generated${NC}"
echo ""

# =============================================================================
# Step 6: Copy plugins to output directory
# =============================================================================
echo -e "${YELLOW}Step 6: Copying plugins to output directory...${NC}"

OUTPUT_DIR="${PROJECT_ROOT}/build/plugins"
mkdir -p "${OUTPUT_DIR}/VST3"
mkdir -p "${OUTPUT_DIR}/AU"
mkdir -p "${OUTPUT_DIR}/Standalone"

if [ "$BUILD_VST3" = true ]; then
    cp -R "${BUILD_DIR}/WhiteRoomPedals_artefacts/VST3/WhiteRoomPedals.vst3" "${OUTPUT_DIR}/VST3/"
    echo -e "${GREEN}✓ VST3 plugin copied${NC}"
fi

if [ "$BUILD_AU" = true ] && [ "$(uname)" = "Darwin" ]; then
    cp -R "${BUILD_DIR}/WhiteRoomPedals_artefacts/AU/WhiteRoomPedals.component" "${OUTPUT_DIR}/AU/"
    echo -e "${GREEN}✓ AU plugin copied${NC}"
fi

if [ "$BUILD_STANDALONE" = true ]; then
    if [ "$(uname)" = "Darwin" ]; then
        cp -R "${BUILD_DIR}/WhiteRoomPedals_artefacts/Standalone/WhiteRoomPedals.app" "${OUTPUT_DIR}/Standalone/"
    elif [ "$(uname)" = "Linux" ]; then
        cp "${BUILD_DIR}/WhiteRoomPedals_artefacts/Standalone/WhiteRoomPedals" "${OUTPUT_DIR}/Standalone/"
    fi
    echo -e "${GREEN}✓ Standalone app copied${NC}"
fi

echo ""

# =============================================================================
# Build Summary
# =============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Build Summary                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Build Type:${NC} ${BUILD_TYPE}"
echo -e "${GREEN}Output Directory:${NC} ${OUTPUT_DIR}"
echo ""

if [ "$BUILD_VST3" = true ]; then
    echo -e "${GREEN}✓${NC} VST3: ${OUTPUT_DIR}/VST3/WhiteRoomPedals.vst3"
fi

if [ "$BUILD_AU" = true ] && [ "$(uname)" = "Darwin" ]; then
    echo -e "${GREEN}✓${NC} AU: ${OUTPUT_DIR}/AU/WhiteRoomPedals.component"
fi

if [ "$BUILD_STANDALONE" = true ]; then
    if [ "$(uname)" = "Darwin" ]; then
        echo -e "${GREEN}✓${NC} Standalone: ${OUTPUT_DIR}/Standalone/WhiteRoomPedals.app"
    else
        echo -e "${GREEN}✓${NC} Standalone: ${OUTPUT_DIR}/Standalone/WhiteRoomPedals"
    fi
fi

echo ""

if [ "$RUN_TESTS" = true ]; then
    echo -e "${GREEN}✓${NC} Tests: All passed"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Build completed successfully! 🎸${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
