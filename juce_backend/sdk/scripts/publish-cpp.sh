#!/bin/bash

# JUCE/C++ Distribution Script for Schillinger SDK
# This script handles building and packaging the C++ library for distribution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CPP_PACKAGE_DIR="packages/juce-cpp"
BUILD_DIR="build"
INSTALL_PREFIX="/usr/local"
DRY_RUN=false
SKIP_BUILD=false
SKIP_TESTS=false
BUILD_TYPE="Release"
CLEAN_BUILD=true
CREATE_ARCHIVE=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --debug)
            BUILD_TYPE="Debug"
            shift
            ;;
        --no-clean)
            CLEAN_BUILD=false
            shift
            ;;
        --no-archive)
            CREATE_ARCHIVE=false
            shift
            ;;
        --prefix)
            INSTALL_PREFIX="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run      Perform a dry run without actually building"
            echo "  --skip-build   Skip the build step"
            echo "  --skip-tests   Skip running tests"
            echo "  --debug        Build in Debug mode (default: Release)"
            echo "  --no-clean     Don't clean build directory before building"
            echo "  --no-archive   Don't create distribution archive"
            echo "  --prefix PATH  Installation prefix (default: /usr/local)"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}⚙️  Starting JUCE/C++ Distribution Process${NC}"
echo -e "${BLUE}Build Type: ${BUILD_TYPE}${NC}"
echo -e "${BLUE}Install Prefix: ${INSTALL_PREFIX}${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"

# Check if we're in the right directory
if [[ ! -d "$CPP_PACKAGE_DIR" ]]; then
    echo -e "${RED}❌ C++ package directory not found: $CPP_PACKAGE_DIR${NC}"
    exit 1
fi

# Check if required tools are installed
check_tool() {
    local tool=$1
    if ! command -v "$tool" &> /dev/null; then
        echo -e "${RED}❌ $tool is not installed. Please install it first.${NC}"
        exit 1
    fi
}

check_tool cmake
check_tool make

# Check for JUCE installation
check_juce() {
    local juce_paths=(
        "/usr/local/include/juce_core"
        "/opt/homebrew/include/juce_core"
        "/usr/include/juce_core"
    )
    
    for path in "${juce_paths[@]}"; do
        if [[ -d "$path" ]]; then
            echo -e "${GREEN}✅ JUCE found at: $path${NC}"
            return 0
        fi
    done
    
    echo -e "${RED}❌ JUCE not found. Please install JUCE framework first.${NC}"
    echo -e "${YELLOW}💡 Install JUCE from: https://juce.com/get-juce${NC}"
    exit 1
}

check_juce

echo -e "${GREEN}✅ Required tools verified${NC}"

# Change to C++ package directory
cd "$CPP_PACKAGE_DIR"

# Get package version from CMakeLists.txt
get_package_version() {
    grep "project.*VERSION" CMakeLists.txt | sed 's/.*VERSION \([0-9.]*\).*/\1/' | head -1
}

PACKAGE_VERSION=$(get_package_version)
echo -e "${BLUE}📦 Package Version: ${PACKAGE_VERSION}${NC}"

# Clean build directory if requested
if [[ "$CLEAN_BUILD" == true && -d "$BUILD_DIR" ]]; then
    echo -e "${YELLOW}🧹 Cleaning build directory...${NC}"
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}✅ Build directory cleaned${NC}"
fi

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with CMake if not skipped
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${YELLOW}⚙️  Configuring with CMake...${NC}"
    cmake .. \
        -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
        -DCMAKE_INSTALL_PREFIX="$INSTALL_PREFIX" \
        -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
    
    echo -e "${GREEN}✅ CMake configuration completed${NC}"
    
    echo -e "${YELLOW}🔨 Building C++ library...${NC}"
    make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    echo -e "${GREEN}✅ Build completed successfully${NC}"
fi

# Run tests if not skipped and test target exists
if [[ "$SKIP_TESTS" == false ]]; then
    if make help | grep -q "test"; then
        echo -e "${YELLOW}🧪 Running C++ tests...${NC}"
        make test
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  No test target found, skipping tests${NC}"
    fi
fi

# Create installation package
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}🔍 DRY RUN: Would create installation package${NC}"
    echo -e "${YELLOW}Files that would be installed:${NC}"
    make install DESTDIR=/tmp/schillinger-sdk-install-preview
    find /tmp/schillinger-sdk-install-preview -type f
    rm -rf /tmp/schillinger-sdk-install-preview
