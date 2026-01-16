#!/bin/bash
#==============================================================================
# LV2 Plugin Build Script
#==============================================================================

set -e  # Exit on error

#==============================================================================
# Configuration
#==============================================================================

BUILD_DIR="build"
PLUGIN_NAME="FilterGate"
LV2_BUNDLE="${PLUGIN_NAME}.lv2"
INSTALL_PATH_USER="${HOME}/.lv2"
INSTALL_PATH_SYSTEM="/usr/local/lib/lv2"

#==============================================================================
# Colors
#==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

#==============================================================================
# Functions
#==============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#==============================================================================
# Parse Arguments
#==============================================================================

BUILD_TYPE="Release"
INSTALL=0
INSTALL_SYSTEM=0
VALIDATE=0
CLEAN=0

while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            BUILD_TYPE="Debug"
            shift
            ;;
        --release)
            BUILD_TYPE="Release"
            shift
            ;;
        --install)
            INSTALL=1
            shift
            ;;
        --install-system)
            INSTALL=1
            INSTALL_SYSTEM=1
            shift
            ;;
        --validate)
            VALIDATE=1
            shift
            ;;
        --clean)
            CLEAN=1
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --debug          Build debug version (default: release)"
            echo "  --release        Build release version (default)"
            echo "  --install        Install to user LV2 path (~/.lv2/)"
            echo "  --install-system Install to system path (/usr/local/lib/lv2/)"
            echo "  --validate       Validate TTL files after build"
            echo "  --clean          Clean build directory before building"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

#==============================================================================
# Clean Build Directory
#==============================================================================

if [ "$CLEAN" -eq 1 ]; then
    log_info "Cleaning build directory..."
    rm -rf "${BUILD_DIR}"
fi

#==============================================================================
# Create Build Directory
#==============================================================================

log_info "Creating build directory..."
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

#==============================================================================
# Configure with CMake
#==============================================================================

log_info "Configuring with CMake (${BUILD_TYPE} build)..."

cmake .. \
    -DCMAKE_BUILD_TYPE="${BUILD_TYPE}" \
    -DBUILD_LV2=ON \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

#==============================================================================
# Build Plugin
#==============================================================================

log_info "Building ${PLUGIN_NAME} LV2 plugin..."

NUM_CORES=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
make -j"${NUM_CORES}"

#==============================================================================
# Check Build Output
#==============================================================================

if [ ! -f "${LV2_BUNDLE}/${PLUGIN_NAME}_LV2.so" ]; then
    log_error "Build failed - plugin binary not found"
    exit 1
fi

log_info "Build successful!"

#==============================================================================
# Validate TTL Files
#==============================================================================

if [ "$VALIDATE" -eq 1 ]; then
    log_info "Validating TTL files..."

    if command -v lv2-validate &> /dev/null; then
        lv2-validate "${LV2_BUNDLE}/manifest.ttl"
        lv2-validate "${LV2_BUNDLE}/${PLUGIN_NAME}.ttl"
        log_info "TTL validation passed!"
    else
        log_warn "lv2-validate not found, skipping TTL validation"
        log_warn "Install with: brew install lv2  (macOS)"
        log_warn "              apt-get install lv2-dev  (Linux)"
    fi
fi

#==============================================================================
# Display Bundle Contents
#==============================================================================

log_info "Bundle contents:"
ls -lh "${LV2_BUNDLE}/"

#==============================================================================
# Install Plugin
#==============================================================================

if [ "$INSTALL" -eq 1 ]; then
    if [ "$INSTALL_SYSTEM" -eq 1 ]; then
        INSTALL_PATH="${INSTALL_PATH_SYSTEM}"
        log_info "Installing to system path: ${INSTALL_PATH}"

        if [ "$EUID" -ne 0 ]; then
            log_warn "System installation requires sudo. Re-running with sudo..."
            sudo make install
        else
            make install
        fi
    else
        INSTALL_PATH="${INSTALL_PATH_USER}"
        log_info "Installing to user path: ${INSTALL_PATH}"
        mkdir -p "${INSTALL_PATH}"
        cp -R "${LV2_BUNDLE}" "${INSTALL_PATH}/"
    fi

    log_info "Installation complete!"
    log_info "Plugin installed to: ${INSTALL_PATH}/${LV2_BUNDLE}"
    log_info ""
    log_info "Rescan plugins in your DAW to see ${PLUGIN_NAME}"
fi

#==============================================================================
# Summary
#==============================================================================

log_info ""
log_info "==================================================================="
log_info "Build Summary"
log_info "==================================================================="
log_info "Plugin: ${PLUGIN_NAME}"
log_info "Build Type: ${BUILD_TYPE}"
log_info "Bundle: ${BUILD_DIR}/${LV2_BUNDLE}"
log_info ""

if [ "$INSTALL" -eq 0 ]; then
    log_info "To install:"
    log_info "  User:    $0 --install"
    log_info "  System:  $0 --install-system"
fi

log_info ""
log_info "To test:"
log_info "  jalv.gtk ${PLUGIN_NAME}     # GUI host (if installed)"
log_info "  jalv.lv2 ${PLUGIN_NAME}     # CLI host (if installed)"
log_info "  carla                       # Carla plugin host"
log_info ""
