#!/bin/bash

# Schillinger SDK Integration Test Runner
# Runs comprehensive integration tests across all SDK implementations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/tests/integration"
REPORT_DIR="$SCRIPT_DIR/test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default options
RUN_TYPESCRIPT=true
RUN_PYTHON=true
RUN_SWIFT=true
RUN_CPP=true
RUN_CROSS_PLATFORM=true
USE_MOCK_API=true
PARALLEL=false
VERBOSE=false
GENERATE_COVERAGE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --typescript-only)
            RUN_PYTHON=false
            RUN_SWIFT=false
            RUN_CPP=false
            RUN_CROSS_PLATFORM=false
            shift
            ;;
        --python-only)
            RUN_TYPESCRIPT=false
            RUN_SWIFT=false
            RUN_CPP=false
            RUN_CROSS_PLATFORM=false
            shift
            ;;
        --swift-only)
            RUN_TYPESCRIPT=false
            RUN_PYTHON=false
            RUN_CPP=false
            RUN_CROSS_PLATFORM=false
            shift
            ;;
        --cpp-only)
            RUN_TYPESCRIPT=false
            RUN_PYTHON=false
            RUN_SWIFT=false
            RUN_CROSS_PLATFORM=false
            shift
            ;;
        --cross-platform-only)
            RUN_TYPESCRIPT=false
            RUN_PYTHON=false
            RUN_SWIFT=false
            RUN_CPP=false
            shift
            ;;
        --no-mock)
            USE_MOCK_API=false
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --coverage)
            GENERATE_COVERAGE=true
            shift
            ;;
        --help)
            echo "Schillinger SDK Integration Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --typescript-only    Run only TypeScript/JavaScript tests"
            echo "  --python-only        Run only Python tests"
            echo "  --swift-only         Run only Swift tests"
            echo "  --cpp-only           Run only C++ tests"
            echo "  --cross-platform-only Run only cross-platform consistency tests"
            echo "  --no-mock            Use live API instead of mock server"
            echo "  --parallel           Run tests in parallel where possible"
            echo "  --verbose            Enable verbose output"
            echo "  --coverage           Generate code coverage reports"
            echo "  --help               Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Create report directory
mkdir -p "$REPORT_DIR"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run command with optional verbose output
run_command() {
    local description=$1
    local command=$2
    
    print_status $BLUE "Running: $description"
    
    if [[ $VERBOSE == true ]]; then
        echo "Command: $command"
        eval $command
    else
        eval $command > /dev/null 2>&1
    fi
    
    if [[ $? -eq 0 ]]; then
        print_status $GREEN "✅ $description completed successfully"
        return 0
    else
        print_status $RED "❌ $description failed"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking prerequisites..."
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        print_status $RED "❌ Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_status $RED "❌ npm is required but not installed"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        print_status $YELLOW "⚠️  Node modules not found, installing..."
        run_command "Installing Node.js dependencies" "cd '$SCRIPT_DIR' && npm install"
    fi
    
    # Check Python if needed
    if [[ $RUN_PYTHON == true ]]; then
        if ! command -v python3 &> /dev/null; then
            print_status $YELLOW "⚠️  Python 3 not found, skipping Python tests"
            RUN_PYTHON=false
        elif [[ ! -d "$SCRIPT_DIR/packages/python" ]]; then
            print_status $YELLOW "⚠️  Python SDK not found, skipping Python tests"
            RUN_PYTHON=false
        fi
    fi
    
    # Check Swift if needed
    if [[ $RUN_SWIFT == true ]]; then
        if ! command -v swift &> /dev/null; then
            print_status $YELLOW "⚠️  Swift not found, skipping Swift tests"
            RUN_SWIFT=false
        elif [[ ! -d "$SCRIPT_DIR/packages/swift" ]]; then
            print_status $YELLOW "⚠️  Swift SDK not found, skipping Swift tests"
            RUN_SWIFT=false
        fi
    fi
    
    # Check C++ if needed
    if [[ $RUN_CPP == true ]]; then
        if ! command -v cmake &> /dev/null; then
            print_status $YELLOW "⚠️  CMake not found, skipping C++ tests"
            RUN_CPP=false
        elif [[ ! -d "$SCRIPT_DIR/packages/juce-cpp" ]]; then
            print_status $YELLOW "⚠️  C++ SDK not found, skipping C++ tests"
            RUN_CPP=false
        fi
    fi
    
    print_status $GREEN "✅ Prerequisites check completed"
}

# Function to start mock API server if needed
start_mock_server() {
    if [[ $USE_MOCK_API == true ]]; then
        print_status $BLUE "🚀 Starting mock API server..."
        
        # Kill any existing mock server
        pkill -f "mock-api-server" || true
        
        # Start mock server in background
        cd "$TEST_DIR"
        node start-mock-server.js &
        
        MOCK_SERVER_PID=$!
        
        # Wait for server to start
        sleep 3
        
        # Verify server is running
        if curl -s http://localhost:3001/health > /dev/null; then
            print_status $GREEN "✅ Mock API server is running"
        else
            print_status $RED "❌ Failed to start mock API server"
            exit 1
        fi
    fi
}

