#!/bin/bash
# CLAP Plugin Validation Script
# Validates all CLAP plugins using clap-validator

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JUCE_BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${JUCE_BACKEND_DIR}/build"

echo "🔍 CLAP Plugin Validation Script"
echo "================================="
echo ""

# Check if clap-validator is installed
if ! command -v clap-validator &> /dev/null; then
    echo "❌ clap-validator not found!"
    echo ""
    echo "Install clap-validator:"
    echo "  macOS: brew install clap-validator"
    echo "  Linux: cargo install clap-validator"
    echo "  Source: https://github.com/free-audio/clap-validator"
    exit 1
fi

echo "✓ clap-validator found"
echo ""

# Find all CLAP plugins
CLAP_PLUGINS=($(find "${BUILD_DIR}" -name "*.clap" -type f 2>/dev/null || true))

if [ ${#CLAP_PLUGINS[@]} -eq 0 ]; then
    echo "❌ No CLAP plugins found in ${BUILD_DIR}"
    echo ""
    echo "Build CLAP plugins first:"
    echo "  cd ${JUCE_BACKEND_DIR}"
    echo "  cmake -B build -S . -DCMAKE_BUILD_TYPE=Release -DBUILD_CLAP=ON"
    echo "  cmake --build build --target all"
    exit 1
fi

echo "Found ${#CLAP_PLUGINS[@]} CLAP plugin(s):"
for plugin in "${CLAP_PLUGINS[@]}"; do
    echo "  - $(basename "$plugin")"
done
echo ""

# Validate each plugin
FAILED=0
PASSED=0

for plugin in "${CLAP_PLUGINS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔌 Validating: $(basename "$plugin")"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if clap-validator "$plugin"; then
        echo "✅ PASSED: $(basename "$plugin")"
        ((PASSED++))
    else
        echo "❌ FAILED: $(basename "$plugin")"
        ((FAILED++))
    fi
    echo ""
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:  $((PASSED + FAILED))"
echo "Passed: ${PASSED} ✅"
echo "Failed: ${FAILED} ❌"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "❌ Some plugins failed validation"
    exit 1
else
    echo "✅ All CLAP plugins validated successfully!"
    exit 0
fi
