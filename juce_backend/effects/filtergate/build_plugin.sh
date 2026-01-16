#!/bin/bash

# ============================================================================
# FilterGate Plugin Build Script
# ============================================================================
# Builds all configured plugin formats and installs them
#
# Usage: ./build_plugin.sh [formats]
# Example: ./build_plugin.sh "VST3;AU;CLAP;LV2;Standalone"
#
# Author: Bret Bouchard
# Date: 2026-01-16
# ============================================================================

set -e  # Exit on error

# ============================================================================
# Configuration
# ============================================================================

BUILD_DIR="build"
INSTALL_VST3="$HOME/Library/Audio/Plug-Ins/VST3"
INSTALL_AU="$HOME/Library/Audio/Plug-Ins/Components"
INSTALL_CLAP="$HOME/Library/Audio/Plug-Ins/CLAP"
INSTALL_LV2="$HOME/Library/Audio/Plug-Ins/LV2"
INSTALL_STANDALONE="/Applications"

# Formats to build (default: all configured)
FORMATS="${1:-VST3;AU;Standalone}"

# ============================================================================
# Colors
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# Build Steps
# ============================================================================

log_info "=========================================="
log_info "FilterGate Plugin Build"
log_info "=========================================="
log_info "Formats: $FORMATS"
log_info "Build Type: Release"
log_info ""

# Step 1: Clean build directory
log_info "Step 1: Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
log_success "Build directory cleaned"

# Step 2: Configure with CMake
log_info ""
log_info "Step 2: Configuring with CMake..."
cd "$BUILD_DIR"
cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DFILTERGATE_FORMATS="$FORMATS" \
    -DCMAKE_INSTALL_PREFIX="$HOME"

if [ $? -ne 0 ]; then
    log_error "CMake configuration failed"
    exit 1
fi
log_success "CMake configuration complete"

# Step 3: Build
log_info ""
log_info "Step 3: Building plugins..."
cmake --build . --config Release --parallel $(sysctl -n hw.ncpu)

if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi
log_success "Build complete"

# Step 4: Install
log_info ""
log_info "Step 4: Installing plugins..."
cmake --install . --config Release

if [ $? -ne 0 ]; then
    log_error "Install failed"
    exit 1
fi
log_success "Installation complete"

# Step 5: Summary
log_info ""
log_info "=========================================="
log_info "Build Summary"
log_info "=========================================="

if [[ "$FORMATS" == *"VST3"* ]]; then
    if [ -d "$INSTALL_VST3/FilterGate.vst3" ]; then
        log_success "VST3: $INSTALL_VST3/FilterGate.vst3"
    else
        log_warning "VST3: Not found (may not be configured)"
    fi
fi

if [[ "$FORMATS" == *"AU"* ]]; then
    if [ -d "$INSTALL_AU/FilterGate.component" ]; then
        log_success "AU: $INSTALL_AU/FilterGate.component"
    else
        log_warning "AU: Not found (may not be configured)"
    fi
fi

if [[ "$FORMATS" == *"CLAP"* ]]; then
    if [ -d "$INSTALL_CLAP/FilterGate.clap" ]; then
        log_success "CLAP: $INSTALL_CLAP/FilterGate.clap"
    else
        log_warning "CLAP: Not found (may not be configured)"
    fi
fi

if [[ "$FORMATS" == *"LV2"* ]]; then
    if [ -d "$INSTALL_LV2/FilterGate.lv2" ]; then
        log_success "LV2: $INSTALL_LV2/FilterGate.lv2"
    else
        log_warning "LV2: Not found (may not be configured)"
    fi
fi

if [[ "$FORMATS" == *"Standalone"* ]]; then
    if [ -d "$INSTALL_STANDALONE/FilterGate.app" ]; then
        log_success "Standalone: $INSTALL_STANDALONE/FilterGate.app"
    else
        log_warning "Standalone: Not found (may not be configured)"
    fi
fi

log_info ""
log_success "=========================================="
log_success "FilterGate build complete!"
log_success "=========================================="
log_info ""
log_info "You can now use FilterGate in your DAW."
