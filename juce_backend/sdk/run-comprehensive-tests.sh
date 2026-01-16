#!/bin/bash

# Comprehensive Test Runner for Schillinger SDK
#
# This script runs the complete TDD framework including:
# - Unit tests with Vitest
# - Property-based testing with fast-check
# - Performance benchmarking
# - Integration testing
# - Hardware simulation testing
# - Coverage analysis
# - Quality gates validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_RESULTS_DIR="./test-reports"
COVERAGE_DIR="./coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${TEST_RESULTS_DIR}/run_${TIMESTAMP}"

# Create report directories
mkdir -p "${REPORT_DIR}"
mkdir -p "${COVERAGE_DIR}"

# Test categories
CATEGORIES=("unit" "property-based" "performance" "integration" "hardware" "end-to-end")

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if tests should run for a category
should_run_category() {
    local category="$1"
    if [[ -n "$TEST_CATEGORIES" ]]; then
        if [[ "$TEST_CATEGORIES" == *"$category"* ]]; then
            return 0
        else
            return 1
        fi
    fi
    return 0
}

# Function to run unit tests
run_unit_tests() {
    print_section "Running Unit Tests"

    if should_run_category "unit"; then
        echo "🧪 Running unit tests with Vitest..."

        # Run unit tests with coverage
        npm run test -- \
            --reporter=verbose \
            --coverage \
            --outputFile="${REPORT_DIR}/unit-results.json" \
            --outputJson=true \
            2>&1 | tee "${REPORT_DIR}/unit-test.log"

        # Check if tests passed
        if [ $? -eq 0 ]; then
            print_success "Unit tests passed"
        else
            print_error "Unit tests failed"
            return 1
        fi
    else
        print_warning "Skipping unit tests"
    fi
}

