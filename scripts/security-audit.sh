#!/bin/bash

################################################################################
# White Room Security Audit Script
# Purpose: Automated security scanning for all components
# Usage: ./scripts/security-audit.sh [--full] [--quick]
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/bretbouchard/apps/schill/white_room"
OUTPUT_DIR="${PROJECT_ROOT}/.beads/security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Parse arguments
SCAN_TYPE="quick"
for arg in "$@"; do
    case $arg in
        --full)
            SCAN_TYPE="full"
            ;;
        --quick)
            SCAN_TYPE="quick"
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: $0 [--full] [--quick]"
            exit 1
            ;;
    esac
done

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo "=========================================="
echo "White Room Security Audit"
echo "Scan Type: ${SCAN_TYPE}"
echo "Timestamp: ${TIMESTAMP}"
echo "=========================================="
echo ""

################################################################################
# Phase 1: Dependency Security Scanning
################################################################################

echo -e "${GREEN}Phase 1: Dependency Security Scanning${NC}"
echo ""

# Function to run npm audit
audit_npm() {
    local dir=$1
    local name=$2

    echo "Auditing ${name}..."

    if [ ! -f "${dir}/package.json" ]; then
        echo -e "${YELLOW}  Skipping (no package.json)${NC}"
        return
    fi

    cd "${dir}"
    if npm audit --audit-level=moderate --json > "${OUTPUT_DIR}/${name}_audit_${TIMESTAMP}.json" 2>&1; then
        echo -e "${GREEN}  ✓ No vulnerabilities${NC}"
    else
        echo -e "${RED}  ✗ Vulnerabilities found${NC}"
        npm audit --audit-level=moderate
    fi
    cd "${PROJECT_ROOT}"
}

# Scan all package.json files
audit_npm "${PROJECT_ROOT}/sdk" "sdk"
audit_npm "${PROJECT_ROOT}/juce_backend/sdk" "juce_backend_sdk"
audit_npm "${PROJECT_ROOT}/juce_backend/frontend" "juce_backend_frontend"
audit_npm "${PROJECT_ROOT}/juce_backend/daid-core" "daid_core"

echo ""

################################################################################
# Phase 2: Static Analysis
################################################################################

echo -e "${GREEN}Phase 2: Static Analysis${NC}"
echo ""

# TypeScript/JavaScript linting
echo "Running ESLint on TypeScript code..."
cd "${PROJECT_ROOT}/sdk"
if eslint . --ext .ts,.tsx --format json --output-file "${OUTPUT_DIR}/eslint_report_${TIMESTAMP}.json" 2>&1; then
    echo -e "${GREEN}  ✓ No linting issues${NC}"
else
    echo -e "${YELLOW}  ⚠ Linting issues found${NC}"
fi
cd "${PROJECT_ROOT}"

# C++ static analysis
echo "Running clang-tidy on C++ code..."
cd "${PROJECT_ROOT}/juce_backend"
if command -v clang-tidy &> /dev/null; then
    find src -name "*.cpp" -exec clang-tidy {} --checks='security-*' \; > "${OUTPUT_DIR}/clang_tidy_report_${TIMESTAMP}.txt" 2>&1 || true
    echo -e "${GREEN}  ✓ clang-tidy complete${NC}"
else
    echo -e "${YELLOW}  ⚠ clang-tidy not found${NC}"
fi
cd "${PROJECT_ROOT}"

# Swift linting
echo "Running SwiftLint on Swift code..."
cd "${PROJECT_ROOT}/swift_frontend"
if command -v swiftlint &> /dev/null; then
    swiftlint analyze --compiler-log-path "${OUTPUT_DIR}/swiftlint_report_${TIMESTAMP}.json" 2>&1 || true
    echo -e "${GREEN}  ✓ SwiftLint complete${NC}"
else
    echo -e "${YELLOW}  ⚠ SwiftLint not found${NC}"
fi
cd "${PROJECT_ROOT}"

echo ""

################################################################################
# Phase 3: Memory Safety Checks
################################################################################

echo -e "${GREEN}Phase 3: Memory Safety Checks${NC}"
echo ""

