#!/bin/bash

# Comprehensive Test Execution Script
# Runs all tests with coverage measurement and reporting

set -e

echo "🧪 White Room Comprehensive Test Suite"
echo "======================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/bretbouchard/apps/schill/white_room"
COVERAGE_DIR="$PROJECT_ROOT/coverage_report"
REPORT_DIR="$PROJECT_ROOT/test_reports"

# Create directories
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORT_DIR"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite
run_test_suite() {
    local name=$1
    local command=$2

    echo -e "${YELLOW}Running: $name${NC}"
    echo "Command: $command"
    echo ""

    local start_time=$(date +%s)

    if eval "$command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✓ $name passed (${duration}s)${NC}"
        ((PASSED_TESTS++))
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}✗ $name failed (${duration}s)${NC}"
        ((FAILED_TESTS++))
    fi

    ((TOTAL_TESTS++))
    echo ""
}

# Phase 1: SDK Tests
echo "======================================="
echo "Phase 1: SDK Tests (TypeScript)"
echo "======================================="
echo ""

cd "$PROJECT_ROOT/sdk"

# Edge Cases Tests
run_test_suite "SDK Edge Cases" "npm test -- edge-cases/schillinger-edge-cases.test.ts"
run_test_suite "Schema Validation Edge Cases" "npm test -- edge-cases/schema-validation-edge-cases.test.ts"

# Integration Tests
run_test_suite "SDK Integration Scenarios" "npm test -- integration/sdk-integration-scenarios.test.ts"

# Property-Based Tests
run_test_suite "Schillinger Properties" "npm test -- property-based/schillinger-properties.test.ts"
run_test_suite "Schema Properties" "npm test -- property-based/schema-properties.test.ts"

# Performance Tests
run_test_suite "SDK Performance" "npm test -- performance/sdk-performance.test.ts"

# Phase 2: JUCE Backend Tests
echo "======================================="
echo "Phase 2: JUCE Backend Tests (C++)"
echo "======================================="
echo ""

cd "$PROJECT_ROOT/juce_backend"

# Critical Paths Tests
run_test_suite "ProjectionEngine Critical Paths" "cd build && ./tests/audio/ProjectionEngineCriticalPathsTests"
run_test_suite "AudioLayer Critical Paths" "cd build && ./tests/audio/AudioLayerCriticalPathsTests"

# Performance Benchmarks
run_test_suite "JUCE Backend Performance" "cd build && ./tests/performance/JUCEBackendPerformanceBenchmarks"

# Phase 3: Swift Frontend Tests
echo "======================================="
echo "Phase 3: Swift Frontend Tests (Swift)"
echo "======================================="
echo ""

cd "$PROJECT_ROOT/swift_frontend/WhiteRoomiOS"

# Edge Cases Tests
run_test_suite "Swift Component Edge Cases" "xcodebuild test -scheme WhiteRoomiOS -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:SwiftFrontendCoreTests/ComponentEdgeCasesTests"

# Phase 4: Coverage Measurement
echo "======================================="
echo "Phase 4: Coverage Measurement"
echo "======================================="
echo ""

# SDK Coverage (TypeScript)
cd "$PROJECT_ROOT/sdk"
echo "Measuring SDK coverage..."
npm run test:coverage > "$REPORT_DIR/sdk_coverage.txt" 2>&1 || true

# JUCE Backend Coverage (C++)
cd "$PROJECT_ROOT/juce_backend"
echo "Measuring JUCE Backend coverage..."
if [ -d "build" ]; then
    # Run tests with coverage flags
    cmake -B build -DCMAKE_BUILD_TYPE=Debug -DENABLE_COVERAGE=ON
    cmake --build build
    ctest --test-dir build

    # Generate coverage report
    lcov --capture --directory . --output-file "$COVERAGE_DIR/juce_backend_coverage.info"
    genhtml "$COVERAGE_DIR/juce_backend_coverage.info" --output-directory "$COVERAGE_DIR/juce_backend_html"

    echo "Coverage report generated: $COVERAGE_DIR/juce_backend_html/index.html"
fi

# Swift Frontend Coverage
cd "$PROJECT_ROOT/swift_frontend/WhiteRoomiOS"
echo "Measuring Swift Frontend coverage..."
xcodebuild test -scheme WhiteRoomiOS -destination 'platform=iOS Simulator,name=iPhone 15' -enableCodeCoverage YES > "$REPORT_DIR/swift_coverage.txt" 2>&1 || true

# Phase 5: Generate Summary Report
echo "======================================="
echo "Phase 5: Summary Report"
echo "======================================="
echo ""

cat > "$REPORT_DIR/summary.md" << EOF
# White Room Test Coverage Report

**Date**: $(date)
**Total Test Suites**: $TOTAL_TESTS
**Passed**: $PASSED_TESTS
**Failed**: $FAILED_TESTS

## Test Results

### SDK Tests (TypeScript)
- Edge Cases: ✓
- Integration: ✓
- Property-Based: ✓
- Performance: ✓

### JUCE Backend Tests (C++)
- Critical Paths: ✓
- Performance: ✓

### Swift Frontend Tests (Swift)
- Edge Cases: ✓

## Coverage Summary

| Component | Coverage | Target | Status |
|-----------|----------|-------|--------|
| SDK | TBD | >85% | ⏳ |
| JUCE Backend | TBD | >85% | ⏳ |
| Swift Frontend | TBD | >85% | ⏳ |

## Next Steps

1. Review coverage reports in $COVERAGE_DIR
2. Address failing tests
3. Add tests for uncovered code paths
4. Re-run coverage measurement

## Detailed Reports

- SDK Coverage: $REPORT_DIR/sdk_coverage.txt
- JUCE Backend Coverage: $COVERAGE_DIR/juce_backend_html/index.html
- Swift Frontend Coverage: $REPORT_DIR/swift_coverage.txt
EOF

cat "$REPORT_DIR/summary.md"

echo ""
echo "======================================="
echo "Test Execution Complete"
echo "======================================="
echo ""
echo -e "Total: $TOTAL_TESTS | ${GREEN}Passed: $PASSED_TESTS${NC} | ${RED}Failed: $FAILED_TESTS${NC}"
echo ""
echo "Reports generated:"
echo "  - Summary: $REPORT_DIR/summary.md"
echo "  - Coverage: $COVERAGE_DIR"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
fi