else
    # Create staging directory for packaging
    STAGING_DIR="../dist/schillinger-sdk-cpp-${PACKAGE_VERSION}"
    mkdir -p "$STAGING_DIR"
    
    echo -e "${YELLOW}📦 Creating installation package...${NC}"
    make install DESTDIR="$STAGING_DIR"
    
    # Copy additional files
    cp ../README.md "$STAGING_DIR/"
    cp ../CMakeLists.txt "$STAGING_DIR/"
    
    # Create examples directory
    mkdir -p "$STAGING_DIR/examples"
    cp -r ../examples/* "$STAGING_DIR/examples/" 2>/dev/null || true
    
    # Create pkg-config file
    mkdir -p "$STAGING_DIR/lib/pkgconfig"
    cat > "$STAGING_DIR/lib/pkgconfig/schillinger-sdk.pc" << EOF
prefix=${INSTALL_PREFIX}
exec_prefix=\${prefix}
libdir=\${exec_prefix}/lib
includedir=\${prefix}/include

Name: SchillingerSDK
Description: Schillinger System SDK for C++/JUCE
Version: ${PACKAGE_VERSION}
Libs: -L\${libdir} -lSchillingerSDK
Cflags: -I\${includedir}
Requires: juce
EOF
    
    # Create CMake config files
    mkdir -p "$STAGING_DIR/lib/cmake/SchillingerSDK"
    cat > "$STAGING_DIR/lib/cmake/SchillingerSDK/SchillingerSDKConfig.cmake" << EOF
# SchillingerSDK CMake configuration file

include(CMakeFindDependencyMacro)

# Find required dependencies
find_dependency(PkgConfig REQUIRED)
pkg_check_modules(JUCE REQUIRED juce)

# Include targets
include("\${CMAKE_CURRENT_LIST_DIR}/SchillingerSDKTargets.cmake")

# Set variables for compatibility
set(SchillingerSDK_FOUND TRUE)
set(SchillingerSDK_VERSION "${PACKAGE_VERSION}")
set(SchillingerSDK_INCLUDE_DIRS "\${CMAKE_CURRENT_LIST_DIR}/../../../include")
set(SchillingerSDK_LIBRARIES SchillingerSDK::SchillingerSDK)
EOF
    
    cat > "$STAGING_DIR/lib/cmake/SchillingerSDK/SchillingerSDKConfigVersion.cmake" << EOF
# SchillingerSDK version file
set(PACKAGE_VERSION "${PACKAGE_VERSION}")

# Check whether the requested PACKAGE_FIND_VERSION is compatible
if("\${PACKAGE_VERSION}" VERSION_LESS "\${PACKAGE_FIND_VERSION}")
    set(PACKAGE_VERSION_COMPATIBLE FALSE)
else()
    set(PACKAGE_VERSION_COMPATIBLE TRUE)
    if("\${PACKAGE_VERSION}" VERSION_EQUAL "\${PACKAGE_FIND_VERSION}")
        set(PACKAGE_VERSION_EXACT TRUE)
    endif()
endif()
EOF
    
    # Create installation script
    cat > "$STAGING_DIR/install.sh" << 'EOF'
#!/bin/bash

# SchillingerSDK Installation Script

set -e

PREFIX="${1:-/usr/local}"
echo "Installing SchillingerSDK to: $PREFIX"

# Check for root permissions if installing to system directories
if [[ "$PREFIX" == "/usr/local" || "$PREFIX" == "/usr" ]] && [[ $EUID -ne 0 ]]; then
    echo "Root permissions required for system installation. Use sudo."
    exit 1
fi

# Copy files
cp -r include/* "$PREFIX/include/"
cp -r lib/* "$PREFIX/lib/"

# Update library cache on Linux
if command -v ldconfig &> /dev/null; then
    ldconfig
fi

echo "✅ SchillingerSDK installed successfully!"
echo "📖 Include in your CMake project with: find_package(SchillingerSDK REQUIRED)"
echo "🔗 Link with: target_link_libraries(your_target SchillingerSDK::SchillingerSDK)"
EOF
    
    chmod +x "$STAGING_DIR/install.sh"
    
    echo -e "${GREEN}✅ Installation package created${NC}"
    
    # Create archive if requested
    if [[ "$CREATE_ARCHIVE" == true ]]; then
        cd ../dist
        ARCHIVE_NAME="schillinger-sdk-cpp-${PACKAGE_VERSION}.tar.gz"
        echo -e "${YELLOW}📦 Creating distribution archive: ${ARCHIVE_NAME}${NC}"
        tar -czf "$ARCHIVE_NAME" "schillinger-sdk-cpp-${PACKAGE_VERSION}"
        
        # Create checksums
        if command -v sha256sum &> /dev/null; then
            sha256sum "$ARCHIVE_NAME" > "${ARCHIVE_NAME}.sha256"
        elif command -v shasum &> /dev/null; then
            shasum -a 256 "$ARCHIVE_NAME" > "${ARCHIVE_NAME}.sha256"
        fi
        
        echo -e "${GREEN}✅ Distribution archive created: ${ARCHIVE_NAME}${NC}"
        echo -e "${BLUE}📋 Archive contents:${NC}"
        tar -tzf "$ARCHIVE_NAME" | head -20
        
        if [[ $(tar -tzf "$ARCHIVE_NAME" | wc -l) -gt 20 ]]; then
            echo "... and $(($(tar -tzf "$ARCHIVE_NAME" | wc -l) - 20)) more files"
        fi
        
        cd ..
    fi
fi

# Return to root directory
cd ../../..

echo -e "${GREEN}🎉 C++ distribution process completed successfully!${NC}"

# Display usage instructions
echo -e "${BLUE}📖 Usage Instructions:${NC}"
echo -e "${GREEN}  1. Extract the archive:${NC}"
echo -e "${YELLOW}     tar -xzf schillinger-sdk-cpp-${PACKAGE_VERSION}.tar.gz${NC}"
echo -e "${GREEN}  2. Install the library:${NC}"
echo -e "${YELLOW}     cd schillinger-sdk-cpp-${PACKAGE_VERSION}${NC}"
echo -e "${YELLOW}     sudo ./install.sh${NC}"
echo -e "${GREEN}  3. Use in your CMake project:${NC}"
echo -e "${YELLOW}     find_package(SchillingerSDK REQUIRED)${NC}"
echo -e "${YELLOW}     target_link_libraries(your_target SchillingerSDK::SchillingerSDK)${NC}"
echo -e "${GREEN}  4. Include in your C++ files:${NC}"
echo -e "${YELLOW}     #include <SchillingerSDK/SchillingerSDK.h>${NC}"