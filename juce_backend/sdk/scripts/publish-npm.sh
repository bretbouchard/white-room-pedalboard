#!/bin/bash

# NPM Publishing Script for Schillinger SDK
# This script handles publishing all TypeScript/JavaScript packages to NPM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGES_DIR="packages"
REGISTRY="https://registry.npmjs.org/"
DRY_RUN=false
SKIP_BUILD=false
SKIP_TESTS=false
PUBLISH_TAG="latest"

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
        --tag)
            PUBLISH_TAG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run      Perform a dry run without actually publishing"
            echo "  --skip-build   Skip the build step"
            echo "  --skip-tests   Skip running tests"
            echo "  --tag TAG      Publish with specific tag (default: latest)"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Starting NPM Publishing Process${NC}"
echo -e "${BLUE}Registry: ${REGISTRY}${NC}"
echo -e "${BLUE}Tag: ${PUBLISH_TAG}${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"

# Check if user is logged in to NPM
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in to NPM. Please run 'npm login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ NPM authentication verified${NC}"

# Get list of publishable packages (exclude private packages and non-JS packages)
PUBLISHABLE_PACKAGES=(
    "shared"
    "core" 
    "analysis"
    "audio"
    "admin"
    "generation"
    "gateway"
)

# Verify all packages exist
for package in "${PUBLISHABLE_PACKAGES[@]}"; do
    if [[ ! -d "${PACKAGES_DIR}/${package}" ]]; then
        echo -e "${RED}❌ Package directory not found: ${PACKAGES_DIR}/${package}${NC}"
        exit 1
    fi
    
    if [[ ! -f "${PACKAGES_DIR}/${package}/package.json" ]]; then
        echo -e "${RED}❌ package.json not found in: ${PACKAGES_DIR}/${package}${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All package directories verified${NC}"

# Run tests if not skipped
if [[ "$SKIP_TESTS" == false ]]; then
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    npm run test
    echo -e "${GREEN}✅ Tests passed${NC}"
fi

# Build packages if not skipped
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${YELLOW}🔨 Building packages...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build completed${NC}"
fi

# Function to get package version
get_package_version() {
    local package_dir=$1
    node -p "require('./${package_dir}/package.json').version"
}

# Function to check if version exists on NPM
version_exists_on_npm() {
    local package_name=$1
    local version=$2
    npm view "${package_name}@${version}" version > /dev/null 2>&1
}

# Function to publish a single package
publish_package() {
    local package_dir=$1
    local package_name=$(node -p "require('./${package_dir}/package.json').name")
    local package_version=$(get_package_version "${package_dir}")
    
    echo -e "${BLUE}📦 Processing ${package_name}@${package_version}${NC}"
    
    # Check if this version already exists
    if version_exists_on_npm "${package_name}" "${package_version}"; then
        echo -e "${YELLOW}⚠️  Version ${package_version} already exists for ${package_name}, skipping${NC}"
        return 0
    fi
    
    # Change to package directory
    cd "${package_dir}"
    
    # Verify package can be packed
    echo -e "${YELLOW}📋 Verifying package contents...${NC}"
    npm pack --dry-run
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}🔍 DRY RUN: Would publish ${package_name}@${package_version}${NC}"
    else
        echo -e "${GREEN}🚀 Publishing ${package_name}@${package_version}...${NC}"
        npm publish --tag "${PUBLISH_TAG}" --access public
        echo -e "${GREEN}✅ Successfully published ${package_name}@${package_version}${NC}"
    fi
    
    # Return to root directory
    cd ..
}

# Publish packages in dependency order
echo -e "${BLUE}📦 Publishing packages...${NC}"

# First publish shared package (dependency for others)
publish_package "${PACKAGES_DIR}/shared"

# Then publish core packages
for package in "core" "analysis" "audio" "admin" "generation"; do
    publish_package "${PACKAGES_DIR}/${package}"
done

# Finally publish gateway (depends on other packages)
publish_package "${PACKAGES_DIR}/gateway"

echo -e "${GREEN}🎉 NPM publishing process completed successfully!${NC}"

# Display published packages
echo -e "${BLUE}📋 Published packages:${NC}"
for package in "${PUBLISHABLE_PACKAGES[@]}"; do
    package_name=$(node -p "require('./${PACKAGES_DIR}/${package}/package.json').name")
    package_version=$(get_package_version "${PACKAGES_DIR}/${package}")
    echo -e "${GREEN}  ✅ ${package_name}@${package_version}${NC}"
done

echo -e "${BLUE}🔗 View packages at: https://www.npmjs.com/org/schillinger${NC}"