# Function to stop mock server
stop_mock_server() {
    if [[ $USE_MOCK_API == true && -n $MOCK_SERVER_PID ]]; then
        print_status $BLUE "🛑 Stopping mock API server..."
        kill $MOCK_SERVER_PID || true
        pkill -f "mock-api-server" || true
    fi
}

# Function to run TypeScript tests
run_typescript_tests() {
    if [[ $RUN_TYPESCRIPT == false ]]; then
        return 0
    fi
    
    print_status $BLUE "📦 Running TypeScript/JavaScript integration tests..."
    
    local test_files=(
        "api-integration.test.ts"
        "auth-integration.test.ts"
        "websocket.test.ts"
        "environment.test.ts"
    )
    
    local coverage_flag=""
    if [[ $GENERATE_COVERAGE == true ]]; then
        coverage_flag="--coverage"
    fi
    
    for test_file in "${test_files[@]}"; do
        local report_file="$REPORT_DIR/typescript-${test_file%.test.ts}-$TIMESTAMP.json"
        
        if run_command "TypeScript test: $test_file" \
           "cd '$TEST_DIR' && npx vitest run '$test_file' --reporter=json --outputFile='$report_file' $coverage_flag"; then
            print_status $GREEN "✅ $test_file passed"
        else
            print_status $RED "❌ $test_file failed"
            TYPESCRIPT_FAILED=true
        fi
    done
}

# Function to run Python tests
run_python_tests() {
    if [[ $RUN_PYTHON == false ]]; then
        return 0
    fi
    
    print_status $BLUE "🐍 Running Python integration tests..."
    
    local python_test_dir="$SCRIPT_DIR/packages/python/tests/integration"
    
    if [[ ! -d "$python_test_dir" ]]; then
        print_status $YELLOW "⚠️  Python integration tests not found, creating..."
        mkdir -p "$python_test_dir"
        
        # Create basic Python integration tests
        cat > "$python_test_dir/test_api_integration.py" << 'EOF'
import pytest
import asyncio
from schillinger_sdk import SchillingerSDK

@pytest.mark.asyncio
async def test_api_integration():
    sdk = SchillingerSDK(api_url="http://localhost:3001")
    await sdk.authenticate(api_key="test-api-key")
    
    result = await sdk.rhythm.generate_resultant(3, 2)
    assert result is not None
    assert "durations" in result
    
    await sdk.logout()

@pytest.mark.asyncio
async def test_cross_platform_consistency():
    sdk = SchillingerSDK(api_url="http://localhost:3001")
    await sdk.authenticate(api_key="test-api-key")
    
    # Test same inputs as TypeScript tests
    result = await sdk.rhythm.generate_resultant(3, 2)
    expected_durations = [2, 1, 3]  # Expected from TypeScript
    
    assert result["durations"] == expected_durations
    
    await sdk.logout()
EOF
    fi
    
    local test_files=(
        "test_api_integration.py"
        "test_auth_integration.py"
        "test_websocket_integration.py"
        "test_cross_platform.py"
    )
    
    for test_file in "${test_files[@]}"; do
        if [[ -f "$python_test_dir/$test_file" ]]; then
            local report_file="$REPORT_DIR/python-${test_file%.py}-$TIMESTAMP.json"
            
            if run_command "Python test: $test_file" \
               "cd '$python_test_dir' && python -m pytest '$test_file' --json-report --json-report-file='$report_file'"; then
                print_status $GREEN "✅ $test_file passed"
            else
                print_status $RED "❌ $test_file failed"
                PYTHON_FAILED=true
            fi
        else
            print_status $YELLOW "⚠️  $test_file not found, skipping"
        fi
    done
}

# Function to run Swift tests
run_swift_tests() {
    if [[ $RUN_SWIFT == false ]]; then
        return 0
    fi
    
    print_status $BLUE "🍎 Running Swift integration tests..."
    
    local swift_dir="$SCRIPT_DIR/packages/swift"
    
    # Build Swift package first
    if run_command "Building Swift package" "cd '$swift_dir' && swift build"; then
        # Run tests
        local report_file="$REPORT_DIR/swift-integration-$TIMESTAMP.txt"
        
        if run_command "Swift integration tests" \
           "cd '$swift_dir' && swift test 2>&1 | tee '$report_file'"; then
            print_status $GREEN "✅ Swift tests passed"
        else
            print_status $RED "❌ Swift tests failed"
            SWIFT_FAILED=true
        fi
    else
        print_status $RED "❌ Swift build failed"
        SWIFT_FAILED=true
    fi
}