if [ "${SCAN_TYPE}" = "full" ]; then
    echo "Building with AddressSanitizer..."
    cd "${PROJECT_ROOT}/juce_backend"

    # Check if ASan build directory exists
    if [ -d "build_asan" ]; then
        echo -e "${YELLOW}  ⚠ ASan build exists, skipping${NC}"
    else
        mkdir -p build_asan
        cd build_asan
        cmake -DCMAKE_BUILD_TYPE=Debug -DUSE_SANITIZER=Address .. > /dev/null 2>&1 || echo -e "${RED}  ✗ CMake configuration failed${NC}"
        make -j$(sysctl -n hw.ncpu) > /dev/null 2>&1 || echo -e "${RED}  ✗ Build failed${NC}"
        cd ..
    fi

    cd "${PROJECT_ROOT}"

    echo "Building with UndefinedBehaviorSanitizer..."
    cd "${PROJECT_ROOT}/juce_backend"

    if [ -d "build_ubsan" ]; then
        echo -e "${YELLOW}  ⚠ UBSan build exists, skipping${NC}"
    else
        mkdir -p build_ubsan
        cd build_ubsan
        cmake -DCMAKE_BUILD_TYPE=Debug -DUSE_SANITIZER=Undefined .. > /dev/null 2>&1 || echo -e "${RED}  ✗ CMake configuration failed${NC}"
        make -j$(sysctl -n hw.ncpu) > /dev/null 2>&1 || echo -e "${RED}  ✗ Build failed${NC}"
        cd ..
    fi

    cd "${PROJECT_ROOT}"

    echo "Building with ThreadSanitizer..."
    cd "${PROJECT_ROOT}/juce_backend"

    if [ -d "build_tsan" ]; then
        echo -e "${YELLOW}  ⚠ TSan build exists, skipping${NC}"
    else
        mkdir -p build_tsan
        cd build_tsan
        cmake -DCMAKE_BUILD_TYPE=Debug -DUSE_SANITIZER=Thread .. > /dev/null 2>&1 || echo -e "${RED}  ✗ CMake configuration failed${NC}"
        make -j$(sysctl -n hw.ncpu) > /dev/null 2>&1 || echo -e "${RED}  ✗ Build failed${NC}"
        cd ..
    fi

    cd "${PROJECT_ROOT}"

    echo -e "${GREEN}  ✓ Sanitizer builds complete${NC}"
else
    echo -e "${YELLOW}  ⚠ Skipping (use --full for sanitizer builds)${NC}"
fi

echo ""

################################################################################
# Phase 4: Security Configuration Check
################################################################################

echo -e "${GREEN}Phase 4: Security Configuration Check${NC}"
echo ""

# Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
if grep -r -i "password\|secret\|api_key\|token" --include="*.ts" --include="*.tsx" --include="*.cpp" --include="*.swift" \
    --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.git \
    "${PROJECT_ROOT}" > "${OUTPUT_DIR}/secrets_scan_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${YELLOW}  ⚠ Potential secrets found (review manually)${NC}"
else
    echo -e "${GREEN}  ✓ No hardcoded secrets found${NC}"
fi

# Check for unsafe functions
echo "Checking for unsafe C/C++ functions..."
if grep -r -E "(strcpy|strcat|sprintf|gets|strncpy)" --include="*.cpp" --include="*.h" \
    --exclude-dir=build --exclude-dir=node_modules \
    "${PROJECT_ROOT}/juce_backend" > "${OUTPUT_DIR}/unsafe_functions_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${YELLOW}  ⚠ Unsafe functions found (review manually)${NC}"
else
    echo -e "${GREEN}  ✓ No unsafe functions found${NC}"
fi

# Check SQL injection patterns
echo "Checking for SQL injection patterns..."
if grep -r -E "(sprintf.*SELECT|sprintf.*INSERT|sprintf.*UPDATE)" --include="*.cpp" --include="*.ts" \
    --exclude-dir=build --exclude-dir=node_modules \
    "${PROJECT_ROOT}" > "${OUTPUT_DIR}/sql_injection_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${YELLOW}  ⚠ Potential SQL injection found (review manually)${NC}"
else
    echo -e "${GREEN}  ✓ No SQL injection patterns found${NC}"
fi

echo ""

################################################################################
# Phase 5: Dependency License Check
################################################################################

echo -e "${GREEN}Phase 5: Dependency License Check${NC}"
echo ""

