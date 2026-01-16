#!/bin/bash

# Deprecation Management Script for Schillinger SDK
# Manages deprecation warnings and migration guides

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPRECATIONS_FILE="DEPRECATIONS.md"
MIGRATIONS_DIR="migrations"
DRY_RUN=false
ACTION=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 ACTION [OPTIONS]"
            echo "Actions:"
            echo "  add       Add a new deprecation"
            echo "  list      List all deprecations"
            echo "  remove    Remove a deprecation"
            echo "  generate  Generate migration guide"
            echo "Options:"
            echo "  --dry-run Show what would be done without making changes"
            echo "  --help    Show this help message"
            exit 0
            ;;
        add|list|remove|generate)
            ACTION="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$ACTION" ]]; then
    echo -e "${RED}❌ Action is required${NC}"
    exit 1
fi

echo -e "${BLUE}🚨 Deprecation Manager${NC}"

# Initialize deprecations file if it doesn't exist
init_deprecations_file() {
    if [[ ! -f "$DEPRECATIONS_FILE" ]]; then
        cat > "$DEPRECATIONS_FILE" << EOF
# Deprecations

This file tracks deprecated features in the Schillinger SDK and provides migration paths.

## Format

Each deprecation entry should include:
- **Feature**: The deprecated feature
- **Version**: When it was deprecated
- **Removal**: When it will be removed
- **Replacement**: What to use instead
- **Migration**: How to migrate

---

EOF
        echo -e "${GREEN}✅ Created $DEPRECATIONS_FILE${NC}"
    fi
}

