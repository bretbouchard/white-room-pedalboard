#!/bin/bash

##############################################################################
# White Room Build Setup Script
#
# This script creates the centralized build directory structure and configures
# all build systems to use .build/ for their artifacts.
#
# Usage: ./build-config/scripts/setup-builds.sh
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Build directories
BUILD_ROOT="$PROJECT_ROOT/.build"
ARTIFACTS_ROOT="$PROJECT_ROOT/.artifacts"

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}White Room Build Setup${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Function to create directory if it doesn't exist
create_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        echo -e "${GREEN}Creating: $dir${NC}"
        mkdir -p "$dir"
    else
        echo -e "${YELLOW}Already exists: $dir${NC}"
    fi
}

# Function to create symlink for backward compatibility
create_symlink() {
    local target="$1"
    local link="$2"

    if [ ! -e "$link" ]; then
        echo -e "${GREEN}Creating symlink: $link -> $target${NC}"
        ln -s "$target" "$link"
    elif [ -L "$link" ]; then
        echo -e "${YELLOW}Symlink already exists: $link${NC}"
    else
        echo -e "${RED}Warning: $link exists and is not a symlink${NC}"
    fi
}

echo -e "${BLUE}Step 1: Creating build directory structure${NC}"
echo "============================================================="

# Create main build directories
create_dir "$BUILD_ROOT"
create_dir "$ARTIFACTS_ROOT"

# Create Xcode build directories
create_dir "$BUILD_ROOT/xcode"
create_dir "$BUILD_ROOT/xcode/iOS"
create_dir "$BUILD_ROOT/xcode/macOS"
create_dir "$BUILD_ROOT/xcode/DerivedData"

# Create CMake build directories
create_dir "$BUILD_ROOT/cmake"

# Create Swift build directories
create_dir "$BUILD_ROOT/swift"

# Create Python build directories
create_dir "$BUILD_ROOT/python"
create_dir "$BUILD_ROOT/python/__pycache__"
create_dir "$BUILD_ROOT/python/dist"

# Create Node build directories
create_dir "$BUILD_ROOT/node"
create_dir "$BUILD_ROOT/node/cache"

# Create temp directory
create_dir "$BUILD_ROOT/temp"

# Create artifact directories
create_dir "$ARTIFACTS_ROOT/ios"
create_dir "$ARTIFACTS_ROOT/macos"
create_dir "$ARTIFACTS_ROOT/plugins"
create_dir "$ARTIFACTS_ROOT/packages"

echo ""
echo -e "${BLUE}Step 2: Creating symlinks for backward compatibility${NC}"
echo "============================================================="

# Create symlinks from common build directories to centralized location
# This helps with tools that hardcode build paths

