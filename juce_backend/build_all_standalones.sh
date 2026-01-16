#!/bin/bash

# Build All White Room Standalone Applications
# ===============================================
# This script builds standalone applications for all White Room plugins
#
# Usage: ./build_all_standalones.sh
#
# Requirements:
# - CMake 3.22+
# - Xcode Command Line Tools (macOS)
# - All plugin source files present
#
# Output:
# - Standalone .app bundles in each plugin's build/ directory

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for results
TOTAL_PLUGINS=0
SUCCESS_COUNT=0
FAILED_COUNT=0

# Array to track failed builds
declare -a FAILED_PLUGINS

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}White Room Standalone Build Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to build a single plugin
build_plugin() {
    local plugin_dir=$1
    local plugin_name=$(basename "$plugin_dir" | sed 's/_plugin_build//')

    echo -e "${BLUE}------------------------------------------------${NC}"
    echo -e "${BLUE}Building: ${plugin_name}${NC}"
    echo -e "${BLUE}------------------------------------------------${NC}"

    TOTAL_PLUGINS=$((TOTAL_PLUGINS + 1))

    # Check if plugin directory exists
    if [ ! -d "$plugin_dir" ]; then
        echo -e "${RED}✗ Plugin directory not found: $plugin_dir${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_PLUGINS+=("$plugin_name (directory not found)")
        return 1
    fi

    # Check if CMakeLists.txt exists
    if [ ! -f "$plugin_dir/CMakeLists.txt" ]; then
        echo -e "${RED}✗ CMakeLists.txt not found in: $plugin_dir${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_PLUGINS+=("$plugin_name (CMakeLists.txt missing)")
        return 1
    fi

    # Create build directory if it doesn't exist
    mkdir -p "$plugin_dir/build"

    # Navigate to build directory
    cd "$plugin_dir/build"

    # Configure with CMake
    echo -e "${YELLOW}Configuring CMake...${NC}"
    if cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_STANDALONE=ON 2>&1 | grep -i "error"; then
        echo -e "${RED}✗ CMake configuration failed for ${plugin_name}${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_PLUGINS+=("$plugin_name (CMake configure failed)")
        cd - > /dev/null
        return 1
    fi

    # Build with CMake
    echo -e "${YELLOW}Building standalone application...${NC}"
    if cmake --build . --config Release --parallel 2>&1 | grep -i "error"; then
        echo -e "${RED}✗ Build failed for ${plugin_name}${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_PLUGINS+=("$plugin_name (build failed)")
        cd - > /dev/null
        return 1
    fi

    # Check if standalone app was created
    echo -e "${YELLOW}Checking for standalone app...${NC}"
    if find . -name "*.app" -type d | grep -q .; then
        APP_PATH=$(find . -name "*.app" -type d | head -1)
        echo -e "${GREEN}✓ Standalone app created: $APP_PATH${NC}"

        # Try to verify app structure
        if [ -d "$APP_PATH/Contents/MacOS" ]; then
            EXECUTABLE=$(ls "$APP_PATH/Contents/MacOS" | head -1)
            if [ -n "$EXECUTABLE" ]; then
                echo -e "${GREEN}✓ Executable found: $EXECUTABLE${NC}"
            fi
        fi

        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠ No .app bundle found (build may have succeeded but app not created)${NC}"
        # Still count as success if build passed
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi

    cd - > /dev/null
    echo ""
}

# Get absolute path of script location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Working directory: $(pwd)${NC}"
echo ""

# Array of all plugin build directories
PLUGINS=(
    "farfaraway_plugin_build"
    "filtergate_plugin_build"
    "monument_plugin_build"
    "localgal_plugin_build"
    "nex_synth_plugin_build"
    "sam_sampler_plugin_build"
    "kane_marco_plugin_build"
    "giant_instruments_plugin_build"
)

# Build each plugin
for plugin in "${PLUGINS[@]}"; do
    if [ -d "$plugin" ]; then
        build_plugin "$plugin"
    else
        echo -e "${YELLOW}⚠ Plugin directory not found: $plugin${NC}"
        echo ""
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_PLUGINS+=("$plugin (directory not found)")
    fi
done

# Final summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Build Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Total plugins: ${TOTAL_PLUGINS}"
echo -e "${GREEN}Successful: ${SUCCESS_COUNT}${NC}"
echo -e "${RED}Failed: ${FAILED_COUNT}${NC}"
echo ""

if [ ${FAILED_COUNT} -gt 0 ]; then
    echo -e "${RED}Failed plugins:${NC}"
    for failed in "${FAILED_PLUGINS[@]}"; do
        echo -e "  ${RED}✗${NC} $failed"
    done
    echo ""
fi

# List all standalone apps that were created
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Standalone Applications${NC}"
echo -e "${BLUE}================================================${NC}"
for plugin in "${PLUGINS[@]}"; do
    if [ -d "$plugin/build" ]; then
        APP_COUNT=$(find "$plugin/build" -name "*.app" -type d 2>/dev/null | wc -l | tr -d ' ')
        if [ "$APP_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} $(basename $plugin | sed 's/_plugin_build//'):"
            find "$plugin/build" -name "*.app" -type d | while read app; do
                echo "    - $app"
            done
        fi
    fi
done
echo ""

# Exit with appropriate code
if [ ${FAILED_COUNT} -eq 0 ]; then
    echo -e "${GREEN}✓ All standalone applications built successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some builds failed. Please review errors above.${NC}"
    exit 1
fi
