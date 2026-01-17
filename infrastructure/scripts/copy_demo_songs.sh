#!/bin/bash

###############################################################################
# Copy Demo Songs to App Bundle
#
# This script copies demo songs from the demo_songs directory to the app bundle
# during the build process.
#
# Usage: ./copy_demo_songs.sh <build_directory> <app_name>
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Invalid arguments${NC}"
    echo "Usage: $0 <build_directory> <app_name>"
    exit 1
fi

BUILD_DIR="$1"
APP_NAME="$2"
SOURCE_DIR="$(pwd)/demo_songs"
DEST_DIR="${BUILD_DIR}/${APP_NAME}.app/DemoSongs"

# Check if source directory exists
if [ ! -d "${SOURCE_DIR}" ]; then
    echo -e "${RED}Error: Demo songs source directory not found: ${SOURCE_DIR}${NC}"
    exit 1
fi

# Check if build directory exists
if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}Error: Build directory not found: ${BUILD_DIR}${NC}"
    exit 1
fi

echo -e "${YELLOW}Copying demo songs to app bundle...${NC}"

# Create destination directory
mkdir -p "${DEST_DIR}"

# Copy only JSON song files (exclude Python scripts and markdown docs)
echo "Copying JSON song files..."
find "${SOURCE_DIR}" -name "*.json" -type f | while read -r json_file; do
    # Get relative path from demo_songs directory
    rel_path="${json_file#${SOURCE_DIR}/"

    # Create subdirectories as needed
    sub_dir="$(dirname "${rel_path}")"
    mkdir -p "${DEST_DIR}/${sub_dir}"

    # Copy file
    cp "${json_file}" "${DEST_DIR}/${rel_path}"
    echo "  ✅ Copied: ${rel_path}"
done

# Count copied files
file_count=$(find "${DEST_DIR}" -name "*.json" -type f | wc -l | tr -d ' ')
echo -e "${GREEN}✅ Copied ${file_count} demo song files to app bundle${NC}"

# Calculate total size
total_size=$(du -sh "${DEST_DIR}" | cut -f1)
echo "Total size: ${total_size}"

# Verify JSON files are valid (optional, but good for catching errors early)
echo -e "${YELLOW}Validating JSON files...${NC}"
invalid_count=0
find "${DEST_DIR}" -name "*.json" -type f | while read -r json_file; do
    if ! python3 -m json.tool "${json_file}" > /dev/null 2>&1; then
        echo -e "${RED}❌ Invalid JSON: ${json_file}${NC}"
        ((invalid_count++))
    fi
done

if [ ${invalid_count} -gt 0 ]; then
    echo -e "${RED}Error: ${invalid_count} invalid JSON files found${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All JSON files are valid${NC}"
fi

echo -e "${GREEN}Demo songs copy completed successfully!${NC}"
