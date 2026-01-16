# White Room Security Quick Reference

**Purpose:** Quick reference for security-related tasks and commands
**Last Updated:** 2026-01-15

---

## QUICK START

### Run Full Security Audit
```bash
# Navigate to project root
cd /Users/bretbouchard/apps/schill/white_room

# Run comprehensive security scan
./scripts/security-audit.sh --full

# View results
open .beads/security-reports/
```

### Run Quick Security Check
```bash
# Quick scan (no sanitizer builds)
./scripts/security-audit.sh --quick
```

---

## SECURITY COMMANDS

### Dependency Scanning
```bash
# Scan npm dependencies
cd sdk && npm audit
cd juce_backend/sdk && npm audit
cd juce_backend/frontend && npm audit
cd juce_backend/daid-core && npm audit

# Update dependencies
npm update
npm audit fix

# Check for outdated packages
npm outdated
```

### Static Analysis
```bash
# TypeScript/JavaScript
cd sdk
eslint . --ext .ts,.tsx

# C++
cd juce_backend
clang-tidy src/**/*.cpp --checks=security-*
cppcheck --enable=all src/

# Swift
cd swift_frontend
swiftlint analyze
```

### Memory Safety Testing
```bash
# Build with sanitizers
cd juce_backend

# AddressSanitizer (detects memory errors)
mkdir -p build_asan && cd build_asan
cmake -DCMAKE_BUILD_TYPE=Debug -DUSE_SANITIZER=Address ..
make -j$(sysctl -n hw.ncpu)

# UndefinedBehaviorSanitizer (detects undefined behavior)
cd ..
mkdir -p build_ubsan && cd build_ubsan
cmake -DCMAKE_BUILD_TYPE=Debug -DUSE_SANITIZER=Undefined ..
make -j$(sysctl -n hw.ncpu)

# ThreadSanitizer (detects data races)
cd ..
mkdir -p build_tsan && cd build_tsan
cmake -DCMAKE_BUILD_TYPE=Debug -DUSE_SANITIZER=Thread ..
make -j$(sysctl -n hw.ncpu)

# Run tests
make test
```

### Security Configuration Checks
```bash
# Check for hardcoded secrets
grep -r -i "password\|secret\|api_key\|token" \
  --include="*.ts" --include="*.tsx" --include="*.cpp" --include="*.swift" \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=.git

# Check for unsafe C functions
grep -r -E "(strcpy|strcat|sprintf|gets|strncpy)" \
  --include="*.cpp" --include="*.h" \
  --exclude-dir=build juce_backend/

# Check SQL injection patterns
grep -r -E "sprintf.*SELECT\|sprintf.*INSERT\|sprintf.*UPDATE" \
  --include="*.cpp" --include="*.ts" \
  --exclude-dir=build .
```

---

## SECURITY WORKFLOWS

### Before Committing Code
```bash
# Run linters
cd sdk && npm run lint
cd swift_frontend && swiftlint

# Run tests
cd sdk && npm test
cd juce_backend && make test

# Quick security check
./scripts/security-audit.sh --quick
```

### Before Production Launch
```bash
# Full security audit
./scripts/security-audit.sh --full

# Review reports
ls .beads/security-reports/

# Complete checklist
cat docs/SECURITY_CHECKLIST.md

# Create remediation tickets for any issues
bd create "Fix security issue: [description]"
```

### After Security Incident
```bash
# Document incident
echo "[Incident details]" > .beads/security-incidents/[date]-[description].md

# Run full security audit
./scripts/security-audit.sh --full

# Create fix tickets
bd create "Security fix: [vulnerability]"

# Implement fixes
# ...

# Re-run security audit to verify
./scripts/security-audit.sh --full

# Update documentation
# ...
```

---

## SECURITY DOCUMENTATION

### Key Documents
- **Security Audit Preparation:** `docs/SECURITY_AUDIT_PREPARATION.md`
- **Security Checklist:** `docs/SECURITY_CHECKLIST.md`
- **Security Quick Reference:** `docs/SECURITY_QUICK_REFERENCE.md` (this file)

### Security Reports
- **Directory:** `.beads/security-reports/`
- **Contents:** Automated scan results, vulnerability reports, audit logs

### Threat Model
- **Location:** `docs/THREAT_MODEL.md` (TODO)
- **Purpose:** Document security threats and mitigations

---

## SECURITY PRIORITIES

### Critical (Must Fix Before Launch)
1. All input validation implemented
2. All memory safety issues fixed
3. All concurrency issues fixed
4. Zero critical vulnerabilities
5. Zero high vulnerabilities

### High (Should Fix Before Launch)
1. All medium vulnerabilities assessed
2. TLS for WebSocket
3. Secure memory clearing
4. Privacy policy and terms of service