# Check npm package licenses
echo "Checking npm package licenses..."
cd "${PROJECT_ROOT}/sdk"
if command -v license-checker &> /dev/null; then
    license-checker --json > "${OUTPUT_DIR}/npm_licenses_${TIMESTAMP}.json" 2>&1 || true
    echo -e "${GREEN}  ✓ License scan complete${NC}"
else
    echo -e "${YELLOW}  ⚠ license-checker not found (install with: npm install -g license-checker)${NC}"
fi
cd "${PROJECT_ROOT}"

echo ""

################################################################################
# Phase 6: Generate Summary Report
################################################################################

echo -e "${GREEN}Phase 6: Generating Summary Report${NC}"
echo ""

cat > "${OUTPUT_DIR}/security_audit_summary_${TIMESTAMP}.md" << EOF
# White Room Security Audit Summary

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Scan Type:** ${SCAN_TYPE}
**Reports Directory:** ${OUTPUT_DIR}

## Executive Summary

### Vulnerability Count
- **Critical:** TODO (run npm audit)
- **High:** TODO (run npm audit)
- **Medium:** TODO (run npm audit)
- **Low:** TODO (run npm audit)

### Overall Status
[ ] PASSED - Ready for production
[ ] FAILED - Issues found that must be fixed

## Detailed Reports

### Dependency Security
- [SDK Audit](sdk_audit_${TIMESTAMP}.json)
- [JUCE Backend SDK Audit](juce_backend_sdk_audit_${TIMESTAMP}.json)
- [JUCE Frontend Audit](juce_backend_frontend_audit_${TIMESTAMP}.json)
- [DAID Core Audit](daid_core_audit_${TIMESTAMP}.json)

### Static Analysis
- [ESLint Report](eslint_report_${TIMESTAMP}.json)
- [Clang-Tidy Report](clang_tidy_report_${TIMESTAMP}.txt)
- [SwiftLint Report](swiftlint_report_${TIMESTAMP}.json)

### Memory Safety
- [AddressSanitizer Build](../juce_backend/build_asan/) - if --full
- [UndefinedBehaviorSanitizer Build](../juce_backend/build_ubsan/) - if --full
- [ThreadSanitizer Build](../juce_backend/build_tsan/) - if --full

### Security Configuration
- [Hardcoded Secrets Scan](secrets_scan_${TIMESTAMP}.txt)
- [Unsafe Functions Scan](unsafe_functions_${TIMESTAMP}.txt)
- [SQL Injection Scan](sql_injection_${TIMESTAMP}.txt)

### License Compliance
- [NPM Licenses](npm_licenses_${TIMESTAMP}.json)

## Recommendations

### Critical (Must Fix Before Launch)
1. Review and fix all critical vulnerabilities
2. Fix all memory safety issues found by sanitizers
3. Add input validation to all entry points

### High (Should Fix Before Launch)
1. Review and fix all high vulnerabilities
2. Update outdated dependencies
3. Add security headers to HTTP responses (if applicable)

### Medium (Fix After Launch If Needed)
1. Refactor unsafe C functions to safe alternatives
2. Add more comprehensive unit tests for security-critical code
3. Set up automated security scanning in CI/CD

## Next Steps

1. Review all generated reports
2. Create remediation tickets for critical issues
3. Implement security fixes
4. Re-run security audit to verify fixes
5. Prepare for external security audit

---

**Generated by:** security-audit.sh
**Report Directory:** ${OUTPUT_DIR}
EOF

echo -e "${GREEN}  ✓ Summary report generated${NC}"
echo ""

################################################################################
# Final Summary
################################################################################

echo "=========================================="
echo "Security Audit Complete"
echo "=========================================="
echo ""
echo "Reports saved to: ${OUTPUT_DIR}"
echo ""
echo "Summary Report:"
echo "  ${OUTPUT_DIR}/security_audit_summary_${TIMESTAMP}.md"
echo ""
echo "Next Steps:"
echo "  1. Review the summary report"
echo "  2. Examine detailed reports"
echo "  3. Create tickets for critical issues"
echo "  4. Implement security fixes"
echo ""
echo "For full security audit (including sanitizer builds), run:"
echo "  ./scripts/security-audit.sh --full"
echo ""
