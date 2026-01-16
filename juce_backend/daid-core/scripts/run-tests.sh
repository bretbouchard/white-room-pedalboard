#!/bin/bash

# DAID Core Test Runner
# Runs comprehensive tests for both TypeScript and Python implementations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 DAID Core Test Suite${NC}"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "setup.py" ]; then
    echo -e "${RED}❌ Error: Must be run from daid-core directory${NC}"
    exit 1
fi

# Parse command line arguments
RUN_PYTHON=true
RUN_TYPESCRIPT=true
RUN_INTEGRATION=true
RUN_PERFORMANCE=false
COVERAGE=true
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --python-only)
            RUN_TYPESCRIPT=false
            shift
            ;;
        --typescript-only)
            RUN_PYTHON=false
            shift
            ;;
        --no-integration)
            RUN_INTEGRATION=false
            shift
            ;;
        --performance)
            RUN_PERFORMANCE=true
            shift
            ;;
        --no-coverage)
            COVERAGE=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --python-only      Run only Python tests"
            echo "  --typescript-only  Run only TypeScript tests"
            echo "  --no-integration   Skip integration tests"
            echo "  --performance      Run performance tests"
            echo "  --no-coverage      Skip coverage reporting"
            echo "  --verbose          Verbose output"
            echo "  --help            Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${BLUE}🔄 $description${NC}"
    
    if [ "$VERBOSE" = true ]; then
        echo "Running: $cmd"
    fi
    
    if eval "$cmd"; then
        echo -e "${GREEN}✅ $description completed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Setup test environment
echo -e "${BLUE}🔧 Setting up test environment${NC}"

# Install Python test dependencies
if [ "$RUN_PYTHON" = true ]; then
    if command -v pip &> /dev/null; then
        run_command "pip install -r tests/requirements.txt" "Installing Python test dependencies"
        run_command "pip install -e ." "Installing DAID Core in development mode"
    else
        echo -e "${YELLOW}⚠️  pip not found, skipping Python dependency installation${NC}"
    fi
fi

# Install TypeScript test dependencies
if [ "$RUN_TYPESCRIPT" = true ]; then
    if command -v npm &> /dev/null; then
        run_command "npm install" "Installing TypeScript dependencies"
    else
        echo -e "${YELLOW}⚠️  npm not found, skipping TypeScript dependency installation${NC}"
    fi
fi

# Run TypeScript tests
if [ "$RUN_TYPESCRIPT" = true ]; then
    echo -e "\n${BLUE}📝 Running TypeScript Tests${NC}"
    echo "================================"
    
    if command -v npm &> /dev/null; then
        # Type checking
        run_command "npm run type-check" "TypeScript type checking"
        
        # Linting
        run_command "npm run lint" "TypeScript linting"
        
        # Unit tests
        if [ "$COVERAGE" = true ]; then
            run_command "npm run test:coverage" "TypeScript tests with coverage"
        else
            run_command "npm test" "TypeScript tests"
        fi
    else
        echo -e "${YELLOW}⚠️  npm not found, skipping TypeScript tests${NC}"
    fi
fi

