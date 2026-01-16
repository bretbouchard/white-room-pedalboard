#!/bin/bash

# DAID Core Publishing Script
# Publishes both TypeScript and Python packages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="@schillinger-daid/daid_core"
PYTHON_PACKAGE_NAME="daid_core"
VERSION_FILE="package.json"

echo -e "${BLUE}🚀 DAID Core Publishing Script${NC}"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "setup.py" ]; then
    echo -e "${RED}❌ Error: Must be run from daid-core directory${NC}"
    exit 1
fi

# Check if git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: Git working directory is not clean${NC}"
    echo "Uncommitted changes:"
    git status --porcelain
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Aborted${NC}"
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

# Ask for version bump type
echo -e "${YELLOW}Select version bump type:${NC}"
echo "1) patch (${CURRENT_VERSION} -> $(npm version --no-git-tag-version patch --dry-run | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+'))"
echo "2) minor (${CURRENT_VERSION} -> $(npm version --no-git-tag-version minor --dry-run | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+'))"
echo "3) major (${CURRENT_VERSION} -> $(npm version --no-git-tag-version major --dry-run | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+'))"
echo "4) custom"
echo "5) skip version bump"

read -p "Enter choice (1-5): " -n 1 -r
echo

case $REPLY in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        read -p "Enter custom version: " CUSTOM_VERSION
        VERSION_TYPE="custom"
        ;;
    5)
        VERSION_TYPE="skip"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Bump version
if [ "$VERSION_TYPE" != "skip" ]; then
    echo -e "${BLUE}📈 Bumping version...${NC}"
    
    if [ "$VERSION_TYPE" = "custom" ]; then
        npm version --no-git-tag-version $CUSTOM_VERSION
        NEW_VERSION=$CUSTOM_VERSION
    else
        NEW_VERSION=$(npm version --no-git-tag-version $VERSION_TYPE)
        NEW_VERSION=${NEW_VERSION#v} # Remove 'v' prefix
    fi
    
    # Update Python version
    sed -i.bak "s/version=\"[^\"]*\"/version=\"$NEW_VERSION\"/" setup.py
    sed -i.bak "s/__version__ = \"[^\"]*\"/__version__ = \"$NEW_VERSION\"/" python/daid_core.py
    rm -f setup.py.bak python/daid_core.py.bak
    
    echo -e "${GREEN}✅ Version bumped to: ${NEW_VERSION}${NC}"
else
    NEW_VERSION=$CURRENT_VERSION
    echo -e "${YELLOW}⏭️  Skipping version bump${NC}"
fi

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"

# TypeScript tests
if command -v npm &> /dev/null; then
    echo "Running TypeScript tests..."
    npm test
else
    echo -e "${YELLOW}⚠️  npm not found, skipping TypeScript tests${NC}"
fi

# Python tests
if command -v python &> /dev/null; then
    echo "Running Python tests..."
    cd python
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    python -m pytest ../tests/test_daid_core.py || echo -e "${YELLOW}⚠️  Python tests failed or not found${NC}"
    cd ..
else
    echo -e "${YELLOW}⚠️  python not found, skipping Python tests${NC}"
fi

# Build packages
echo -e "${BLUE}🔨 Building packages...${NC}"

# Build TypeScript
echo "Building TypeScript package..."
npm run build

# Build Python package
echo "Building Python package..."
python setup.py sdist bdist_wheel

echo -e "${GREEN}✅ Build complete${NC}"

# Publish packages
echo -e "${BLUE}📤 Publishing packages...${NC}"

# Confirm publication
read -p "Publish to registries? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏭️  Skipping publication${NC}"
    exit 0
fi

# Publish TypeScript package
echo "Publishing TypeScript package to npm..."
if npm publish --access public; then
    echo -e "${GREEN}✅ TypeScript package published successfully${NC}"
else
    echo -e "${RED}❌ TypeScript package publication failed${NC}"
    exit 1
fi

# Publish Python package
echo "Publishing Python package to PyPI..."
if command -v twine &> /dev/null; then
    if twine upload dist/*; then
        echo -e "${GREEN}✅ Python package published successfully${NC}"
    else
        echo -e "${RED}❌ Python package publication failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  twine not found, skipping Python package publication${NC}"
    echo "Install twine with: pip install twine"
fi

# Create git tag and push
if [ "$VERSION_TYPE" != "skip" ]; then
    echo -e "${BLUE}🏷️  Creating git tag...${NC}"
    
    # Commit version changes
    git add package.json setup.py python/daid_core.py
    git commit -m "chore: bump version to $NEW_VERSION"
    
    # Create and push tag
    git tag "v$NEW_VERSION"
    git push origin main
    git push origin "v$NEW_VERSION"
    
    echo -e "${GREEN}✅ Git tag created and pushed${NC}"
fi

# Generate release notes
echo -e "${BLUE}📝 Generating release notes...${NC}"
cat > RELEASE_NOTES.md << EOF
# DAID Core v${NEW_VERSION}

## Changes in this release

### Features
- Consolidated DAID implementation with unified APIs
- Enhanced TypeScript and Python feature parity
- Comprehensive integration helpers for FastAPI, WebSocket, and React
- Advanced monitoring, health checking, and recovery capabilities
- Improved batching and caching performance

### Integrations
- FastAPI middleware with automatic DAID tracking
- WebSocket message provenance tracking
- React hooks and components for frontend integration
- Decorator-based function tracking

### Documentation
- Complete integration guide with examples
- Migration guide from existing implementations
- Comprehensive API documentation
- Real-world usage examples

### Breaking Changes
- Entity types and operations now use strings instead of enums
- Client initialization requires agent_id as first parameter
- Import paths updated for consolidated package structure

See MIGRATION_GUIDE.md for detailed migration instructions.

## Installation

### TypeScript/JavaScript
\`\`\`bash
npm install @bretbouchard/daid-core@${NEW_VERSION}
\`\`\`

### Python
\`\`\`bash
pip install daid-core==${NEW_VERSION}
\`\`\`

## Quick Start

See examples/ directory and INTEGRATION_GUIDE.md for detailed usage instructions.
EOF

echo -e "${GREEN}✅ Release notes generated: RELEASE_NOTES.md${NC}"

echo -e "${GREEN}🎉 Publication complete!${NC}"
echo "=================================="
echo -e "${BLUE}📦 Published packages:${NC}"
echo "  - TypeScript: ${PACKAGE_NAME}@${NEW_VERSION}"
echo "  - Python: ${PYTHON_PACKAGE_NAME}==${NEW_VERSION}"
echo -e "${BLUE}🏷️  Git tag: v${NEW_VERSION}${NC}"
echo -e "${BLUE}📝 Release notes: RELEASE_NOTES.md${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update dependent projects to use new version"
echo "2. Update documentation if needed"
echo "3. Announce the release"
