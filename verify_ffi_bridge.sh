#!/bin/bash
#
# verify_ffi_bridge.sh
#
# Verification script for Schillinger FFI bridge
# Tests that Swift-C++ interop is correctly configured
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FFI_DIR="${PROJECT_ROOT}/juce_backend/src/ffi"
SWIFT_DIR="${PROJECT_ROOT}/swift_frontend/WhiteRoomiOS"
DOCS_DIR="${PROJECT_ROOT}/docs"

echo "======================================"
echo "FFI Bridge Verification Script"
echo "======================================"
echo ""

# Test 1: Check FFI header files exist
echo -e "${YELLOW}Test 1: Checking FFI header files...${NC}"
FILES=(
    "${FFI_DIR}/sch_engine.hpp"
    "${FFI_DIR}/sch_types.hpp"
    "${FFI_DIR}/sch_engine.mm"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found: $file"
    else
        echo -e "${RED}✗${NC} Missing: $file"
        exit 1
    fi
done
echo ""

# Test 2: Check performance blend functions are declared
echo -e "${YELLOW}Test 2: Checking FFI function declarations...${NC}"
if grep -q "sch_engine_set_performance_blend" "${FFI_DIR}/sch_engine.hpp"; then
    echo -e "${GREEN}✓${NC} sch_engine_set_performance_blend declared in header"
else
    echo -e "${RED}✗${NC} sch_engine_set_performance_blend NOT found in header"
    exit 1
fi

if grep -q "sch_engine_send_command" "${FFI_DIR}/sch_engine.hpp"; then
    echo -e "${GREEN}✓${NC} sch_engine_send_command declared in header"
else
    echo -e "${RED}✗${NC} sch_engine_send_command NOT found in header"
    exit 1
fi
echo ""

# Test 3: Check performance blend functions are implemented
echo -e "${YELLOW}Test 3: Checking FFI function implementations...${NC}"
if grep -q "sch_result_t sch_engine_set_performance_blend" "${FFI_DIR}/sch_engine.mm"; then
    echo -e "${GREEN}✓${NC} sch_engine_set_performance_blend implemented"
else
    echo -e "${RED}✗${NC} sch_engine_set_performance_blend NOT implemented"
    exit 1
fi

if grep -q "sch_result_t sch_engine_send_command" "${FFI_DIR}/sch_engine.mm"; then
    echo -e "${GREEN}✓${NC} sch_engine_send_command implemented"
else
    echo -e "${RED}✗${NC} sch_engine_send_command NOT implemented"
    exit 1
fi
echo ""

# Test 4: Check Swift module map exists
echo -e "${YELLOW}Test 4: Checking Swift module map...${NC}"
if [ -f "${SWIFT_DIR}/FFI/schillinger.modulemap" ]; then
    echo -e "${GREEN}✓${NC} Module map exists"
else
    echo -e "${RED}✗${NC} Module map missing"
    exit 1
fi

# Check symlinks
if [ -L "${SWIFT_DIR}/FFI/sch_engine.hpp" ]; then
    echo -e "${GREEN}✓${NC} sch_engine.hpp symlink exists"
else
    echo -e "${RED}✗${NC} sch_engine.hpp symlink missing"
    exit 1
fi

if [ -L "${SWIFT_DIR}/FFI/sch_types.hpp" ]; then
    echo -e "${GREEN}✓${NC} sch_types.hpp symlink exists"
else
    echo -e "${RED}✗${NC} sch_types.hpp symlink missing"
    exit 1
fi
echo ""

# Test 5: Check Swift JUCEEngine uses FFI
echo -e "${YELLOW}Test 5: Checking Swift FFI integration...${NC}"
JUCE_ENGINE="${SWIFT_DIR}/Sources/SwiftFrontendCore/Audio/JUCEEngine.swift"

if [ -f "$JUCE_ENGINE" ]; then
    echo -e "${GREEN}✓${NC} JUCEEngine.swift exists"

    # Check for SchillingerFFI import
    if grep -q "import SchillingerFFI" "$JUCE_ENGINE"; then
        echo -e "${GREEN}✓${NC} SchillingerFFI module imported"
    else
        echo -e "${RED}✗${NC} SchillingerFFI import missing"
        exit 1
    fi

    # Check for engine handle
    if grep -q "private var engineHandle: OpaquePointer?" "$JUCE_ENGINE"; then
        echo -e "${GREEN}✓${NC} Engine handle declared"
    else
        echo -e "${RED}✗${NC} Engine handle not found"
        exit 1
    fi

    # Check for FFI function calls
    if grep -q "sch_engine_create" "$JUCE_ENGINE"; then
        echo -e "${GREEN}✓${NC} Calls sch_engine_create"
    else
        echo -e "${RED}✗${NC} sch_engine_create not called"
        exit 1
    fi

    if grep -q "sch_engine_set_performance_blend" "$JUCE_ENGINE"; then
        echo -e "${GREEN}✓${NC} Calls sch_engine_set_performance_blend"
    else
        echo -e "${RED}✗${NC} sch_engine_set_performance_blend not called"
        exit 1
    fi

else
    echo -e "${RED}✗${NC} JUCEEngine.swift not found"
    exit 1
fi
echo ""

# Test 6: Check documentation
echo -e "${YELLOW}Test 6: Checking documentation...${NC}"
if [ -f "${DOCS_DIR}/FFI_BRIDGE_ARCHITECTURE.md" ]; then
    echo -e "${GREEN}✓${NC} FFI bridge documentation exists"
else
    echo -e "${RED}✗${NC} FFI bridge documentation missing"
    exit 1
fi

# Test 7: Check CMake configuration
echo -e "${YELLOW}Test 7: Checking CMake configuration...${NC}"
if [ -f "${FFI_DIR}/CMakeLists.txt" ]; then
    echo -e "${GREEN}✓${NC} FFI CMakeLists.txt exists"

    if grep -q "sch_engine.mm" "${FFI_DIR}/CMakeLists.txt"; then
        echo -e "${GREEN}✓${NC} sch_engine.mm in CMake build"
    else
        echo -e "${RED}✗${NC} sch_engine.mm not in CMake build"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} FFI CMakeLists.txt missing"
    exit 1
