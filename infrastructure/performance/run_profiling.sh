#!/bin/bash

# Performance Profiling Script for White Room
# This script runs comprehensive profiling across all components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/Users/bretbouchard/apps/schill/white_room"
JUCE_BACKEND="$PROJECT_ROOT/juce_backend"
SWIFT_FRONTEND="$PROJECT_ROOT/swift_frontend"
RESULTS_DIR="$PROJECT_ROOT/performance_results"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  White Room Performance Profiling      ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================================================
# Phase 1: Build Profiling
# ============================================================================

print_section "Phase 1: Building Profiling Binaries"

cd "$JUCE_BACKEND"

# Build JUCE backend with profiling flags
echo -e "${YELLOW}Building JUCE backend with profiling...${NC}"
cmake -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DCMAKE_CXX_FLAGS="-g -O2 -pg" \
    -DCMAKE_EXE_LINKER_FLAGS="-pg"
cmake --build build --config RelWithDebInfo -j8

echo -e "${GREEN}✓ JUCE backend built${NC}"

cd "$SWIFT_FRONTEND/WhiteRoomiOS"

# Build Swift app with profiling
echo -e "${YELLOW}Building Swift frontend with profiling...${NC}"
xcodebuild -scheme WhiteRoomiOS \
    -configuration Release \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
    -derivedDataPath "$RESULTS_DIR/DerivedData" \
    build

echo -e "${GREEN}✓ Swift frontend built${NC}"

# ============================================================================
# Phase 2: CPU Profiling with Instruments
# ============================================================================

print_section "Phase 2: CPU Profiling"

if command_exists instruments; then
    echo -e "${YELLOW}Running Instruments Time Profiler...${NC}"

    # Build app path
    APP_PATH=$(find "$RESULTS_DIR/DerivedData/Build/Products/Release-iphonesimulator" -name "*.app" -type d | head -1)

    if [ -n "$APP_PATH" ]; then
        # Run Time Profiler
        instruments -t "Time Profiler" \
            -D "$RESULTS_DIR/cpu_profile.trace" \
            -l 30 \
            "$APP_PATH"

        echo -e "${GREEN}✓ CPU profiling complete: $RESULTS_DIR/cpu_profile.trace${NC}"

        # Export to CSV
        instruments -s "$RESULTS_DIR/cpu_profile.trace" \
            -o "$RESULTS_DIR/cpu_profile.csv" \
            -target stdout \
            -format csv

        echo -e "${GREEN}✓ CPU profile exported: $RESULTS_DIR/cpu_profile.csv${NC}"
    else
        echo -e "${RED}✗ Could not find built app${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Instruments not found, skipping CPU profiling${NC}"
fi

# ============================================================================
# Phase 3: Memory Profiling
# ============================================================================

print_section "Phase 3: Memory Profiling"

if command_exists instruments; then
    echo -e "${YELLOW}Running Instruments Allocations...${NC}"

    if [ -n "$APP_PATH" ]; then
        instruments -t "Allocations" \
            -D "$RESULTS_DIR/memory_profile.trace" \
            -l 30 \
            "$APP_PATH"

        echo -e "${GREEN}✓ Memory profiling complete: $RESULTS_DIR/memory_profile.trace${NC}"

        # Check for leaks
        echo -e "${YELLOW}Checking for memory leaks...${NC}"
        leaks --atExit -- "$APP_PATH" > "$RESULTS_DIR/leaks.txt" 2>&1 || true

        if grep -q "0 leaks" "$RESULTS_DIR/leaks.txt"; then
            echo -e "${GREEN}✓ No memory leaks detected${NC}"
        else
            echo -e "${RED}✗ Memory leaks detected${NC}"
            cat "$RESULTS_DIR/leaks.txt"
        fi
    fi
fi

# ============================================================================
# Phase 4: System Trace Profiling
# ============================================================================

print_section "Phase 4: System Trace Profiling"

if command_exists instruments; then
    echo -e "${YELLOW}Running Instruments System Trace...${NC}"

    if [ -n "$APP_PATH" ]; then
        instruments -t "System Trace" \
            -D "$RESULTS_DIR/system_trace.trace" \
            -l 30 \
            "$APP_PATH"

        echo -e "${GREEN}✓ System trace complete: $RESULTS_DIR/system_trace.trace${NC}"
    fi
fi

# ============================================================================
# Phase 5: gprof Analysis (C++ backend)
# ============================================================================

print_section "Phase 5: gprof Analysis"

if command_exists gprof; then
    echo -e "${YELLOW}Running gprof analysis...${NC}"

    cd "$JUCE_BACKEND/build"

    # Find the executable
    EXECUTABLE=$(find . -type f -executable | head -1)

    if [ -n "$EXECUTABLE" ]; then
        # Run gprof
        gprof "$EXECUTABLE" "$EXECUTABLE".gcno > "$RESULTS_DIR/gprof_analysis.txt" 2>&1 || true

        echo -e "${GREEN}✓ gprof analysis complete: $RESULTS_DIR/gprof_analysis.txt${NC}"

        # Extract top 20 functions by time
        echo -e "\n${BLUE}Top 20 functions by execution time:${NC}"
        grep -A 20 "time   seconds" "$RESULTS_DIR/gprof_analysis.txt" | head -20
    fi