# Function to run property-based tests
run_property_based_tests() {
    print_section "Running Property-Based Tests"

    if should_run_category "property-based"; then
        echo "🎲 Running property-based tests with fast-check..."

        # Run property-based tests with increased runs for CI
        CI=true npm run test tests/property-based \
            --reporter=verbose \
            --outputFile="${REPORT_DIR}/property-based-results.json" \
            2>&1 | tee "${REPORT_DIR}/property-based-test.log"

        # Check if tests passed
        if [ $? -eq 0 ]; then
            print_success "Property-based tests passed"
        else
            print_error "Property-based tests failed"
            return 1
        fi
    else
        print_warning "Skipping property-based tests"
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_section "Running Performance Tests"

    if should_run_category "performance"; then
        echo "🚀 Running performance benchmarks..."

        # Run performance benchmarks
        npm run test:performance \
            --reporter=json \
            --outputFile="${REPORT_DIR}/performance-results.json" \
            2>&1 | tee "${REPORT_DIR}/performance-test.log"

        # Check if benchmarks completed
        if [ $? -eq 0 ]; then
            print_success "Performance tests completed"

            # Run performance regression analysis if historical data exists
            if [ -f "./previous-benchmarks.json" ]; then
                echo "📊 Analyzing performance regressions..."
                node -e "
                const current = require('./${REPORT_DIR}/performance-results.json');
                const previous = require('./previous-benchmarks.json');

                let regressions = [];

                for (const [key, result] of Object.entries(current.results || {})) {
                    if (previous[key]) {
                        const change = ((result.averageTime - previous[key].averageTime) / previous[key].averageTime) * 100;
                        if (change > 5) { // 5% regression threshold
                            regressions.push({
                                key,
                                change: change.toFixed(2),
                                current: result.averageTime.toFixed(3),
                                previous: previous[key].averageTime.toFixed(3)
                            });
                        }
                    }
                }

                if (regressions.length > 0) {
                    console.error('\\n🚨 Performance regressions detected:');
                    regressions.forEach(r => {
                        console.error(\`  - \${r.key}: \${r.change}% slower (\${r.previous}ms → \${r.current}ms)\`);
                    });
                    process.exit(1);
                } else {
                    console.log('✅ No performance regressions detected');
                }
                " 2>&1 | tee -a "${REPORT_DIR}/performance-test.log"

                if [ $? -eq 0 ]; then
                    print_success "No performance regressions detected"
                else
                    print_warning "Performance regressions detected"
                fi
            fi
        else
            print_error "Performance tests failed"
            return 1
        fi
    else
        print_warning "Skipping performance tests"
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_section "Running Integration Tests"

    if should_run_category "integration"; then
        echo "🔗 Running integration tests..."

        # Run integration tests
        npm run test:integration \
            --reporter=verbose \
            --outputFile="${REPORT_DIR}/integration-results.json" \
            2>&1 | tee "${REPORT_DIR}/integration-test.log"

        # Check if tests passed
        if [ $? -eq 0 ]; then
            print_success "Integration tests passed"
        else
            print_error "Integration tests failed"
            return 1
        fi
    else
        print_warning "Skipping integration tests"
    fi
}

# Function to run hardware simulation tests
run_hardware_tests() {
    print_section "Running Hardware Simulation Tests"

    if should_run_category "hardware"; then
        echo "🎛️  Running hardware simulation tests..."

        # Run hardware tests with simulation enabled
        HARDWARE_SIMULATION=true npm run test tests/hardware \
            --reporter=verbose \
            --outputFile="${REPORT_DIR}/hardware-results.json" \
            2>&1 | tee "${REPORT_DIR}/hardware-test.log"

        # Check if tests passed
        if [ $? -eq 0 ]; then
            print_success "Hardware simulation tests passed"
        else
            print_error "Hardware simulation tests failed"
            return 1
        fi
    else
        print_warning "Skipping hardware simulation tests"
    fi
}

# Function to run end-to-end tests
run_e2e_tests() {
    print_section "Running End-to-End Tests"

    if should_run_category "end-to-end"; then
        echo "🎭 Running end-to-end tests..."

        # Run E2E tests
        E2E_TEST_MODE=mock npm run test tests/end-to-end \
            --reporter=verbose \
            --outputFile="${REPORT_DIR}/e2e-results.json" \
            2>&1 | tee "${REPORT_DIR}/e2e-test.log"

        # Check if tests passed
        if [ $? -eq 0 ]; then
            print_success "End-to-end tests passed"
        else
            print_error "End-to-end tests failed"
            return 1
        fi
    else
        print_warning "Skipping end-to-end tests"
    fi
}

# Function to analyze coverage
analyze_coverage() {
    print_section "Analyzing Coverage"

    if [ -f "${COVERAGE_DIR}/coverage-summary.json" ]; then
        echo "📊 Coverage Analysis:"

        # Extract coverage metrics
        node -e "
        const summary = require('./${COVERAGE_DIR}/coverage-summary.json');

        console.log(\`  Lines:     \${summary.total.lines.pct.toFixed(1)}%\`);
        console.log(\`  Functions: \${summary.total.functions.pct.toFixed(1)}%\`);
        console.log(\`  Branches:  \${summary.total.branches.pct.toFixed(1)}%\`);
        console.log(\`  Statements:\${summary.total.statements.pct.toFixed(1)}%\`);

        // Check coverage thresholds
        const thresholds = {
            lines: 85,
            functions: 90,
            branches: 85,
            statements: 90
        };

        let failed = false;
        for (const [metric, threshold] of Object.entries(thresholds)) {
            const actual = summary.total[metric].pct;
            if (actual < threshold) {
                console.error(\`❌ \${metric}: \${actual.toFixed(1)}% < \${threshold}%\`);
                failed = true;
            } else {
                console.log(\`✅ \${metric}: \${actual.toFixed(1)}% ≥ \${threshold}%\`);
            }
        }

        if (failed) {
            process.exit(1);
        }
        " 2>&1 | tee "${REPORT_DIR}/coverage-analysis.log"

        if [ $? -eq 0 ]; then
            print_success "Coverage thresholds met"
        else
            print_error "Coverage thresholds not met"
            return 1
        fi
    else
        print_warning "Coverage data not available"
    fi
}

# Function to generate comprehensive report
generate_report() {
    print_section "Generating Comprehensive Report"

    echo "📋 Generating test summary report..."

    cat > "${REPORT_DIR}/summary.md" << EOF
# Schillinger SDK Test Report

**Generated:** $(date)
**Test Run ID:** ${TIMESTAMP}

## Test Categories

EOF

    # Add results for each category
    for category in "${CATEGORIES[@]}"; do
        local result_file="${REPORT_DIR}/${category}-results.json"
        local log_file="${REPORT_DIR}/${category}-test.log"

        if [ -f "$result_file" ]; then
            echo "### ${category^}" >> "${REPORT_DIR}/summary.md"

            if command -v jq >/dev/null 2>&1; then
                local total_tests=$(jq -r '.numTotalTests // "N/A"' "$result_file" 2>/dev/null || echo "N/A")
                local passed_tests=$(jq -r '.numPassedTests // "N/A"' "$result_file" 2>/dev/null || echo "N/A")
                local failed_tests=$(jq -r '.numFailedTests // "N/A"' "$result_file" 2>/dev/null || echo "N/A")

                echo "- Total Tests: $total_tests" >> "${REPORT_DIR}/summary.md"
                echo "- Passed: $passed_tests" >> "${REPORT_DIR}/summary.md"
                echo "- Failed: $failed_tests" >> "${REPORT_DIR}/summary.md"
            else
                echo "- Results: See log file" >> "${REPORT_DIR}/summary.md"
            fi

            echo "- Log: [${category}-test.log](${category}-test.log)" >> "${REPORT_DIR}/summary.md"
            echo "" >> "${REPORT_DIR}/summary.md"
        fi
    done

    # Add coverage summary
    if [ -f "${COVERAGE_DIR}/coverage-summary.json" ] && command -v jq >/dev/null 2>&1; then
        echo "### Coverage Summary" >> "${REPORT_DIR}/summary.md"
        node -e "
        const summary = require('./${COVERAGE_DIR}/coverage-summary.json');
        console.log(\`- Lines: \${summary.total.lines.pct.toFixed(1)}%\`);
        console.log(\`- Functions: \${summary.total.functions.pct.toFixed(1)}%\`);
        console.log(\`- Branches: \${summary.total.branches.pct.toFixed(1)}%\`);
        console.log(\`- Statements: \${summary.total.statements.pct.toFixed(1)}%\`);
        " >> "${REPORT_DIR}/summary.md"
        echo "" >> "${REPORT_DIR}/summary.md"
    fi

    print_success "Test report generated: ${REPORT_DIR}/summary.md"
}

# Function to cleanup and save artifacts
cleanup_and_save() {
    print_section "Cleanup and Artifact Saving"

    # Copy coverage to report directory
    if [ -d "${COVERAGE_DIR}" ]; then
        cp -r "${COVERAGE_DIR}" "${REPORT_DIR}/"
        print_success "Coverage reports saved"
    fi

    # Create index.html for easy viewing
    cat > "${REPORT_DIR}/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Schillinger SDK Test Report - ${TIMESTAMP}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin-bottom: 20px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <h1>Schillinger SDK Test Report</h1>
    <p><strong>Generated:</strong> $(date)</p>
    <p><strong>Test Run ID:</strong> ${TIMESTAMP}</p>

    <div class="section">
        <h2>Quick Links</h2>
        <ul>
            <li><a href="summary.md">Test Summary</a></li>
EOF

    # Add links to coverage reports if available
    if [ -f "${REPORT_DIR}/coverage/lcov-report/index.html" ]; then
        echo '            <li><a href="coverage/lcov-report/index.html">Coverage Report</a></li>' >> "${REPORT_DIR}/index.html"
    fi

    # Add links to individual test logs
    for category in "${CATEGORIES[@]}"; do
        if [ -f "${REPORT_DIR}/${category}-test.log" ]; then
            echo "            <li><a href=\"${category}-test.log\">${category^} Test Log</a></li>" >> "${REPORT_DIR}/index.html"
        fi
    done

    cat >> "${REPORT_DIR}/index.html" << EOF
        </ul>
    </div>

    <div class="section">
        <h2>Test Results</h2>
        <pre>$(cat "${REPORT_DIR}/summary.md" 2>/dev/null || echo "Summary not available")</pre>
    </div>
</body>
</html>
EOF

    print_success "Test artifacts saved to ${REPORT_DIR}"
    echo "📄 View report: open ${REPORT_DIR}/index.html"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [CATEGORIES]"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help              Show this help message"
    echo "  -c, --categories SPEC   Comma-separated list of categories to run"
    echo "                         Available: ${CATEGORIES[*]}"
    echo "  --no-coverage          Skip coverage analysis"
    echo "  --no-report            Skip report generation"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Run all tests"
    echo "  $0 -c unit,property-based             # Run only unit and property-based tests"
    echo "  $0 --no-coverage                      # Run all tests without coverage"
    echo ""
}

# Parse command line arguments
COVERAGE_ENABLED=true
REPORT_ENABLED=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -c|--categories)
            TEST_CATEGORIES="$2"
            shift 2
            ;;
        --no-coverage)
            COVERAGE_ENABLED=false
            shift
            ;;
        --no-report)
            REPORT_ENABLED=false
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            # Legacy support: treat positional arguments as categories
            TEST_CATEGORIES="$1"
            shift
            ;;
    esac
done

# Main execution
print_section "Schillinger SDK Comprehensive Test Suite"
echo "Starting test run at $(date)"
echo "Report directory: ${REPORT_DIR}"

# Track overall success
OVERALL_SUCCESS=true

# Run test categories
if should_run_category "unit"; then
    run_unit_tests || OVERALL_SUCCESS=false
fi

if should_run_category "property-based"; then
    run_property_based_tests || OVERALL_SUCCESS=false
fi

if should_run_category "performance"; then
    run_performance_tests || OVERALL_SUCCESS=false
fi

if should_run_category "integration"; then
    run_integration_tests || OVERALL_SUCCESS=false
fi

if should_run_category "hardware"; then
    run_hardware_tests || OVERALL_SUCCESS=false
fi

if should_run_category "end-to-end"; then
    run_e2e_tests || OVERALL_SUCCESS=false
fi

# Coverage analysis
if [ "$COVERAGE_ENABLED" = true ]; then
    analyze_coverage || OVERALL_SUCCESS=false
fi

# Generate report
if [ "$REPORT_ENABLED" = true ]; then
    generate_report
fi

# Cleanup and save artifacts
cleanup_and_save

# Final status
print_section "Test Suite Summary"
if [ "$OVERALL_SUCCESS" = true ]; then
    print_success "All tests passed successfully!"
    echo "📊 Complete report available at: ${REPORT_DIR}"
    exit 0
else
    print_error "Some tests failed. Check the logs for details."
    echo "📊 Report available at: ${REPORT_DIR}"
    exit 1
fi