# Function to run C++ tests
run_cpp_tests() {
    if [[ $RUN_CPP == false ]]; then
        return 0
    fi
    
    print_status $BLUE "⚡ Running C++ integration tests..."
    
    local cpp_dir="$SCRIPT_DIR/packages/juce-cpp"
    local build_dir="$cpp_dir/build"
    
    # Create build directory
    mkdir -p "$build_dir"
    
    # Configure with CMake
    if run_command "Configuring C++ build" \
       "cd '$build_dir' && cmake .. -DBUILD_TESTS=ON"; then
        
        # Build
        if run_command "Building C++ tests" \
           "cd '$build_dir' && cmake --build . --target tests"; then
            
            # Run tests
            local report_file="$REPORT_DIR/cpp-integration-$TIMESTAMP.txt"
            
            if run_command "C++ integration tests" \
               "cd '$build_dir' && ctest --output-on-failure 2>&1 | tee '$report_file'"; then
                print_status $GREEN "✅ C++ tests passed"
            else
                print_status $RED "❌ C++ tests failed"
                CPP_FAILED=true
            fi
        else
            print_status $RED "❌ C++ build failed"
            CPP_FAILED=true
        fi
    else
        print_status $RED "❌ C++ configuration failed"
        CPP_FAILED=true
    fi
}

# Function to run cross-platform consistency tests
run_cross_platform_tests() {
    if [[ $RUN_CROSS_PLATFORM == false ]]; then
        return 0
    fi
    
    print_status $BLUE "🔄 Running cross-platform consistency tests..."
    
    local report_file="$REPORT_DIR/cross-platform-$TIMESTAMP.json"
    
    if run_command "Cross-platform consistency tests" \
       "cd '$TEST_DIR' && npx vitest run cross-platform.test.ts --reporter=json --outputFile='$report_file'"; then
        print_status $GREEN "✅ Cross-platform tests passed"
    else
        print_status $RED "❌ Cross-platform tests failed"
        CROSS_PLATFORM_FAILED=true
    fi
}

# Function to generate final report
generate_report() {
    print_status $BLUE "📊 Generating final report..."
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Count results from JSON reports
    for report_file in "$REPORT_DIR"/*.json; do
        if [[ -f "$report_file" ]]; then
            # Parse JSON report (simplified)
            local file_tests=$(grep -o '"numTests":[0-9]*' "$report_file" | cut -d':' -f2 || echo "0")
            local file_passed=$(grep -o '"numPassedTests":[0-9]*' "$report_file" | cut -d':' -f2 || echo "0")
            local file_failed=$(grep -o '"numFailedTests":[0-9]*' "$report_file" | cut -d':' -f2 || echo "0")
            
            total_tests=$((total_tests + file_tests))
            passed_tests=$((passed_tests + file_passed))
            failed_tests=$((failed_tests + file_failed))
        fi
    done
    
    # Generate summary report
    local summary_file="$REPORT_DIR/integration-test-summary-$TIMESTAMP.txt"
    
    cat > "$summary_file" << EOF
Schillinger SDK Integration Test Summary
========================================
Timestamp: $(date)
Total Tests: $total_tests
Passed: $passed_tests
Failed: $failed_tests
Success Rate: $(( passed_tests * 100 / total_tests ))%

Platform Results:
- TypeScript/JavaScript: $([ "$TYPESCRIPT_FAILED" != "true" ] && echo "PASSED" || echo "FAILED")
- Python: $([ "$PYTHON_FAILED" != "true" ] && echo "PASSED" || echo "FAILED")
- Swift: $([ "$SWIFT_FAILED" != "true" ] && echo "PASSED" || echo "FAILED")
- C++: $([ "$CPP_FAILED" != "true" ] && echo "PASSED" || echo "FAILED")
- Cross-Platform: $([ "$CROSS_PLATFORM_FAILED" != "true" ] && echo "PASSED" || echo "FAILED")

Report Files:
$(ls -la "$REPORT_DIR"/*$TIMESTAMP*)
EOF
    
    print_status $BLUE "📄 Summary report saved to: $summary_file"
    
    # Display summary
    echo ""
    echo "=========================================="
    echo "INTEGRATION TEST RESULTS"
    echo "=========================================="
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Success Rate: $(( passed_tests * 100 / total_tests ))%"
    echo ""
    
    if [[ $failed_tests -eq 0 ]]; then
        print_status $GREEN "🎉 All integration tests passed!"
        return 0
    else
        print_status $RED "❌ Some integration tests failed"
        return 1
    fi
}

# Main execution
main() {
    print_status $BLUE "🚀 Starting Schillinger SDK Integration Tests"
    print_status $BLUE "Timestamp: $(date)"
    echo ""
    
    # Initialize failure flags
    TYPESCRIPT_FAILED=false
    PYTHON_FAILED=false
    SWIFT_FAILED=false
    CPP_FAILED=false
    CROSS_PLATFORM_FAILED=false
    
    # Setup trap to cleanup on exit
    trap 'stop_mock_server; exit' INT TERM EXIT
    
    # Run test phases
    check_prerequisites
    start_mock_server
    
    if [[ $PARALLEL == true ]]; then
        # Run tests in parallel
        run_typescript_tests &
        run_python_tests &
        run_swift_tests &
        run_cpp_tests &
        wait
        run_cross_platform_tests
    else
        # Run tests sequentially
        run_typescript_tests
        run_python_tests
        run_swift_tests
        run_cpp_tests
        run_cross_platform_tests
    fi
    
    # Generate final report
    if generate_report; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"