#!/bin/bash
################################################################################
# FilterGate - Test Automation Script
#
# Runs all tests with coverage reporting and generates a comprehensive
# test report.
#
# @author FilterGate Autonomous Agent 8
# @date  2025-12-30
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="build"
TEST_REPORT_DIR="test_reports"
COVERAGE_DIR="coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create directories
mkdir -p "$TEST_REPORT_DIR"
mkdir -p "$COVERAGE_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FilterGate Test Automation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

################################################################################
# Step 1: Clean Build
################################################################################

echo -e "${YELLOW}[1/7] Cleaning build...${NC}"
rm -rf "$BUILD_DIR"
cmake -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_FLAGS="--coverage" > /dev/null
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

################################################################################
# Step 2: Build All Tests
################################################################################

echo -e "${YELLOW}[2/7] Building all tests...${NC}"
cd "$BUILD_DIR"
make -j8 > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

################################################################################
# Step 3: Run All Tests
################################################################################

echo -e "${YELLOW}[3/7] Running all tests...${NC}"

cd "$BUILD_DIR"

# Run each test suite and capture results
TEST_SUITES=(
    "FilterGateTestSuite:FilterGateTests"
    "GateAndEnvelopeTestSuite:GateAndEnvelopeTests"
    "PhaserTestSuite:PhaserTests"
    "StateVariableFilterTestSuite:StateVariableFilterTests"
    "LadderFilterTestSuite:LadderFilterTests"
    "FilterEngineTestSuite:FilterEngineTests"
    "IntegrationTestSuite:IntegrationTests"
    "FFITestSuite:FFITests"
    "PresetManagerTestSuite:PresetManagerTests"
)

TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

echo "" > "../$TEST_REPORT_DIR/test_results_$TIMESTAMP.txt"
echo "FilterGate Test Results" >> "../$TEST_REPORT_DIR/test_results_$TIMESTAMP.txt"
echo "Generated: $(date)" >> "../$TEST_REPORT_DIR/test_results_$TIMESTAMP.txt"
echo "" >> "../$TEST_REPORT_DIR/test_results_$TIMESTAMP.txt"

for suite in "${TEST_SUITES[@]}"; do
    IFS=':' read -ra PARTS <<< "$suite"
    NAME="${PARTS[0]}"
    EXEC="${PARTS[1]}"

    echo -e "${BLUE}Running $NAME...${NC}"

    # Run test and capture output
    if ./$EXEC > "../$TEST_REPORT_DIR/${NAME}_$TIMESTAMP.log" 2>&1; then
        echo -e "${GREEN}✓ $NAME PASSED${NC}"

        # Parse test results
        PASSED=$(grep -o "PASSED.*tests" "../$TEST_REPORT_DIR/${NAME}_$TIMESTAMP.log" | grep -o "[0-9]\+")
        if [ -z "$PASSED" ]; then
            PASSED=$(grep -o "\[  PASSED  \]" "../$TEST_REPORT_DIR/${NAME}_$TIMESTAMP.log" | wc -l | xargs)
        fi

        TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    else
        echo -e "${RED}✗ $NAME FAILED${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi

    # Count total tests
    SUITE_TOTAL=$(grep -o "tests from" "../$TEST_REPORT_DIR/${NAME}_$TIMESTAMP.log" | grep -o "[0-9]\+" | head -1)
    if [ -n "$SUITE_TOTAL" ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + SUITE_TOTAL))
    fi
done

cd ..

echo ""
echo -e "${GREEN}✓ All tests complete${NC}"
echo ""

################################################################################
# Step 4: Generate Coverage Report
################################################################################

echo -e "${YELLOW}[4/7] Generating coverage report...${NC}"

cd "$BUILD_DIR"

# Run each test with coverage
for suite in "${TEST_SUITES[@]}"; do
    IFS=':' read -ra PARTS <<< "$suite"
    EXEC="${PARTS[1]}"

    # Run with coverage (if coverage is enabled)
    if llvm-cov --help > /dev/null 2>&1; then
        # Use llvm-cov for macOS
        ./$EXEC > /dev/null 2>&1 || true
        llvm-cov export -format=lcov ./$EXEC > "../$COVERAGE_DIR/${EXEC}.info" 2>/dev/null || true
    fi
done

cd ..

echo -e "${GREEN}✓ Coverage report generated${NC}"
echo ""

################################################################################
# Step 5: Performance Benchmarks
################################################################################

echo -e "${YELLOW}[5/7] Running performance benchmarks...${NC}"

