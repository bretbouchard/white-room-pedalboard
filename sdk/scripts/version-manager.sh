#!/bin/bash

# Version Management Script for Schillinger SDK
# Handles semantic versioning across all SDK packages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION_FILE="VERSION"
CHANGELOG_FILE="CHANGELOG.md"
DRY_RUN=false
AUTO_COMMIT=false
BUMP_TYPE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --bump)
            BUMP_TYPE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --auto-commit)
            AUTO_COMMIT=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --bump TYPE    Bump version (major|minor|patch|prerelease)"
            echo "  --dry-run      Show what would be changed without making changes"
            echo "  --auto-commit  Automatically commit version changes"
            echo "  --help         Show this help message"
            echo ""
            echo "Commands:"
            echo "  current        Show current version"
            echo "  validate       Validate version consistency across packages"
            echo "  sync           Sync version across all packages"
            exit 0
            ;;
        current|validate|sync)
            COMMAND="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}📋 Schillinger SDK Version Manager${NC}"

# Get current version
get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        cat "$VERSION_FILE"
    else
        echo "1.0.0"
    fi
}

# Validate semantic version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
        echo -e "${RED}❌ Invalid semantic version format: $version${NC}"
        return 1
    fi
    return 0
}

# Parse semantic version
parse_version() {
    local version=$1
    local major minor patch prerelease
    
    # Remove prerelease suffix if present
    if [[ $version =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-(.+))?$ ]]; then
        major=${BASH_REMATCH[1]}
        minor=${BASH_REMATCH[2]}
        patch=${BASH_REMATCH[3]}
        prerelease=${BASH_REMATCH[5]}
    else
        echo -e "${RED}❌ Failed to parse version: $version${NC}"
        return 1
    fi
    
    echo "$major $minor $patch $prerelease"
}

# Bump version
bump_version() {
    local current_version=$1
    local bump_type=$2
    
    read -r major minor patch prerelease <<< "$(parse_version "$current_version")"
    
    case $bump_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            prerelease=""
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            prerelease=""
            ;;
        patch)
            patch=$((patch + 1))
            prerelease=""
            ;;
        prerelease)
            if [[ -n "$prerelease" ]]; then
                # Increment prerelease number
                if [[ $prerelease =~ ^(.+)\.([0-9]+)$ ]]; then
                    prerelease="${BASH_REMATCH[1]}.$((${BASH_REMATCH[2]} + 1))"
                else
                    prerelease="${prerelease}.1"
                fi
            else
                prerelease="alpha.0"
            fi
            ;;
        *)
            echo -e "${RED}❌ Invalid bump type: $bump_type${NC}"
            return 1
            ;;
    esac
    
    if [[ -n "$prerelease" ]]; then
        echo "${major}.${minor}.${patch}-${prerelease}"
    else
        echo "${major}.${minor}.${patch}"
    fi
}

# Update package.json version
update_package_json() {
    local file=$1
    local version=$2
    
    if [[ -f "$file" ]]; then
        if command -v jq &> /dev/null; then
            jq ".version = \"$version\"" "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        else
            sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/" "$file" && rm "${file}.bak"
        fi
        echo -e "${GREEN}✅ Updated $file${NC}"
    fi
}

# Update pyproject.toml version
update_pyproject_toml() {
    local file=$1
    local version=$2
    
    if [[ -f "$file" ]]; then
        sed -i.bak "s/version = \"[^\"]*\"/version = \"$version\"/" "$file" && rm "${file}.bak"
        echo -e "${GREEN}✅ Updated $file${NC}"
    fi
}

# Update CMakeLists.txt version
update_cmake_version() {
    local file=$1
    local version=$2
    
    if [[ -f "$file" ]]; then
        sed -i.bak "s/project.*VERSION [0-9.]*/project(SchillingerSDK VERSION $version/" "$file" && rm "${file}.bak"
        echo -e "${GREEN}✅ Updated $file${NC}"
    fi
}

# Update Swift Package.swift version (if it contains version)
update_swift_version() {
    local file=$1
    local version=$2
    
    if [[ -f "$file" ]] && grep -q "version:" "$file"; then
        sed -i.bak "s/version: \"[^\"]*\"/version: \"$version\"/" "$file" && rm "${file}.bak"
        echo -e "${GREEN}✅ Updated $file${NC}"
    fi
}