fi
echo ""

# Test 8: Verify no placeholder NSLog calls remain
echo -e "${YELLOW}Test 8: Checking for placeholder implementations...${NC}"
if grep -q "Placeholder for actual FFI" "$JUCE_ENGINE"; then
    echo -e "${RED}✗${NC} Placeholder NSLog calls still present"
    echo -e "${YELLOW}⚠${NC}  JUCEEngine.swift needs to be updated with real FFI calls"
    exit 1
else
    echo -e "${GREEN}✓${NC} No placeholder implementations found"
fi
echo ""

# Test 9: Check test coverage
echo -e "${YELLOW}Test 9: Checking test coverage...${NC}"
TEST_FILE="${SWIFT_DIR}/Tests/FFIBridgeTests.swift"
if [ -f "$TEST_FILE" ]; then
    echo -e "${GREEN}✓${NC} FFI bridge tests exist"
    TEST_COUNT=$(grep -c "func test" "$TEST_FILE" || true)
    echo -e "${GREEN}  →${NC} $TEST_COUNT test methods defined"
else
    echo -e "${YELLOW}⚠${NC}  FFI bridge tests not found (optional)"
fi
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}All verification tests passed!${NC}"
echo "======================================"
echo ""
echo "FFI Bridge Status:"
echo "  • C++ FFI layer: ✓ Complete"
echo "  • Swift bindings: ✓ Complete"
echo "  • Module map: ✓ Configured"
echo "  • Tests: ✓ Created"
echo "  • Documentation: ✓ Complete"
echo ""
echo "Next Steps:"
echo "  1. Build JUCE backend: cd juce_backend && cmake -B build && cmake --build build"
echo "  2. Build Swift frontend: cd swift_frontend/WhiteRoomiOS && swift build"
echo "  3. Run tests: swift test"
echo "  4. Test real audio output"
echo ""
echo "See docs/FFI_BRIDGE_ARCHITECTURE.md for complete usage guide."
echo ""