else
    echo -e "${YELLOW}⚠ gprof not found, skipping gprof analysis${NC}"
fi

# ============================================================================
# Phase 6: Performance Benchmarks
# ============================================================================

print_section "Phase 6: Performance Benchmarks"

echo -e "${YELLOW}Running performance benchmarks...${NC}"

cd "$SWIFT_FRONTEND/WhiteRoomiOS"

# Run performance tests
xcodebuild test \
    -scheme WhiteRoomiOS \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
    -only-testing:SwiftFrontendCoreTests/PerformanceTests \
    -resultBundlePath "$RESULTS_DIR/TestResults.xcresult" \
    2>&1 | tee "$RESULTS_DIR/benchmark_output.txt"

echo -e "${GREEN}✓ Performance benchmarks complete${NC}"

# Extract benchmark results
echo -e "\n${BLUE}Benchmark Results:${NC}"
grep -E "(measured|Average|P95|P99)" "$RESULTS_DIR/benchmark_output.txt" || true

# ============================================================================
# Phase 7: Generate Report
# ============================================================================

print_section "Phase 7: Generating Performance Report"

REPORT_FILE="$RESULTS_DIR/performance_report.md"

cat > "$REPORT_FILE" << 'EOF'
# White Room Performance Profile Report

**Date**: $(date)
**Build**: Release

## Executive Summary

This report contains comprehensive performance profiling data for White Room across all components.

## 1. CPU Profiling Results

**File**: `cpu_profile.trace`

### Top Hotspots

EOF

# Parse gprof output for hotspots
if [ -f "$RESULTS_DIR/gprof_analysis.txt" ]; then
    grep -A 20 "time   seconds" "$RESULTS_DIR/gprof_analysis.txt" | head -20 >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << 'EOF'

## 2. Memory Profiling Results

**File**: `memory_profile.trace`

### Memory Usage Summary

EOF

# Extract memory stats
if [ -f "$RESULTS_DIR/memory_profile.txt" ]; then
    grep -E "(Total|Peak|Allocations)" "$RESULTS_DIR/memory_profile.txt" >> "$REPORT_FILE" 2>/dev/null || true
fi

cat >> "$REPORT_FILE" << 'EOF'

### Leaks Report

EOF

# Append leaks report
if [ -f "$RESULTS_DIR/leaks.txt" ]; then
    head -20 "$RESULTS_DIR/leaks.txt" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << 'EOF'

## 3. System Trace Results

**File**: `system_trace.trace`

### Thread Activity

- Main thread: [extract from trace]
- Audio thread: [extract from trace]
- Background threads: [extract from trace]

## 4. Benchmark Results

### ProjectionEngine Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| projectSong() | <25ms | TBD | TBD |
| validateSong() | <0.1ms | TBD | TBD |
| generateRenderGraph() | <20ms | TBD | TBD |
| assignNotes() | <15ms | TBD | TBD |

### UI Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| App startup | <3s | TBD | TBD |
| Screen transitions | <100ms | TBD | TBD |
| Touch response | <50ms | TBD | TBD |

### File I/O Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Load 10MB file | <1s | TBD | TBD |
| Save 10MB file | <500ms | TBD | TBD |

## 5. Recommendations

Based on profiling data:

1. [To be filled after analysis]

## 6. Next Steps

1. Implement identified optimizations
2. Re-profile to verify improvements
3. Set up continuous monitoring
4. Establish performance regression tests

---

**Generated by**: performance profiling script
**Status**: Baseline established
EOF

echo -e "${GREEN}✓ Performance report generated: $REPORT_FILE${NC}"

# ============================================================================
# Summary
# ============================================================================

print_section "Profiling Complete"

echo -e "${GREEN}All profiling artifacts saved to: $RESULTS_DIR${NC}\n"

echo -e "Files generated:"
echo -e "  - cpu_profile.trace (Instruments format)"
echo -e "  - cpu_profile.csv (CSV format)"
echo -e "  - memory_profile.trace (Instruments format)"
echo -e "  - system_trace.trace (Instruments format)"
echo -e "  - gprof_analysis.txt (gprof call graph)"
echo -e "  - leaks.txt (memory leak report)"
echo -e "  - benchmark_output.txt (benchmark results)"
echo -e "  - performance_report.md (summary report)"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Open .trace files in Instruments for detailed analysis"
echo -e "  2. Review performance_report.md for summary"
echo -e "  3. Implement optimizations based on findings"
echo -e "  4. Re-run profiling to verify improvements"
echo ""

echo -e "${GREEN}Profiling complete!${NC}"
