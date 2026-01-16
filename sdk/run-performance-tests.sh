#!/bin/bash

# Schillinger SDK Performance Test Runner
# This script runs comprehensive performance and memory tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
RUN_MATHEMATICAL=true
RUN_CACHING=true
RUN_LOAD=true
RUN_PROFILING=true
GENERATE_REPORT=true
CLEANUP_AFTER=true
VERBOSE=false
OUTPUT_DIR="./test-results/performance"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mathematical-only)
      RUN_MATHEMATICAL=true
      RUN_CACHING=false
      RUN_LOAD=false
      RUN_PROFILING=false
      shift
      ;;
    --caching-only)
      RUN_MATHEMATICAL=false
      RUN_CACHING=true
      RUN_LOAD=false
      RUN_PROFILING=false
      shift
      ;;
    --load-only)
      RUN_MATHEMATICAL=false
      RUN_CACHING=false
      RUN_LOAD=true
      RUN_PROFILING=false
      shift
      ;;
    --profiling-only)
      RUN_MATHEMATICAL=false
      RUN_CACHING=false
      RUN_LOAD=false
      RUN_PROFILING=true
      shift
      ;;
    --no-report)
      GENERATE_REPORT=false
      shift
      ;;
    --no-cleanup)
      CLEANUP_AFTER=false
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help)
      echo "Schillinger SDK Performance Test Runner"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --mathematical-only    Run only mathematical operations tests"
      echo "  --caching-only        Run only caching operations tests"
      echo "  --load-only           Run only load testing tests"
      echo "  --profiling-only      Run only profiling tests"
      echo "  --no-report           Skip generating performance report"
      echo "  --no-cleanup          Don't cleanup temporary files"
      echo "  --verbose             Enable verbose output"
      echo "  --output-dir DIR      Specify output directory (default: ./test-results/performance)"
      echo "  --help                Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                           # Run all performance tests"
      echo "  $0 --mathematical-only       # Run only mathematical tests"
      echo "  $0 --verbose --no-cleanup    # Run with verbose output, keep temp files"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Function to print colored output
print_status() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to run a test suite
run_test_suite() {
  local suite_name=$1
  local test_file=$2
  local description=$3
  
  print_status $BLUE "Running $suite_name tests..."
  echo "Description: $description"
  echo ""
  
  local start_time=$(date +%s)
  
  if [ "$VERBOSE" = true ]; then
    npm run test:performance -- "$test_file" --reporter=verbose
  else
    npm run test:performance -- "$test_file" --reporter=basic
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  if [ $? -eq 0 ]; then
    print_status $GREEN "✓ $suite_name tests completed successfully in ${duration}s"
  else
    print_status $RED "✗ $suite_name tests failed"
    return 1
  fi
  
  echo ""
}

# Function to check prerequisites
check_prerequisites() {
  print_status $BLUE "Checking prerequisites..."
  
  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    print_status $RED "Error: Node.js is not installed"
    exit 1
  fi
  
  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    print_status $RED "Error: npm is not installed"
    exit 1
  fi
  
  # Check if package.json exists
  if [ ! -f "package.json" ]; then
    print_status $RED "Error: package.json not found. Please run from the SDK root directory."
    exit 1
  fi
  
  # Check if vitest is available
  if ! npm list vitest &> /dev/null; then
    print_status $YELLOW "Warning: vitest not found in dependencies. Installing..."
    npm install --save-dev vitest
  fi
  
  print_status $GREEN "✓ Prerequisites check passed"
  echo ""
}

# Function to setup test environment
setup_environment() {
  print_status $BLUE "Setting up test environment..."
  
  # Create output directory
  mkdir -p "$OUTPUT_DIR"
  
  # Set environment variables for performance testing
  export NODE_ENV=test
  export PERFORMANCE_TEST=true
  
  # Enable garbage collection for memory tests
  export NODE_OPTIONS="--expose-gc --max-old-space-size=4096"
  
  print_status $GREEN "✓ Test environment setup complete"
  echo ""
}