# Link any existing build directories to .build/cmake/ for compatibility
for build_dir in "$PROJECT_ROOT"/juce_backend/*/build; do
    if [ -d "$build_dir" ] && [ ! -L "$build_dir" ]; then
        plugin_name=$(basename $(dirname "$build_dir"))
        echo -e "${YELLOW}Found legacy build directory: $build_dir${NC}"
        echo -e "${YELLOW}Run migrate-builds.sh to migrate existing artifacts${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 3: Creating CMake presets${NC}"
echo "============================================================="

# Create CMake presets directory
CMAKE_PRESETS_DIR="$PROJECT_ROOT/build-config/cmake/presets"
create_dir "$CMAKE_PRESETS_DIR"

# Create CMakeUserPresets.json for centralized builds
cat > "$PROJECT_ROOT/CMakeUserPresets.json" << 'EOF'
{
  "version": 3,
  "vendor": {
    "White Room": {
      "name": "White Room Build System"
    }
  },
  "cmakeMinimumRequired": {
    "major": 3,
    "minor": 26,
    "patch": 0
  },
  "configurePresets": [
    {
      "name": "base",
      "hidden": true,
      "binaryDir": "${sourceDir}/../.build/cmake/${presetName}",
      "environment": {
        "WHITE_ROOM_BUILD_ROOT": "${sourceDir}/../.build"
      }
    },
    {
      "name": "debug",
      "displayName": "Debug",
      "inherits": "base",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_EXPORT_COMPILE_COMMANDS": "YES"
      }
    },
    {
      "name": "release",
      "displayName": "Release",
      "inherits": "base",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release",
        "CMAKE_EXPORT_COMPILE_COMMANDS": "NO"
      }
    }
  ],
  "buildPresets": [
    {
      "name": "debug",
      "configurePreset": "debug"
    },
    {
      "name": "release",
      "configurePreset": "release"
    }
  ]
}
EOF

echo -e "${GREEN}Created CMakeUserPresets.json${NC}"

echo ""
echo -e "${BLUE}Step 4: Creating Xcode build configuration${NC}"
echo "============================================================="

# Create Xcode configuration directory
XCODE_CONFIG_DIR="$PROJECT_ROOT/build-config/xcode/xcconfig"
create_dir "$XCODE_CONFIG_DIR"

# Create centralized build settings xcconfig
cat > "$XCODE_CONFIG_DIR/BuildDirectories.xcconfig" << 'EOF'
// White Room Centralized Build Configuration
// This ensures all Xcode builds use .build/ directory

// Build locations
BUILD_ROOT = $(SRCROOT)/../.build/xcode
DERIVED_DATA_DIR = $(SRCROOT)/../.build/xcode/DerivedData

// Intermediate build files
OBJROOT = $(BUILD_ROOT)/Intermediates
SYMROOT = $(BUILD_ROOT)/Products
SHARED_PRECOMPS_DIR = $(BUILD_ROOT)/PrecompiledHeaders

// Module cache
MODULE_CACHE_DIR = $(BUILD_ROOT)/ModuleCache

// Archive locations
ARCHIVE_PATH = $(SRCROOT)/../.artifacts/$(PLATFORM_NAME)
EOF

echo -e "${GREEN}Created BuildDirectories.xcconfig${NC}"

echo ""
echo -e "${BLUE}Step 5: Creating environment configuration${NC}"
echo "============================================================="

# Create environment file for agents
cat > "$PROJECT_ROOT/.claude/BUILD_ENV.md" << 'EOF'
# White Room Build Environment Variables

## Mandatory Environment Variables

All AI agents and build scripts MUST use these environment variables:

```bash
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"

# Build system specific paths
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

## Loading Environment Variables

Add to your shell profile (~/.zshrc or ~/.bashrc):

```bash
# White Room build environment
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

## Agent Usage Rules

1. **Before any build operation**: Check if `.build/` exists
2. **If not present**: Run `./build-config/scripts/setup-builds.sh`
3. **Always use**: Centralized build paths defined above
4. **Never create**: `build/` directories in project root

## Build Command Examples

### CMake
```bash
cmake -B .build/cmake/myproject -S path/to/source
cmake --build .build/cmake/myproject
```

### Xcode
```bash
xcodebuild -project MyProject.xcodeproj \
  -derivedDataPath .build/xcode/DerivedData \
  -scheme MyScheme
```

### Swift Package Manager
```bash
swift build --scratch-path .build/swift
```

### Python
```bash
export PYTHON_BUILD_ROOT=.build/python
pip install . --build .build/python/build
```
EOF

echo -e "${GREEN}Created .claude/BUILD_ENV.md${NC}"

echo ""
echo -e "${BLUE}Step 6: Setting permissions${NC}"
echo "============================================================="

# Make all scripts executable
chmod +x "$SCRIPT_DIR"/*.sh
echo -e "${GREEN}Made scripts executable${NC}"

echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}Build setup complete!${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Run: ./build-config/scripts/migrate-builds.sh"
echo "2. Run: ./build-config/scripts/validate-builds.sh"
echo "3. Update your build commands to use centralized paths"
echo ""
echo "Build directory structure created at:"
echo "  - $BUILD_ROOT"
echo "  - $ARTIFACTS_ROOT"
echo ""
