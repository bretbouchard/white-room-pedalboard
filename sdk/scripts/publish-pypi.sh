#!/bin/bash

# PyPI Publishing Script for Schillinger SDK Python Package
# This script handles building and publishing the Python SDK to PyPI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_PACKAGE_DIR="packages/python"
REPOSITORY="pypi"
DRY_RUN=false
SKIP_BUILD=false
SKIP_TESTS=false
CLEAN_BUILD=true

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
        --no-clean)
            CLEAN_BUILD=false
            shift
            ;;
        --test-pypi)
            REPOSITORY="testpypi"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run      Perform a dry run without actually publishing"
            echo "  --skip-build   Skip the build step"
            echo "  --skip-tests   Skip running tests"
            echo "  --no-clean     Don't clean build artifacts before building"
            echo "  --test-pypi    Publish to Test PyPI instead of main PyPI"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🐍 Starting PyPI Publishing Process${NC}"
echo -e "${BLUE}Repository: ${REPOSITORY}${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"

# Check if we're in the right directory
if [[ ! -d "$PYTHON_PACKAGE_DIR" ]]; then
    echo -e "${RED}❌ Python package directory not found: $PYTHON_PACKAGE_DIR${NC}"
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

check_tool python3
check_tool pip

# Check if build tools are available
python3 -c "import build" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  'build' package not found. Installing...${NC}"
    pip install build
}

python3 -c "import twine" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  'twine' package not found. Installing...${NC}"
    pip install twine
}

echo -e "${GREEN}✅ Required tools verified${NC}"

# Change to Python package directory
cd "$PYTHON_PACKAGE_DIR"

# Get package information
PACKAGE_NAME=$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['name'])")
PACKAGE_VERSION=$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['version'])")

echo -e "${BLUE}📦 Package: ${PACKAGE_NAME}@${PACKAGE_VERSION}${NC}"

# Check if version already exists on PyPI
check_version_exists() {
    local package=$1
    local version=$2
    local repo=$3
    
    if [[ "$repo" == "testpypi" ]]; then
        pip index versions "$package" --index-url https://test.pypi.org/simple/ 2>/dev/null | grep -q "$version" && return 0 || return 1
    else
        pip index versions "$package" 2>/dev/null | grep -q "$version" && return 0 || return 1
    fi
}

if check_version_exists "$PACKAGE_NAME" "$PACKAGE_VERSION" "$REPOSITORY"; then
    echo -e "${YELLOW}⚠️  Version ${PACKAGE_VERSION} already exists for ${PACKAGE_NAME}${NC}"
    if [[ "$DRY_RUN" == false ]]; then
        echo -e "${RED}❌ Cannot publish existing version. Please update version number.${NC}"
        exit 1
    fi
fi

# Clean previous build artifacts
if [[ "$CLEAN_BUILD" == true ]]; then
    echo -e "${YELLOW}🧹 Cleaning build artifacts...${NC}"
    rm -rf dist/ build/ *.egg-info/
    echo -e "${GREEN}✅ Build artifacts cleaned${NC}"
fi

# Run tests if not skipped
if [[ "$SKIP_TESTS" == false ]]; then
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    
    # Install test dependencies if needed
    if [[ -f "requirements-dev.txt" ]]; then
        pip install -r requirements-dev.txt
    fi
    
    # Run pytest
    python3 -m pytest tests/ -v
    echo -e "${GREEN}✅ Tests passed${NC}"
fi

# Build package if not skipped
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${YELLOW}🔨 Building package...${NC}"
    python3 -m build
    echo -e "${GREEN}✅ Package built successfully${NC}"
    
    # List built files
    echo -e "${BLUE}📋 Built files:${NC}"
    ls -la dist/
fi

# Verify package integrity
echo -e "${YELLOW}🔍 Verifying package integrity...${NC}"
python3 -m twine check dist/*
echo -e "${GREEN}✅ Package integrity verified${NC}"

# Upload to PyPI
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}🔍 DRY RUN: Would upload to ${REPOSITORY}${NC}"
    echo -e "${YELLOW}Files that would be uploaded:${NC}"
    ls -la dist/
else
    echo -e "${GREEN}🚀 Uploading to ${REPOSITORY}...${NC}"
    
    if [[ "$REPOSITORY" == "testpypi" ]]; then
        python3 -m twine upload --repository testpypi dist/*
        echo -e "${GREEN}✅ Successfully uploaded to Test PyPI${NC}"
        echo -e "${BLUE}🔗 View at: https://test.pypi.org/project/${PACKAGE_NAME}/${NC}"
        echo -e "${BLUE}📦 Install with: pip install --index-url https://test.pypi.org/simple/ ${PACKAGE_NAME}${NC}"
    else
        python3 -m twine upload dist/*
        echo -e "${GREEN}✅ Successfully uploaded to PyPI${NC}"
        echo -e "${BLUE}🔗 View at: https://pypi.org/project/${PACKAGE_NAME}/${NC}"
        echo -e "${BLUE}📦 Install with: pip install ${PACKAGE_NAME}${NC}"
    fi
fi

# Return to root directory
cd ../..

echo -e "${GREEN}🎉 PyPI publishing process completed successfully!${NC}"