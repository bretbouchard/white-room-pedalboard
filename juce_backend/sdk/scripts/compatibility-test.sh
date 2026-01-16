#!/bin/bash

# Backward Compatibility Testing Script for Schillinger SDK
# Tests compatibility between different versions of the SDK

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="compatibility-tests"
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "1.0.0")
COMPARE_VERSION=""
DRY_RUN=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --compare)
            COMPARE_VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --compare VER    Version to compare against (default: previous minor)"
            echo "  --dry-run        Show what would be tested without running tests"
            echo "  --verbose        Show detailed output"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔄 Starting Backward Compatibility Testing${NC}"
echo -e "${BLUE}Current Version: $CURRENT_VERSION${NC}"

# Determine comparison version if not provided
if [[ -z "$COMPARE_VERSION" ]]; then
    # Get the previous minor version
    IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
    if [[ $minor -gt 0 ]]; then
        COMPARE_VERSION="$major.$((minor - 1)).0"
    else
        COMPARE_VERSION="$((major - 1)).0.0"
    fi
fi

echo -e "${BLUE}Compare Version: $COMPARE_VERSION${NC}"

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Function to create compatibility test for TypeScript/JavaScript
create_js_compatibility_test() {
    local version=$1
    local test_name="js-compatibility-$version"
    
    mkdir -p "$test_name"
    cd "$test_name"
    
    # Create package.json
    cat > package.json << EOF
{
  "name": "compatibility-test-$version",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@schillinger-sdk/core": "$version",
    "@schillinger-sdk/analysis": "$version"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
    
    # Create test file
    cat > test.ts << 'EOF'
import { SchillingerSDK } from '@schillinger-sdk/core';
import { AnalysisAPI } from '@schillinger-sdk/analysis';

// Test basic API compatibility
async function testCompatibility() {
    const sdk = new SchillingerSDK({
        apiKey: 'test-key'
    });
    
    // Test rhythm API
    try {
        const rhythm = await sdk.rhythm.generateResultant(3, 2);
        console.log('✅ Rhythm API compatible');
    } catch (error) {
        console.log('❌ Rhythm API incompatible:', error.message);
    }
    
    // Test harmony API
    try {
        const harmony = await sdk.harmony.generateProgression('C', 'major', 4);
        console.log('✅ Harmony API compatible');
    } catch (error) {
        console.log('❌ Harmony API incompatible:', error.message);
    }
    
    // Test analysis API
    try {
        const analysis = new AnalysisAPI();
        console.log('✅ Analysis API compatible');
    } catch (error) {
        console.log('❌ Analysis API incompatible:', error.message);
    }
}

testCompatibility().catch(console.error);
EOF
    
    cd ..
}

# Function to create compatibility test for Python
create_python_compatibility_test() {
    local version=$1
    local test_name="python-compatibility-$version"
    
    mkdir -p "$test_name"
    cd "$test_name"
    
    # Create requirements.txt
    cat > requirements.txt << EOF
schillinger-sdk==$version
EOF
    
    # Create test file
    cat > test.py << 'EOF'
import asyncio
from schillinger_sdk import SchillingerSDK
from schillinger_sdk.analysis import AnalysisAPI

async def test_compatibility():
    """Test basic API compatibility"""
    sdk = SchillingerSDK(api_key='test-key')
    
    # Test rhythm API
    try:
        rhythm = await sdk.rhythm.generate_resultant(3, 2)
        print('✅ Rhythm API compatible')
    except Exception as error:
        print(f'❌ Rhythm API incompatible: {error}')
    
    # Test harmony API
    try:
        harmony = await sdk.harmony.generate_progression('C', 'major', 4)
        print('✅ Harmony API compatible')
    except Exception as error:
        print(f'❌ Harmony API incompatible: {error}')
    
    # Test analysis API
    try:
        analysis = AnalysisAPI()
        print('✅ Analysis API compatible')
    except Exception as error:
        print(f'❌ Analysis API incompatible: {error}')

if __name__ == '__main__':
    asyncio.run(test_compatibility())
EOF
    
    cd ..
}

# Function to run compatibility tests
run_compatibility_tests() {
    local version=$1
    local results=()
    
    echo -e "${YELLOW}🧪 Testing compatibility with version $version...${NC}"
    
    # Test JavaScript/TypeScript
    if [[ -d "js-compatibility-$version" ]]; then
        cd "js-compatibility-$version"
        echo -e "${BLUE}📦 Installing JavaScript dependencies...${NC}"
        
        if npm install > /dev/null 2>&1; then
            echo -e "${BLUE}🔍 Running JavaScript compatibility test...${NC}"
            if npx ts-node test.ts 2>&1 | tee js-test-output.log; then
                results+=("JS: ✅")
            else
                results+=("JS: ❌")
            fi
        else
            echo -e "${RED}❌ Failed to install JavaScript dependencies${NC}"
            results+=("JS: ❌ (install failed)")
        fi
        cd ..
    fi
    
    # Test Python
    if [[ -d "python-compatibility-$version" ]]; then
        cd "python-compatibility-$version"
        echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
        
        if python -m venv venv && source venv/bin/activate && pip install -r requirements.txt > /dev/null 2>&1; then
            echo -e "${BLUE}🔍 Running Python compatibility test...${NC}"
            if python test.py 2>&1 | tee python-test-output.log; then
                results+=("Python: ✅")
            else
                results+=("Python: ❌")
            fi
            deactivate
        else
            echo -e "${RED}❌ Failed to install Python dependencies${NC}"
            results+=("Python: ❌ (install failed)")
        fi
        cd ..
    fi
    
    # Display results
    echo -e "${BLUE}📋 Compatibility Results for $version:${NC}"
    for result in "${results[@]}"; do
        echo -e "${YELLOW}  $result${NC}"
    done
    
    return 0
}

# Function to generate compatibility report
generate_compatibility_report() {
    local report_file="compatibility-report.md"
    
    cat > "$report_file" << EOF
# Backward Compatibility Report

**Generated:** $(date)
**Current Version:** $CURRENT_VERSION
**Compared Against:** $COMPARE_VERSION

## Summary

This report shows the backward compatibility status between version $CURRENT_VERSION and $COMPARE_VERSION.

## Test Results

### JavaScript/TypeScript SDK

EOF
    
    if [[ -f "js-compatibility-$COMPARE_VERSION/js-test-output.log" ]]; then
        echo "#### Test Output" >> "$report_file"
        echo '```' >> "$report_file"
        cat "js-compatibility-$COMPARE_VERSION/js-test-output.log" >> "$report_file"
        echo '```' >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

### Python SDK

EOF
    
    if [[ -f "python-compatibility-$COMPARE_VERSION/python-test-output.log" ]]; then
        echo "#### Test Output" >> "$report_file"
        echo '```' >> "$report_file"
        cat "python-compatibility-$COMPARE_VERSION/python-test-output.log" >> "$report_file"
        echo '```' >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## Breaking Changes

$(git log --pretty=format:"- %s" "v$COMPARE_VERSION"..HEAD | grep -i "break\|remove\|deprecat" || echo "No breaking changes detected")

## Migration Guide

### From $COMPARE_VERSION to $CURRENT_VERSION

1. Update package versions in your dependency files
2. Review the changelog for any API changes
3. Run your tests to ensure compatibility
4. Update any deprecated API usage

## Recommendations

- Test your application thoroughly with the new version
- Review the full changelog for detailed changes
- Consider using semantic versioning constraints in your dependencies

EOF
    
    echo -e "${GREEN}✅ Compatibility report generated: $report_file${NC}"
}

# Main execution
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}🔍 DRY RUN: Would test compatibility between $CURRENT_VERSION and $COMPARE_VERSION${NC}"
    echo -e "${YELLOW}Test structure that would be created:${NC}"
    echo -e "${YELLOW}  - js-compatibility-$COMPARE_VERSION/${NC}"
    echo -e "${YELLOW}  - python-compatibility-$COMPARE_VERSION/${NC}"
    echo -e "${YELLOW}  - compatibility-report.md${NC}"
else
    # Create compatibility tests
    echo -e "${YELLOW}📝 Creating compatibility tests...${NC}"
    create_js_compatibility_test "$COMPARE_VERSION"
    create_python_compatibility_test "$COMPARE_VERSION"
    
    # Run tests
    run_compatibility_tests "$COMPARE_VERSION"
    
    # Generate report
    generate_compatibility_report
    
    echo -e "${GREEN}🎉 Compatibility testing completed!${NC}"
    echo -e "${BLUE}📋 Results available in: $TEST_DIR/compatibility-report.md${NC}"
fi

# Return to original directory
cd ..