# Get package versions
get_package_versions() {
    echo -e "${BLUE}📦 Package Versions:${NC}"
    
    # Root package.json
    if [[ -f "package.json" ]]; then
        local version=$(node -p "require('./package.json').version" 2>/dev/null || echo "N/A")
        echo -e "${YELLOW}  Root: $version${NC}"
    fi
    
    # Individual packages
    for package_dir in packages/*/; do
        if [[ -d "$package_dir" ]]; then
            local package_name=$(basename "$package_dir")
            local version="N/A"
            
            if [[ -f "${package_dir}package.json" ]]; then
                version=$(node -p "require('./${package_dir}package.json').version" 2>/dev/null || echo "N/A")
            elif [[ -f "${package_dir}pyproject.toml" ]]; then
                version=$(grep "version = " "${package_dir}pyproject.toml" | sed 's/.*version = "\([^"]*\)".*/\1/' || echo "N/A")
            elif [[ -f "${package_dir}CMakeLists.txt" ]]; then
                version=$(grep "project.*VERSION" "${package_dir}CMakeLists.txt" | sed 's/.*VERSION \([0-9.]*\).*/\1/' || echo "N/A")
            fi
            
            echo -e "${YELLOW}  $package_name: $version${NC}"
        fi
    done
}

# Sync versions across all packages
sync_versions() {
    local target_version=$1
    
    echo -e "${BLUE}🔄 Syncing version $target_version across all packages...${NC}"
    
    # Update VERSION file
    echo "$target_version" > "$VERSION_FILE"
    echo -e "${GREEN}✅ Updated $VERSION_FILE${NC}"
    
    # Update root package.json
    update_package_json "package.json" "$target_version"
    
    # Update individual packages
    for package_dir in packages/*/; do
        if [[ -d "$package_dir" ]]; then
            local package_name=$(basename "$package_dir")
            
            # TypeScript/JavaScript packages
            update_package_json "${package_dir}package.json" "$target_version"
            
            # Python packages
            update_pyproject_toml "${package_dir}pyproject.toml" "$target_version"
            
            # C++ packages
            update_cmake_version "${package_dir}CMakeLists.txt" "$target_version"
            
            # Swift packages
            update_swift_version "${package_dir}Package.swift" "$target_version"
        fi
    done
    
    echo -e "${GREEN}✅ Version sync completed${NC}"
}

# Validate version consistency
validate_versions() {
    local target_version=$(get_current_version)
    local inconsistent=false
    
    echo -e "${BLUE}🔍 Validating version consistency...${NC}"
    echo -e "${BLUE}Target version: $target_version${NC}"
    
    # Check individual packages
    for package_dir in packages/*/; do
        if [[ -d "$package_dir" ]]; then
            local package_name=$(basename "$package_dir")
            local version=""
            
            if [[ -f "${package_dir}package.json" ]]; then
                version=$(node -p "require('./${package_dir}package.json').version" 2>/dev/null || echo "")
            elif [[ -f "${package_dir}pyproject.toml" ]]; then
                version=$(grep "version = " "${package_dir}pyproject.toml" | sed 's/.*version = "\([^"]*\)".*/\1/' || echo "")
            elif [[ -f "${package_dir}CMakeLists.txt" ]]; then
                version=$(grep "project.*VERSION" "${package_dir}CMakeLists.txt" | sed 's/.*VERSION \([0-9.]*\).*/\1/' || echo "")
            fi
            
            if [[ -n "$version" && "$version" != "$target_version" ]]; then
                echo -e "${RED}❌ $package_name: $version (expected: $target_version)${NC}"
                inconsistent=true
            else
                echo -e "${GREEN}✅ $package_name: $version${NC}"
            fi
        fi
    done
    
    if [[ "$inconsistent" == true ]]; then
        echo -e "${RED}❌ Version inconsistencies found${NC}"
        return 1
    else
        echo -e "${GREEN}✅ All versions are consistent${NC}"
        return 0
    fi
}

# Main execution
CURRENT_VERSION=$(get_current_version)

case "${COMMAND:-}" in
    current)
        echo -e "${BLUE}Current version: $CURRENT_VERSION${NC}"
        get_package_versions
        ;;
    validate)
        validate_versions
        ;;
    sync)
        sync_versions "$CURRENT_VERSION"
        ;;
    *)
        if [[ -n "$BUMP_TYPE" ]]; then
            NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP_TYPE")
            
            if ! validate_version "$NEW_VERSION"; then
                exit 1
            fi
            
            echo -e "${BLUE}Bumping version: $CURRENT_VERSION → $NEW_VERSION${NC}"
            
            if [[ "$DRY_RUN" == true ]]; then
                echo -e "${YELLOW}🔍 DRY RUN: Would update to version $NEW_VERSION${NC}"
                get_package_versions
            else
                sync_versions "$NEW_VERSION"
                
                if [[ "$AUTO_COMMIT" == true ]]; then
                    git add .
                    git commit -m "chore: bump version to $NEW_VERSION"
                    echo -e "${GREEN}✅ Changes committed${NC}"
                fi
            fi
        else
            echo -e "${BLUE}Current version: $CURRENT_VERSION${NC}"
            get_package_versions
        fi
        ;;
esac