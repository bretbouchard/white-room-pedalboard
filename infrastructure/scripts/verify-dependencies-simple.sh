#!/bin/bash

# White Room Dependency Verification Script (Simplified)
# Verifies all external dependencies are properly installed and accessible

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SDK_PATH="$PROJECT_ROOT/sdk"
JUCE_BACKEND_PATH="$PROJECT_ROOT/juce_backend"

echo "=================================================="
echo "White Room Dependency Verification"
echo "=================================================="
echo ""

# Track overall status
ALL_PASSED=true

# =============================================================================
# 1. Verify node-addon-api (TypeScript SDK - NAPI FFI)
# =============================================================================
echo "📦 Checking node-addon-api..."
if [ -f "$SDK_PATH/node_modules/node-addon-api/package.json" ]; then
    VERSION=$(grep '"version"' "$SDK_PATH/node_modules/node-addon-api/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "   ✓ node-addon-api v$VERSION installed"
    echo "     Location: $SDK_PATH/node_modules/node-addon-api"

    # Check if it's referenced in FFI package
    if [ -f "$SDK_PATH/packages/ffi/package.json" ]; then
        if grep -q "node-addon-api" "$SDK_PATH/packages/ffi/package.json"; then
            echo "   ✓ Referenced in @white-room/ffi package.json"
        else
            echo "   ✗ NOT referenced in @white-room/ffi package.json"
            ALL_PASSED=false
        fi
    fi
else
    echo "   ✗ node-addon-api NOT installed"
    echo "     Run: cd $SDK_PATH && npm install"
    ALL_PASSED=false
fi
echo ""

# =============================================================================
# 2. Verify nlohmann/json (C++ JUCE Backend)
# =============================================================================
echo "📦 Checking nlohmann/json..."
NLOHMANN_FOUND=false

# Check Homebrew installation
if command -v brew &> /dev/null; then
    if brew list nlohmann-json &> /dev/null 2>&1; then
        echo "   ✓ nlohmann-json installed via Homebrew"
        NLOHMANN_FOUND=true

        # Find json.hpp
        JSON_HPP=$(find /opt/homebrew -name "json.hpp" 2>/dev/null | grep nlohmann | head -1)
        if [ -n "$JSON_HPP" ]; then
            echo "     Location: $JSON_HPP"
        fi
    else
        echo "   ⚠ nlohmann-json NOT installed via Homebrew"
    fi
else
    echo "   ⚠ Homebrew not found"
fi

# Check if referenced in CMakeLists.txt
if [ -f "$JUCE_BACKEND_PATH/CMakeLists.txt" ]; then
    if grep -q "nlohmann/json" "$JUCE_BACKEND_PATH/CMakeLists.txt"; then
        echo "   ✓ Referenced in CMakeLists.txt"
    else
        echo "   ✗ NOT referenced in CMakeLists.txt"
        ALL_PASSED=false
    fi
fi

if [ "$NLOHMANN_FOUND" = false ]; then
    echo "     To install: brew install nlohmann-json"
    ALL_PASSED=false
fi
echo ""

# =============================================================================
# 3. Verify ajv (TypeScript SDK - JSON Schema Validation)
# =============================================================================
echo "📦 Checking ajv (JSON Schema Validation)..."
AJV_FOUND=false

# Check in schemas package
if [ -f "$SDK_PATH/packages/schemas/package.json" ]; then
    if grep -q '"ajv"' "$SDK_PATH/packages/schemas/package.json"; then
        VERSION=$(grep '"ajv"' "$SDK_PATH/packages/schemas/package.json" | head -1 | sed 's/.*"ajv": "\(.*\)".*/\1/')
        echo "   ✓ ajv $VERSION in @white-room/schemas"

        # Check if it's actually installed
        if [ -d "$SDK_PATH/packages/schemas/node_modules/ajv" ]; then
            ACTUAL_VERSION=$(cat "$SDK_PATH/packages/schemas/node_modules/ajv/package.json" | grep '"version"' | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
            echo "   ✓ ajv v$ACTUAL_VERSION installed"
            AJV_FOUND=true
        else
            echo "   ⚠ Listed in package.json but not installed"
            echo "     Run: cd $SDK_PATH/packages/schemas && npm install"
        fi
    fi
fi

# Check in core package
if [ -f "$SDK_PATH/packages/core/package.json" ]; then
    if grep -q '"ajv"' "$SDK_PATH/packages/core/package.json" ]; then
        echo "   ✓ ajv referenced in @schillinger-sdk/core"
    fi
fi

# Check SDK root
if [ -d "$SDK_PATH/node_modules/ajv" ]; then
    echo "   ✓ ajv available in SDK root node_modules"
    AJV_FOUND=true
fi

if [ "$AJV_FOUND" = false ]; then
    echo "     To install: cd $SDK_PATH && npm install"
    ALL_PASSED=false
fi
echo ""

# =============================================================================
# 4. Verify pcg-random (TypeScript SDK)
# =============================================================================
echo "📦 Checking pcg-random (TypeScript PRNG)..."
PCG_FOUND=false

if [ -f "$SDK_PATH/packages/core/package.json" ]; then
    if grep -q '"pcg-random"' "$SDK_PATH/packages/core/package.json" ]; then
        VERSION=$(grep '"pcg-random"' "$SDK_PATH/packages/core/package.json" | head -1 | sed 's/.*"pcg-random": "\(.*\)".*/\1/')
        echo "   ✓ pcg-random $VERSION in @schillinger-sdk/core"

        # Check if it's actually installed
        if [ -d "$SDK_PATH/packages/core/node_modules/pcg-random" ]; then
            echo "   ✓ pcg-random installed"
            PCG_FOUND=true
        else
            echo "   ⚠ Listed in package.json but not installed"
        fi
    fi