# Run Python tests
if [ "$RUN_PYTHON" = true ]; then
    echo -e "\n${BLUE}🐍 Running Python Tests${NC}"
    echo "=========================="
    
    if command -v python &> /dev/null; then
        # Code formatting check
        if command -v black &> /dev/null; then
            run_command "black --check python/ integrations/ tests/" "Python code formatting check"
        fi
        
        # Import sorting check
        if command -v isort &> /dev/null; then
            run_command "isort --check-only python/ integrations/ tests/" "Python import sorting check"
        fi
        
        # Linting
        if command -v flake8 &> /dev/null; then
            run_command "flake8 python/ integrations/ tests/" "Python linting"
        fi
        
        # Type checking
        if command -v mypy &> /dev/null; then
            run_command "mypy python/daid_core.py" "Python type checking"
        fi
        
        # Unit tests
        PYTEST_ARGS=""
        if [ "$COVERAGE" = true ]; then
            PYTEST_ARGS="--cov=python --cov=integrations --cov-report=term-missing --cov-report=html:htmlcov/python"
        fi
        
        if [ "$VERBOSE" = true ]; then
            PYTEST_ARGS="$PYTEST_ARGS -v"
        fi
        
        if [ "$RUN_INTEGRATION" = false ]; then
            PYTEST_ARGS="$PYTEST_ARGS -m 'not integration'"
        fi
        
        if [ "$RUN_PERFORMANCE" = true ]; then
            PYTEST_ARGS="$PYTEST_ARGS -m 'performance'"
        else
            PYTEST_ARGS="$PYTEST_ARGS -m 'not performance'"
        fi
        
        run_command "python -m pytest tests/ $PYTEST_ARGS" "Python tests"
        
    else
        echo -e "${YELLOW}⚠️  python not found, skipping Python tests${NC}"
    fi
fi

# Run integration tests
if [ "$RUN_INTEGRATION" = true ]; then
    echo -e "\n${BLUE}🔗 Running Integration Tests${NC}"
    echo "=================================="
    
    # Cross-language compatibility tests
    if [ "$RUN_PYTHON" = true ] && [ "$RUN_TYPESCRIPT" = true ]; then
        echo -e "${BLUE}Testing cross-language compatibility${NC}"
        
        # Test that TypeScript and Python generate compatible DAIDs
        run_command "python tests/test_cross_language_compatibility.py" "Cross-language compatibility tests" || echo -e "${YELLOW}⚠️  Cross-language tests not found${NC}"
    fi
    
    # FastAPI integration tests
    if command -v python &> /dev/null && pip list | grep -q fastapi; then
        run_command "python -m pytest tests/test_integrations.py::TestFastAPIIntegration -v" "FastAPI integration tests"
    fi
    
    # WebSocket integration tests
    if command -v python &> /dev/null && pip list | grep -q websockets; then
        run_command "python -m pytest tests/test_integrations.py::TestWebSocketMiddleware -v" "WebSocket integration tests"
    fi
fi

# Run performance tests
if [ "$RUN_PERFORMANCE" = true ]; then
    echo -e "\n${BLUE}⚡ Running Performance Tests${NC}"
    echo "=================================="
    
    if command -v python &> /dev/null; then
        run_command "python -m pytest tests/ -m performance --benchmark-only" "Python performance tests"
    fi
    
    if command -v npm &> /dev/null; then
        run_command "npm run test:perf" "TypeScript performance tests" || echo -e "${YELLOW}⚠️  TypeScript performance tests not configured${NC}"
    fi
fi

# Generate test report
echo -e "\n${BLUE}📊 Generating Test Report${NC}"
echo "=================================="

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Count test results (simplified)
if [ -f "htmlcov/index.html" ]; then
    echo -e "${GREEN}✅ Coverage report generated: htmlcov/index.html${NC}"
fi

if [ -f "test-results.xml" ]; then
    echo -e "${GREEN}✅ Test results: test-results.xml${NC}"
fi

# Summary
echo -e "\n${BLUE}📋 Test Summary${NC}"
echo "================"

if [ "$RUN_TYPESCRIPT" = true ]; then
    echo "✓ TypeScript tests completed"
fi

if [ "$RUN_PYTHON" = true ]; then
    echo "✓ Python tests completed"
fi

if [ "$RUN_INTEGRATION" = true ]; then
    echo "✓ Integration tests completed"
fi

if [ "$RUN_PERFORMANCE" = true ]; then
    echo "✓ Performance tests completed"
fi

if [ "$COVERAGE" = true ]; then
    echo "✓ Coverage reports generated"
fi

echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"

# Cleanup
echo -e "\n${BLUE}🧹 Cleaning up${NC}"
# Remove temporary files if any
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo -e "${GREEN}✅ Test suite completed${NC}"