### Medium (Fix After Launch If Needed)
1. Automated security scanning in CI/CD
2. Third-party security audit
3. Penetration testing
4. Security training for team

---

## CONTACT INFORMATION

**Security Lead:** [TO BE ASSIGNED]
**Security Questions:** [TO BE PROVIDED]
**Vulnerability Disclosure:** [TO BE CREATED]

**Report Security Issues:**
- Email: [security@example.com](mailto:security@example.com)
- PGP Key: [TO BE GENERATED]
- Bug Bounty: [TO BE DEFINED]

---

## USEFUL TOOLS

### Security Scanning
- **npm audit:** Built-in npm vulnerability scanner
- **Snyk:** Dependency vulnerability scanner
- **Dependabot:** Automated dependency updates
- **CodeQL:** Semantic code analysis

### Static Analysis
- **ESLint:** TypeScript/JavaScript linting
- **clang-tidy:** C++ static analysis
- **SwiftLint:** Swift linting
- **cppcheck:** C++ static analysis

### Memory Safety
- **AddressSanitizer:** Memory error detection
- **UndefinedBehaviorSanitizer:** Undefined behavior detection
- **ThreadSanitizer:** Data race detection
- **Valgrind:** Memory leak detection

### Penetration Testing
- **Burp Suite:** Web application security testing
- **Wireshark:** Network protocol analysis
- **mitmproxy:** Man-in-the-middle proxy

---

## SECURITY BEST PRACTICES

### Input Validation
- Always validate input at trust boundaries
- Use allow-listing (whitelisting) instead of block-listing
- Validate length, type, and format
- Sanitize input before use

### Memory Safety
- Use smart pointers instead of raw pointers
- Avoid C-style strings and functions
- Use RAII for resource management
- Clear sensitive data after use

### Concurrency
- Use lock-free data structures in audio thread
- Document lock ordering
- Avoid priority inversion
- Test with ThreadSanitizer

### Error Handling
- Don't leak information in error messages
- Log security events
- Handle errors gracefully
- Don't crash on bad input

### Dependencies
- Keep dependencies updated
- Pin dependency versions
- Review security advisories
- Use automated scanning

---

## SECURITY RESOURCES

### Documentation
- **OWASP:** [https://owasp.org](https://owasp.org)
- **CWE:** [https://cwe.mitre.org](https://cwe.mitre.org)
- **CVE:** [https://cve.mitre.org](https://cve.mitre.org)

### Tools
- **npm audit:** [https://docs.npmjs.com/cli/audit](https://docs.npmjs.com/cli/audit)
- **Snyk:** [https://snyk.io](https://snyk.io)
- **CodeQL:** [https://codeql.github.com](https://codeql.github.com)

### Communities
- **OWASP Community:** [https://owasp.org/www-community](https://owasp.org/www-community)
- **Security Stack Exchange:** [https://security.stackexchange.com](https://security.stackexchange.com)

---

## FREQUENTLY ASKED QUESTIONS

### Q: How often should I run security scans?
**A:** Run quick scans before each commit, full scans before each release.

### Q: What should I do if I find a vulnerability?
**A:** Document it, create a ticket, fix it, then re-run security scan to verify.

### Q: Do I need to fix all medium vulnerabilities?
**A:** Not necessarily, but you should assess each one and document the risk.

### Q: How do I report a security issue?
**A:** Email security@example.com with details, don't use public issue trackers.

### Q: What's the difference between ASan, UBSan, and TSan?
**A:**
- ASan detects memory errors (buffer overflows, use-after-free)
- UBSan detects undefined behavior (signed integer overflow, null dereference)
- TSan detects data races (concurrent memory access)

### Q: Do I need to use TLS for localhost WebSocket?
**A:** Yes, it prevents man-in-the-middle attacks even on localhost.

### Q: Should I encrypt user project files?
**A:** No, musical compositions are not sensitive data. Only encrypt if you add sensitive data later.

### Q: Do I need a privacy policy if I don't collect personal data?
**A:** Yes, you should document what data you do and don't collect, even if it's minimal.

---

## GLOSSARY

- **ASan:** AddressSanitizer - detects memory errors
- **UBSan:** UndefinedBehaviorSanitizer - detects undefined behavior
- **TSan:** ThreadSanitizer - detects data races
- **CVE:** Common Vulnerabilities and Exposures
- **CWE:** Common Weakness Enumeration
- **OWASP:** Open Web Application Security Project
- **SBOM:** Software Bill of Materials
- **TLS:** Transport Layer Security
- **FFI:** Foreign Function Interface
- **RAII:** Resource Acquisition Is Initialization

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-01-15
**Next Review:** 2026-01-22

For detailed security information, see:
- `docs/SECURITY_AUDIT_PREPARATION.md`
- `docs/SECURITY_CHECKLIST.md`