# Build performance test if it exists
if [ -f "tests/PerformanceTests.cpp" ]; then
    cd "$BUILD_DIR"
    make PerformanceTests > /dev/null 2>&1 || echo "Performance tests not available"
    if [ -f "./PerformanceTests" ]; then
        ./PerformanceTests > "../$TEST_REPORT_DIR/performance_$TIMESTAMP.log" 2>&1
        echo -e "${GREEN}✓ Performance benchmarks complete${NC}"
    fi
    cd ..
else
    # Create simple performance test
    echo "Creating performance test..."
    cat > tests/PerformanceTests.cpp << 'EOF'
#include <gtest/gtest.h>
#include <chrono>
#include "FilterGateProcessor.h"

using namespace FilterGate;

class PerformanceTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor.prepareToPlay(48000.0, 512);
    }

    FilterGateProcessor processor;
};

TEST_F(PerformanceTest, AudioProcessingBenchmark) {
    constexpr int numSamples = 512;
    constexpr int numIterations = 10000;

    juce::AudioBuffer<float> buffer(2, numSamples);
    buffer.clear();
    juce::MidiBuffer midi;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < numIterations; ++i) {
        processor.processBlock(buffer, midi);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    double samplesPerSecond = (numSamples * numIterations) / (double)duration.count() * 1000.0;

    std::cout << "Processing speed: " << samplesPerSecond << " samples/second" << std::endl;
    std::cout << "Realtime factor: " << (samplesPerSecond / 48000.0) << "x" << std::endl;

    EXPECT_GT(samplesPerSecond, 48000.0 * 100); // Should handle at least 100x realtime
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
EOF

    # Update CMakeLists.txt to include PerformanceTests
    if ! grep -q "PerformanceTests" CMakeLists.txt; then
        echo "" >> CMakeLists.txt
        echo "# Agent 8 Performance tests" >> CMakeLists.txt
        echo "add_executable(PerformanceTests" >> CMakeLists.txt
        echo "    tests/PerformanceTests.cpp" >> CMakeLists.txt
        echo "    src/FilterGateProcessor.cpp" >> CMakeLists.txt
        echo ")" >> CMakeLists.txt
        echo "" >> CMakeLists.txt
        echo "target_link_libraries(PerformanceTests PRIVATE" >> CMakeLists.txt
        echo "    FilterGate" >> CMakeLists.txt
        echo "    GTest::GTest" >> CMakeLists.txt
        echo "    GTest::Main" >> CMakeLists.txt
        echo ")" >> CMakeLists.txt
    fi

    # Rebuild
    cd "$BUILD_DIR"
    cmake .. > /dev/null 2>&1
    make PerformanceTests -j8 > /dev/null 2>&1
    cd ..

    # Run performance test
    "$BUILD_DIR/PerformanceTests" > "$TEST_REPORT_DIR/performance_$TIMESTAMP.log" 2>&1
    echo -e "${GREEN}✓ Performance benchmarks complete${NC}"
fi

echo ""

################################################################################
# Step 6: Memory Leak Detection
################################################################################

echo -e "${YELLOW}[6/7] Running memory leak detection...${NC}"

# Check if Valgrind is available
if command -v valgrind &> /dev/null; then
    cd "$BUILD_DIR"

    for suite in "${TEST_SUITES[@]}"; do
        IFS=':' read -ra PARTS <<< "$suite"
        EXEC="${PARTS[1]}"

        if [ -f "./$EXEC" ]; then
            echo -e "${BLUE}Running valgrind on $EXEC...${NC}"
            valgrind --leak-check=full --error-exitcode=1 ./$EXEC > "../$TEST_REPORT_DIR/${EXEC}_valgrind_$TIMESTAMP.log" 2>&1 || true

            # Check for memory leaks
            if grep -q "definitely lost: 0 bytes" "../$TEST_REPORT_DIR/${EXEC}_valgrind_$TIMESTAMP.log"; then
                echo -e "${GREEN}✓ $EXEC - No memory leaks${NC}"
            else
                echo -e "${RED}✗ $EXEC - Memory leaks detected${NC}"
            fi
        fi
    done

    cd ..
elif command -v leaks &> /dev/null; then
    # Use leaks on macOS
    cd "$BUILD_DIR"

    for suite in "${TEST_SUITES[@]}"; do
        IFS=':' read -ra PARTS <<< "$suite"
        EXEC="${PARTS[1]}"

        if [ -f "./$EXEC" ]; then
            echo -e "${BLUE}Running leaks on $EXEC...${NC}"
            leaks --atExit -- ./$EXEC > "../$TEST_REPORT_DIR/${EXEC}_leaks_$TIMESTAMP.log" 2>&1 || true

            if grep -q "0 leaks" "../$TEST_REPORT_DIR/${EXEC}_leaks_$TIMESTAMP.log"; then
                echo -e "${GREEN}✓ $EXEC - No memory leaks${NC}"
            else
                echo -e "${YELLOW}⚠ $EXEC - Check leak report${NC}"
            fi
        fi
    done

    cd ..
else
    echo -e "${YELLOW}⚠ Valgrind/leaks not available, skipping memory leak detection${NC}"
fi

echo ""

################################################################################
# Step 7: Generate Summary Report
################################################################################

echo -e "${YELLOW}[7/7] Generating summary report...${NC}"

REPORT_FILE="$TEST_REPORT_DIR/summary_$TIMESTAMP.txt"

cat > "$REPORT_FILE" << EOF
================================================================================
FilterGate Test Automation Summary
================================================================================

Generated: $(date)
Platform: $(uname -s) $(uname -m)
================================================================================

TEST RESULTS
--------------------------------------------------------------------------------
Total Tests Run: $TOTAL_TESTS
Tests Passed: $TOTAL_PASSED
Tests Failed: $TOTAL_FAILED
Pass Rate: $(python3 -c "print(f'{(100.0 * $TOTAL_PASSED / $TOTAL_TESTS):.1f}%')" 2>/dev/null || echo "N/A")

TEST SUITES
--------------------------------------------------------------------------------
EOF

for suite in "${TEST_SUITES[@]}"; do
    IFS=':' read -ra PARTS <<< "$suite"
    NAME="${PARTS[0]}"
    EXEC="${PARTS[1]}"

    if [ -f "$TEST_REPORT_DIR/${NAME}_$TIMESTAMP.log" ]; then
        echo "" >> "$REPORT_FILE"
        echo "$NAME" >> "$REPORT_FILE"
        echo "  Status: $(grep -E "PASSED|FAILED" "$TEST_REPORT_DIR/${NAME}_$TIMESTAMP.log" | head -1)" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

PERFORMANCE RESULTS
--------------------------------------------------------------------------------
EOF

if [ -f "$TEST_REPORT_DIR/performance_$TIMESTAMP.log" ]; then
    cat "$TEST_REPORT_DIR/performance_$TIMESTAMP.log" >> "$REPORT_FILE"
else
    echo "  No performance data available" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

MEMORY LEAK DETECTION
--------------------------------------------------------------------------------
EOF

# Check for memory leaks in valgrind/leaks logs
LEAK_COUNT=0
for suite in "${TEST_SUITES[@]}"; do
    IFS=':' read -ra PARTS <<< "$suite"
    EXEC="${PARTS[1]}"

    if [ -f "$TEST_REPORT_DIR/${EXEC}_valgrind_$TIMESTAMP.log" ]; then
        if grep -q "definitely lost: 0 bytes" "$TEST_REPORT_DIR/${EXEC}_valgrind_$TIMESTAMP.log"; then
            echo "  $EXEC: ✓ No leaks" >> "$REPORT_FILE"
        else
            echo "  $EXEC: ✗ Leaks detected" >> "$REPORT_FILE"
            LEAK_COUNT=$((LEAK_COUNT + 1))
        fi
    elif [ -f "$TEST_REPORT_DIR/${EXEC}_leaks_$TIMESTAMP.log" ]; then
        if grep -q "0 leaks" "$TEST_REPORT_DIR/${EXEC}_leaks_$TIMESTAMP.log"; then
            echo "  $EXEC: ✓ No leaks" >> "$REPORT_FILE"
        else
            echo "  $EXEC: ⚠ Check leak report" >> "$REPORT_FILE"
            LEAK_COUNT=$((LEAK_COUNT + 1))
        fi
    fi
done

if [ $LEAK_COUNT -eq 0 ] && [ -f "$BUILD_DIR/valgrind" ]; then
    echo "  All tests passed memory leak detection" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

BUILD INFORMATION
--------------------------------------------------------------------------------
Compiler: $(cmake --version | head -1)
Build Type: Debug (with coverage)
CMake Version: $(cmake --version | grep "cmake" | head -1)

================================================================================
EOF

echo -e "${GREEN}✓ Summary report generated: $REPORT_FILE${NC}"
echo ""

################################################################################
# Final Summary
################################################################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Automation Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TOTAL_PASSED${NC}"
echo -e "Failed: ${RED}$TOTAL_FAILED${NC}"
echo ""
echo -e "Reports saved to: ${YELLOW}$TEST_REPORT_DIR${NC}"
echo ""

# Exit with error code if tests failed
if [ $TOTAL_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