fi

# Check for tests (39 tests passing is the goal)
if [ -f "$SDK_PATH/packages/core/test/prng/pcg-random.test.ts" ]; then
    echo "   ✓ Test file exists"
    echo "     To run tests: cd $SDK_PATH && npm test -- pcg-random"
fi

if [ "$PCG_FOUND" = false ]; then
    echo "     To install: cd $SDK_PATH/packages/core && npm install"
    ALL_PASSED=false
fi
echo ""

# =============================================================================
# 5. Verify FFI Build Status
# =============================================================================
echo "📦 Checking FFI Native Addon Build..."
if [ -f "$SDK_PATH/packages/ffi/build/Makefile" ]; then
    echo "   ✓ FFI build directory exists"

    # Check if .node file was built
    if find "$SDK_PATH/packages/ffi/build/Release" -name "*.node" 2>/dev/null | grep -q .; then
        echo "   ✓ Native addon compiled (.node file exists)"
    else
        echo "   ⚠ Native addon not built yet"
        echo "     To build: cd $SDK_PATH/packages/ffi && npm run build"
    fi
else
    echo "   ⚠ FFI not built yet"
    echo "     To build: cd $SDK_PATH/packages/ffi && npm run build"
fi
echo ""

# =============================================================================
# 6. Verify JUCE FFI Layer
# =============================================================================
echo "📦 Checking JUCE FFI Layer..."
if [ -d "$JUCE_BACKEND_PATH/src/ffi" ]; then
    echo "   ✓ JUCE FFI directory exists"

    # Check for key files
    if [ -f "$JUCE_BACKEND_PATH/src/ffi/JuceFFI.mm" ]; then
        echo "   ✓ JuceFFI.mm found"
    fi

    if [ -f "$JUCE_BACKEND_PATH/src/ffi/sch_engine.hpp" ]; then
        echo "   ✓ sch_engine.hpp found"
    fi

    if [ -f "$JUCE_BACKEND_PATH/src/ffi/CMakeLists.txt" ]; then
        echo "   ✓ CMakeLists.txt found"
    fi
else
    echo "   ✗ JUCE FFI directory not found"
    ALL_PASSED=false
fi
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=================================================="
if [ "$ALL_PASSED" = true ]; then
    echo "✓ All dependencies verified successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Build FFI: cd $SDK_PATH/packages/ffi && npm run build"
    echo "  2. Run tests: cd $SDK_PATH && npm test"
    echo "  3. Build JUCE: cd $JUCE_BACKEND_PATH && cmake -B build"
else
    echo "✗ Some dependencies are missing or incomplete"
    echo ""
    echo "Please follow the installation steps above to fix missing dependencies."
    exit 1
fi
echo "=================================================="