# Add a new deprecation
add_deprecation() {
    echo -e "${YELLOW}📝 Adding new deprecation...${NC}"
    
    read -p "Feature name: " feature_name
    read -p "Deprecated in version: " deprecated_version
    read -p "Will be removed in version: " removal_version
    read -p "Replacement (optional): " replacement
    read -p "Description: " description
    
    local deprecation_id=$(echo "$feature_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    local date=$(date +"%Y-%m-%d")
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}🔍 DRY RUN: Would add deprecation:${NC}"
        echo -e "${YELLOW}  Feature: $feature_name${NC}"
        echo -e "${YELLOW}  Deprecated: $deprecated_version${NC}"
        echo -e "${YELLOW}  Removal: $removal_version${NC}"
        echo -e "${YELLOW}  Replacement: $replacement${NC}"
        return
    fi
    
    # Add to deprecations file
    cat >> "$DEPRECATIONS_FILE" << EOF

## $feature_name

**Deprecated:** $deprecated_version  
**Removal:** $removal_version  
**Date Added:** $date  

### Description
$description

$(if [[ -n "$replacement" ]]; then
    echo "### Replacement"
    echo "$replacement"
fi)

### Migration Guide

\`\`\`typescript
// Before (deprecated)
// TODO: Add example of old usage

// After (recommended)
// TODO: Add example of new usage
\`\`\`

\`\`\`python
# Before (deprecated)
# TODO: Add example of old usage

# After (recommended)
# TODO: Add example of new usage
\`\`\`

---

EOF
    
    # Create migration guide template
    mkdir -p "$MIGRATIONS_DIR"
    cat > "$MIGRATIONS_DIR/$deprecation_id.md" << EOF
# Migration Guide: $feature_name

## Overview
$description

## Timeline
- **Deprecated:** $deprecated_version
- **Removal:** $removal_version

## Migration Steps

### TypeScript/JavaScript

1. **Identify Usage**
   \`\`\`bash
   # Search for deprecated usage in your codebase
   grep -r "deprecated_feature" src/
   \`\`\`

2. **Update Code**
   \`\`\`typescript
   // Before
   // TODO: Add deprecated usage example
   
   // After
   // TODO: Add new usage example
   \`\`\`

### Python

1. **Identify Usage**
   \`\`\`bash
   # Search for deprecated usage in your codebase
   grep -r "deprecated_feature" *.py
   \`\`\`

2. **Update Code**
   \`\`\`python
   # Before
   # TODO: Add deprecated usage example
   
   # After
   # TODO: Add new usage example
   \`\`\`

### Swift

1. **Identify Usage**
   \`\`\`bash
   # Search for deprecated usage in your codebase
   grep -r "deprecated_feature" *.swift
   \`\`\`

2. **Update Code**
   \`\`\`swift
   // Before
   // TODO: Add deprecated usage example
   
   // After
   // TODO: Add new usage example
   \`\`\`

### C++/JUCE

1. **Identify Usage**
   \`\`\`bash
   # Search for deprecated usage in your codebase
   grep -r "deprecated_feature" *.cpp *.h
   \`\`\`

2. **Update Code**
   \`\`\`cpp
   // Before
   // TODO: Add deprecated usage example
   
   // After
   // TODO: Add new usage example
   \`\`\`

## Testing

After migration, ensure your code still works:

\`\`\`bash
# Run your test suite
npm test  # JavaScript/TypeScript
pytest    # Python
swift test # Swift
make test  # C++
\`\`\`

## Support

If you need help with this migration:
- Check the [documentation](https://docs.schillinger.ai)
- Open an issue on [GitHub](https://github.com/schillinger-system/sdk/issues)
- Contact support at support@schillinger.ai
EOF
    
    echo -e "${GREEN}✅ Deprecation added: $feature_name${NC}"
    echo -e "${BLUE}📋 Migration guide created: $MIGRATIONS_DIR/$deprecation_id.md${NC}"
}

# List all deprecations
list_deprecations() {
    echo -e "${BLUE}📋 Current Deprecations:${NC}"
    
    if [[ ! -f "$DEPRECATIONS_FILE" ]]; then
        echo -e "${YELLOW}⚠️  No deprecations file found${NC}"
        return
    fi
    
    # Extract deprecation entries
    grep -E "^## " "$DEPRECATIONS_FILE" | sed 's/^## //' | while read -r feature; do
        echo -e "${YELLOW}  • $feature${NC}"
    done
    
    echo -e "${BLUE}📖 Full details in: $DEPRECATIONS_FILE${NC}"
}

# Remove a deprecation
remove_deprecation() {
    echo -e "${YELLOW}🗑️  Removing deprecation...${NC}"
    
    if [[ ! -f "$DEPRECATIONS_FILE" ]]; then
        echo -e "${RED}❌ No deprecations file found${NC}"
        return 1
    fi
    
    # List current deprecations
    echo -e "${BLUE}Current deprecations:${NC}"
    grep -E "^## " "$DEPRECATIONS_FILE" | sed 's/^## //' | nl
    
    read -p "Enter the number of the deprecation to remove: " dep_number
    
    local feature_name=$(grep -E "^## " "$DEPRECATIONS_FILE" | sed 's/^## //' | sed -n "${dep_number}p")
    
    if [[ -z "$feature_name" ]]; then
        echo -e "${RED}❌ Invalid selection${NC}"
        return 1
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}🔍 DRY RUN: Would remove deprecation: $feature_name${NC}"
        return
    fi
    
    # Remove from deprecations file (this is complex with sed, so we'll use a temp file)
    local temp_file=$(mktemp)
    local in_section=false
    local section_name=""
    
    while IFS= read -r line; do
        if [[ $line =~ ^##[[:space:]] ]]; then
            section_name=$(echo "$line" | sed 's/^## //')
            if [[ "$section_name" == "$feature_name" ]]; then
                in_section=true
                continue
            else
                in_section=false
            fi
        elif [[ $line =~ ^---$ ]] && [[ "$in_section" == true ]]; then
            in_section=false
            continue
        fi
        
        if [[ "$in_section" == false ]]; then
            echo "$line" >> "$temp_file"
        fi
    done < "$DEPRECATIONS_FILE"
    
    mv "$temp_file" "$DEPRECATIONS_FILE"
    
    # Remove migration guide
    local deprecation_id=$(echo "$feature_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    if [[ -f "$MIGRATIONS_DIR/$deprecation_id.md" ]]; then
        rm "$MIGRATIONS_DIR/$deprecation_id.md"
        echo -e "${GREEN}✅ Removed migration guide: $MIGRATIONS_DIR/$deprecation_id.md${NC}"
    fi
    
    echo -e "${GREEN}✅ Removed deprecation: $feature_name${NC}"
}

# Generate comprehensive migration guide
generate_migration_guide() {
    echo -e "${YELLOW}📖 Generating comprehensive migration guide...${NC}"
    
    local output_file="MIGRATION_GUIDE.md"
    local current_version=$(cat VERSION 2>/dev/null || echo "1.0.0")
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}🔍 DRY RUN: Would generate $output_file${NC}"
        return
    fi
    
    cat > "$output_file" << EOF
# Schillinger SDK Migration Guide

**Current Version:** $current_version  
**Generated:** $(date)

This guide helps you migrate between versions of the Schillinger SDK.

## Quick Migration Checklist

- [ ] Review breaking changes below
- [ ] Update package versions
- [ ] Update deprecated API usage
- [ ] Run tests
- [ ] Update documentation

## Breaking Changes by Version

EOF
    
    # Add deprecations if they exist
    if [[ -f "$DEPRECATIONS_FILE" ]]; then
        echo "## Deprecated Features" >> "$output_file"
        echo "" >> "$output_file"
        cat "$DEPRECATIONS_FILE" >> "$output_file"
    fi
    
    cat >> "$output_file" << EOF

## Platform-Specific Migration

### JavaScript/TypeScript

\`\`\`bash
# Update package.json
npm update @schillinger-sdk/core @schillinger-sdk/analysis @schillinger-sdk/audio

# Check for breaking changes
npm audit
\`\`\`

### Python

\`\`\`bash
# Update requirements
pip install --upgrade schillinger-sdk

# Check for compatibility issues
python -m schillinger_sdk.check_compatibility
\`\`\`

### Swift

\`\`\`swift
// Update Package.swift
.package(url: "https://github.com/schillinger-system/sdk", from: "$current_version")
\`\`\`

### C++/JUCE

\`\`\`cmake
# Update CMakeLists.txt
find_package(SchillingerSDK $current_version REQUIRED)
\`\`\`

## Common Migration Patterns

### API Method Renaming

Many methods have been renamed for consistency:

\`\`\`typescript
// Old
sdk.generateRhythmicResultant(3, 2)

// New
sdk.rhythm.generateResultant(3, 2)
\`\`\`

### Configuration Changes

SDK initialization has been simplified:

\`\`\`typescript
// Old
const sdk = new SchillingerSDK({
  apiKey: 'key',
  baseUrl: 'https://api.schillinger.ai',
  timeout: 5000
})

// New
const sdk = new SchillingerSDK({
  apiKey: 'key'
  // baseUrl and timeout are now optional with sensible defaults
})
\`\`\`

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Check that you're using the correct package names
   - Ensure all dependencies are updated

2. **Type Errors**
   - Update TypeScript definitions
   - Check for renamed interfaces

3. **Runtime Errors**
   - Review deprecated method usage
   - Check authentication configuration

### Getting Help

- 📖 [Documentation](https://docs.schillinger.ai)
- 🐛 [Issue Tracker](https://github.com/schillinger-system/sdk/issues)
- 💬 [Discord Community](https://discord.gg/schillinger)
- 📧 [Support Email](mailto:support@schillinger.ai)

EOF
    
    echo -e "${GREEN}✅ Migration guide generated: $output_file${NC}"
}

# Main execution
init_deprecations_file

case "$ACTION" in
    add)
        add_deprecation
        ;;
    list)
        list_deprecations
        ;;
    remove)
        remove_deprecation
        ;;
    generate)
        generate_migration_guide
        ;;
    *)
        echo -e "${RED}❌ Unknown action: $ACTION${NC}"
        exit 1
        ;;
esac