# Function to generate performance report
generate_performance_report() {
  if [ "$GENERATE_REPORT" = false ]; then
    return 0
  fi
  
  print_status $BLUE "Generating performance report..."
  
  local report_file="$OUTPUT_DIR/performance-report.md"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  cat > "$report_file" << EOF
# Schillinger SDK Performance Test Report

**Generated:** $timestamp

## Test Summary

EOF

  # Add test results if they exist
  if [ -f "$OUTPUT_DIR/performance-results.json" ]; then
    echo "### Test Results" >> "$report_file"
    echo "" >> "$report_file"
    echo "\`\`\`json" >> "$report_file"
    cat "$OUTPUT_DIR/performance-results.json" >> "$report_file"
    echo "\`\`\`" >> "$report_file"
    echo "" >> "$report_file"
  fi
  
  # Add system information
  cat >> "$report_file" << EOF
## System Information

- **OS:** $(uname -s) $(uname -r)
- **Node.js:** $(node --version)
- **npm:** $(npm --version)
- **CPU:** $(sysctl -n machdep.cpu.brand_string 2>/dev/null || grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs || echo "Unknown")
- **Memory:** $(sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024/1024) "GB"}' || grep MemTotal /proc/meminfo | awk '{print int($2/1024/1024) "GB"}' || echo "Unknown")

## Test Configuration

- **Mathematical Operations:** $RUN_MATHEMATICAL
- **Caching Operations:** $RUN_CACHING
- **Load Testing:** $RUN_LOAD
- **Profiling:** $RUN_PROFILING
- **Output Directory:** $OUTPUT_DIR

## Recommendations

Based on the test results, consider the following optimizations:

1. **Memory Usage:** Monitor operations with high memory allocation
2. **Performance Bottlenecks:** Focus on operations taking >100ms
3. **Concurrency:** Ensure proper handling of concurrent requests
4. **Caching:** Implement caching for frequently accessed data

EOF

  print_status $GREEN "✓ Performance report generated: $report_file"
  echo ""
}

# Function to cleanup temporary files
cleanup_temp_files() {
  if [ "$CLEANUP_AFTER" = false ]; then
    return 0
  fi
  
  print_status $BLUE "Cleaning up temporary files..."
  
  # Remove temporary test files
  find . -name "*.tmp" -type f -delete 2>/dev/null || true
  find . -name "test-*.log" -type f -delete 2>/dev/null || true
  
  print_status $GREEN "✓ Cleanup complete"
  echo ""
}

# Main execution
main() {
  print_status $YELLOW "=== Schillinger SDK Performance Test Suite ==="
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Setup environment
  setup_environment
  
  local overall_start_time=$(date +%s)
  local failed_tests=0
  
  # Run mathematical operations tests
  if [ "$RUN_MATHEMATICAL" = true ]; then
    if ! run_test_suite "Mathematical Operations" \
         "tests/performance/mathematical-operations.test.ts" \
         "Performance tests for core Schillinger mathematical functions"; then
      ((failed_tests++))
    fi
  fi
  
  # Run caching operations tests
  if [ "$RUN_CACHING" = true ]; then
    if ! run_test_suite "Caching Operations" \
         "tests/performance/caching-operations.test.ts" \
         "Performance and memory tests for caching systems"; then
      ((failed_tests++))
    fi
  fi
  
  # Run load testing
  if [ "$RUN_LOAD" = true ]; then
    if ! run_test_suite "Load Testing" \
         "tests/performance/load-testing.test.ts" \
         "Concurrent operations and rate limiting tests"; then
      ((failed_tests++))
    fi
  fi
  
  # Run profiling tests
  if [ "$RUN_PROFILING" = true ]; then
    if ! run_test_suite "Profiling" \
         "tests/performance/profiling.test.ts" \
         "Performance profiling and bottleneck identification"; then
      ((failed_tests++))
    fi
  fi
  
  local overall_end_time=$(date +%s)
  local total_duration=$((overall_end_time - overall_start_time))
  
  # Generate report
  generate_performance_report
  
  # Cleanup
  cleanup_temp_files
  
  # Print summary
  print_status $YELLOW "=== Test Summary ==="
  echo "Total Duration: ${total_duration}s"
  echo "Failed Test Suites: $failed_tests"
  
  if [ $failed_tests -eq 0 ]; then
    print_status $GREEN "✓ All performance tests passed successfully!"
    echo ""
    print_status $BLUE "Performance test results available in: $OUTPUT_DIR"
    exit 0
  else
    print_status $RED "✗ $failed_tests test suite(s) failed"
    echo ""
    print_status $BLUE "Check the output above for details"
    exit 1
  fi
}

# Run main function
main "$@"