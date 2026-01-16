# White Room CI/CD Runbook

Complete guide for the comprehensive CI/CD pipeline system at White Room.

## Overview

White Room uses a production-grade CI/CD pipeline with automated testing, building, and deployment across multiple platforms and components.

## Table of Contents

1. [Architecture](#architecture)
2. [Workflows](#workflows)
3. [Triggers](#triggers)
4. [Quality Gates](#quality-gates)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Architecture

### Pipeline Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   JUCE       │  │    Swift     │  │     SDK      │         │
│  │   Backend    │  │   Frontend   │  │  TypeScript  │         │
│  │     CI       │  │      CI      │  │     CI       │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                      │
│                  ┌────────▼────────┐                            │
│                  │  Integration    │                            │
│                  │     Tests       │                            │
│                  └────────┬────────┘                            │
│                           │                                      │
│                  ┌────────▼────────┐                            │
│                  │    Deployment   │                            │
│                  │   Automation    │                            │
│                  └─────────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **JUCE Backend CI**: C++ audio engine testing and building
- **Swift Frontend CI**: SwiftUI interface testing and building
- **SDK CI**: TypeScript SDK testing and building
- **Integration Tests**: Cross-component testing
- **Deployment Automation**: Release and deployment management

---

## Workflows

### 1. JUCE Backend CI (`juce-backend-ci.yml`)

**Purpose**: Comprehensive testing and building of JUCE C++ backend

**Jobs**:
- `code-quality`: Static analysis with clang-tidy and clang-format
- `unit-tests`: Unit tests with coverage reporting
- `sanitizer-tests`: AddressSanitizer, UndefinedBehaviorSanitizer, ThreadSanitizer
- `dsp-tests`: Golden audio tests for DSP algorithms
- `instrument-tests`: Tests for all instruments
- `performance-tests`: Benchmarking with regression detection
- `build-matrix`: Multi-platform builds (Linux, macOS, iOS, tvOS)
- `quality-gates`: Enforces all quality checks pass
- `notify`: Slack notifications

**Coverage Threshold**: 85%

**Platforms**: Linux (x64), macOS (universal), iOS (arm64), tvOS (arm64)

**Run Manual**:
```bash
gh workflow run juce-backend-ci.yml \
  -f build_type=Release \
  -f run_sanitizers=true \
  -f run_performance_tests=false
```

### 2. Swift Frontend CI (`swift-frontend-ci-enhanced.yml`)

**Purpose**: Comprehensive testing and building of Swift frontend

**Jobs**:
- `quick-check`: Fast validation (build, SwiftLint, SwiftFormat)
- `unit-tests`: Unit tests with coverage for iOS, macOS, tvOS
- `integration-tests`: Integration testing
- `ui-tests`: UI tests with snapshot testing
- `accessibility-tests`: Accessibility compliance testing
- `performance-tests`: Swift performance benchmarks
- `build-matrix`: Multi-platform builds (iOS, macOS, tvOS, simulators)
- `quality-gates`: Enforces all quality checks pass
- `notify`: Slack notifications

**Coverage Threshold**: 85%

**Platforms**: iOS (arm64), macOS (universal), tvOS (arm64), iOS Simulator, tvOS Simulator

**Run Manual**:
```bash
gh workflow run swift-frontend-ci-enhanced.yml \
  -f platform=all \
  -f run_performance_tests=false
```

### 3. SDK CI (`sdk/.github/workflows/test-and-quality.yml`)

**Purpose**: Testing and quality checks for TypeScript SDK

**Jobs**:
- `code-quality`: ESLint, TypeScript type checking, Prettier
- `unit-tests`: Unit tests across Node.js versions
- `property-based-tests`: Property-based testing with fast-check
- `performance-tests`: Performance benchmarks
- `integration-tests`: Integration tests across OS platforms
- `end-to-end-tests`: Complete workflow testing
- `security-audit`: npm audit, Snyk security scan
- `quality-gates`: Enforces all quality checks pass
- `release-prep`: Version validation and changelog generation

**Coverage Threshold**: 90%

**Platforms**: Ubuntu, Windows, macOS

**Node Versions**: 18.x, 20.x, 22.x

### 4. Integration Tests (`integration-tests.yml`)

**Purpose**: Cross-component integration testing

**Jobs**:
- `sdk-juce-integration`: Tests SDK → JUCE integration
- `swift-ffi-juce-integration`: Tests Swift → FFI → JUCE integration
- `song-rendering-tests`: Complete song rendering pipeline
- `real-time-audio-tests`: Real-time audio processing tests
- `performance-regression-tests`: Performance regression detection
- `end-to-end-tests`: Complete workflow testing
- `quality-gates`: Enforces all integration tests pass
- `notify`: Slack notifications

**Test Suites**:
- SDK → JUCE integration
- Swift → FFI → JUCE integration
- Song rendering pipeline
- Real-time audio processing
- Complete user workflows

**Run Manual**:
```bash
gh workflow run integration-tests.yml \
  -f test_suite=all \
  -f run_performance_tests=false
```

### 5. Deployment Automation (`deploy.yml`)

**Purpose**: Automated versioning, building, and deployment

**Jobs**:
- `pre-deploy-checks`: Validates tests pass and branch protection
- `semantic-release`: Automatic version generation
- `build-artifacts`: Builds release artifacts for all platforms
- `code-signing`: Code signing and notarization (macOS)
- `changelog`: Automatic changelog generation
- `create-release`: Creates GitHub release with artifacts
- `deploy-testing`: Deploys to testing channel
- `deploy-staging`: Deploys to staging environment
- `deploy-production`: Deploys to production
- `notify`: Deployment notifications

**Release Types**:
- `patch`: Bug fixes (1.0.0 → 1.0.1)
- `minor`: New features (1.0.0 → 1.1.0)
- `major`: Breaking changes (1.0.0 → 2.0.0)

**Run Manual**:
```bash
gh workflow run deploy.yml \
  -f release_type=patch \
  -f deploy_environment=testing
```

---

## Triggers

### Automatic Triggers

**On Push**:
- Main branch: All workflows run
- Develop branch: All workflows run
- Feature branches: CI workflows run (no deployment)

**On Pull Request**:
- To main/develop: All CI workflows run
- No deployment on PRs

**Scheduled**:
- Daily at 2 AM UTC: Comprehensive test suite
- Weekly: Performance regression tests

### Manual Triggers

**Using GitHub CLI**:
```bash
# List workflows
gh workflow list

# Run specific workflow
gh workflow run <workflow-name> -f key=value

# View workflow runs
gh run list --workflow=<workflow-name>

# View specific run
gh run view <run-id>
```

**Using GitHub Web UI**:
1. Navigate to Actions tab
2. Select workflow from left sidebar
3. Click "Run workflow" button
4. Select branch and provide inputs
5. Click "Run workflow"

---

## Quality Gates

### Coverage Thresholds

| Component | Threshold | Tool |
|-----------|-----------|------|
| JUCE Backend | 85% | llvm-cov |
| Swift Frontend | 85% | llvm-cov |
| SDK | 90% | Vitest |

### Performance Thresholds

| Test Type | Threshold | Action |
|-----------|-----------|--------|
| Performance Regression | 5% | Fail build |
| Memory Leaks | 0 | Fail build |
| Undefined Behavior | 0 | Fail build |
| Data Races | 0 | Fail build |

### Security Scanning

| Tool | Purpose | Action |
|------|---------|--------|
| npm audit | Dependency vulnerabilities | Warn on moderate |
| Snyk | Security scanning | Continue on error |
| clang-tidy | C++ static analysis | Warning |
| SwiftLint | Swift linting | Warning |

### Quality Gate Status

**PASSED**:
- ✅ All unit tests pass
- ✅ Coverage meets threshold
- ✅ All integration tests pass
- ✅ No performance regressions
- ✅ No critical security issues

**FAILED**:
- ❌ Any test fails
- ❌ Coverage below threshold
- ❌ Performance regression detected
- ❌ Critical security issue

---

## Deployment

### Environments

**Testing**:
- Automatic on every main branch merge
- Deploys to internal testing channel
- Runs smoke tests
- Notifies testing team

**Staging**:
- Manual trigger after testing approval
- Deploys to staging environment
- Runs full regression suite
- Performance validation

**Production**:
- Manual trigger after staging approval
- Creates GitHub release
- Deploys to production distribution
- Updates download page
- Sends release notifications

### Release Process

**1. Pre-Deployment Checks**:
- All tests pass
- Branch protection rules met
- No uncommitted changes

**2. Semantic Release**:
- Analyzes commit messages
- Determines version bump (patch/minor/major)
- Generates changelog
- Creates git tag

**3. Build Artifacts**:
- Linux (x64)
- macOS (universal, arm64)
- iOS (arm64)
- tvOS (arm64)
- Windows (x64)

**4. Code Signing** (macOS):
- Developer ID signing
- Notarization with Apple
- Stapling notarization ticket

**5. Create Release**:
- GitHub release with artifacts
- Changelog generation
- Release notes

**6. Deploy**:
- Upload to distribution channel
- Update documentation
- Send notifications

### Commit Message Conventions

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature (minor version)
- `fix`: Bug fix (patch version)
- `perf`: Performance improvement (patch version)
- `refactor`: Code refactoring (patch version)
- `chore`: Maintenance tasks (patch version)
- `docs`: Documentation (patch version)
- `BREAKING CHANGE`: Breaking change (major version)

**Examples**:
```
feat(dsp): add reverb effect to nex_synth

Implement high-quality reverb with:
- Predelay control
- Decay time adjustment
- Wet/dry mix
- Early reflections

Closes #123
```

```
fix(audio): resolve memory leak in dsp pipeline

Memory leak occurred when reusing buffers
without proper cleanup. Added explicit
buffer deallocation.

Fixes #456
```

---

## Monitoring

### Metrics

**Build Metrics**:
- Build duration (target: <30 minutes)
- Success rate (target: >95%)
- Cache hit rate (target: >80%)

**Test Metrics**:
- Test coverage (target: >85%)
- Test execution time (target: <15 minutes)
- Flaky test rate (target: 0%)

**Performance Metrics**:
- Benchmark regressions (target: 0)
- Memory usage (target: <2GB baseline)
- CPU usage (target: <80% peak)

### Alerting

**Slack Notifications**:
- Build failures: Immediate
- Test failures: Immediate
- Performance regressions: Immediate
- Deployment success: Summary
- Deployment failure: Immediate

**Email Notifications**:
- Weekly build summary
- Monthly performance report
- Quarterly security scan results

### Dashboards

**GitHub Actions Dashboard**:
- Workflow run history
- Success/failure rates
- Performance trends
- Artifact storage

**Custom Metrics Dashboard**:
(To be implemented with Grafana/CloudWatch)

---

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptom**: Workflow fails during build step

**Diagnosis**:
```bash
# Check workflow logs
gh run view <run-id> --log

# Check build step
gh run view <run-id> --log | grep -A 20 "Build"
```

**Solutions**:
- Check for compilation errors
- Verify dependencies are installed
- Check for cache corruption (clear cache and retry)
- Verify build matrix compatibility

#### 2. Test Failures

**Symptom**: Tests pass locally but fail in CI

**Diagnosis**:
```bash
# Run tests locally with CI settings
npm test -- --ci
swift test --enable-code-coverage
```

**Solutions**:
- Check for environment differences
- Verify test fixtures are committed
- Check for timing issues (increase timeouts)
- Verify test isolation (no shared state)

#### 3. Coverage Below Threshold

**Symptom**: Coverage gate fails

**Diagnosis**:
```bash
# Generate coverage report locally
npm run test:coverage
swift test --enable-code-coverage
```

**Solutions**:
- Identify uncovered code
- Add tests for uncovered paths
- Remove dead code
- Adjust threshold if appropriate

#### 4. Performance Regression

**Symptom**: Performance tests detect regression

**Diagnosis**:
```bash
# Compare with baseline
node scripts/compare-benchmarks.py \
  --baseline baseline.json \
  --current current.json
```

**Solutions**:
- Profile the regression
- Identify performance bottleneck
- Optimize critical path
- Update baseline if improvement

#### 5. Cache Issues

**Symptom**: Build fails with cache errors

**Diagnosis**:
```bash
# Check cache status
gh cache list
```

**Solutions**:
- Clear cache: `gh cache delete`
- Update cache version in workflow
- Reduce cache size
- Use cache key dependencies

### Emergency Procedures

#### Rollback Deployment

```bash
# Delete GitHub release
gh release delete <tag> -y

# Create rollback tag
git tag -a rollback-$(date +%Y%m%d) -m "Rollback deployment"
git push origin rollback-$(date +%Y%m%d)

# Redeploy previous version
gh workflow run deploy.yml -f release_type=patch
```

#### Hotfix Deployment

```bash
# Create hotfix branch
git checkout -b hotfix/<issue-number>

# Make fix and commit
git commit -m "fix: urgent fix for <issue>"

# Push and create PR
git push origin hotfix/<issue-number>
gh pr create --title "Hotfix: <issue>" --body "Urgent fix"

# After approval, merge to main
# This will trigger deployment
```

#### Disable Failing Workflow

```bash
# Disable workflow temporarily
gh workflow disable <workflow-name>

# Re-enable when fixed
gh workflow enable <workflow-name>
```

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor workflow runs
- Review failure notifications
- Check performance metrics

**Weekly**:
- Review and merge pending PRs
- Update dependencies
- Clean up old artifacts
- Review security scan results

**Monthly**:
- Update CI/CD workflows
- Review and optimize build times
- Update documentation
- Review and update quality gates

**Quarterly**:
- Major dependency updates
- Security audit
- Performance optimization
- Architecture review

### Updates

**Update GitHub Actions**:
```yaml
# Check for updates
# https://github.com/actions/checkout
# https://github.com/actions/setup-node
# etc.

# Update version in workflow
- uses: actions/checkout@v4  # Update version
```

**Update Dependencies**:
```bash
# SDK dependencies
npm update

# Swift dependencies
swift package update

# JUCE dependencies
# Update submodules
git submodule update --remote
```

### Cache Management

**Clear Cache**:
```bash
# List caches
gh cache list

# Delete specific cache
gh cache delete <cache-id>

# Delete all caches
gh cache delete --all
```

**Optimize Cache**:
- Use specific cache keys
- Limit cache size (<10GB per cache)
- Use cache key dependencies (hashFiles)
- Regular cache cleanup

---

## Best Practices

### 1. Commit Messages

**DO**:
```
feat(dsp): add reverb effect
fix(audio): resolve memory leak
perf(renderer): optimize rendering
```

**DON'T**:
```
updates
fix stuff
wip
```

### 2. Branch Naming

**DO**:
```
feature/add-reverb-effect
bugfix/memory-leak
hotfix/critical-audio-issue
```

**DON'T**:
```
stuff
test-branch
fix
```

### 3. Testing

**DO**:
- Write tests for all new features
- Maintain >85% coverage
- Test edge cases
- Use property-based testing

**DON'T**:
- Skip tests for "simple" code
- Write tests that only pass locally
- Ignore test failures
- Mock everything

### 4. Performance

**DO**:
- Profile before optimizing
- Benchmark critical paths
- Monitor regressions
- Use appropriate algorithms

**DON'T**:
- Optimize prematurely
- Ignore performance warnings
- Skip benchmarks
- Use O(n²) when O(n) available

---

## Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [JUCE Documentation](https://docs.juce.com/)
- [Swift Package Manager](https://swift.org/package-manager/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Tools
- [GitHub CLI](https://cli.github.com/)
- [Codecov](https://codecov.io/)
- [Snyk](https://snyk.io/)
- [Semantic Release](https://github.com/semantic-release/semantic-release)

### Slack Commands
- `/workflow run <workflow>` - Run workflow
- `/workflow status` - Check workflow status
- `/deploy <env>` - Deploy to environment

---

## Support

For CI/CD issues:
1. Check this runbook
2. Review workflow logs
3. Check GitHub Actions status
4. Contact DevOps team

For urgent issues:
- Slack: #devops-alerts
- Email: devops@whiteroom.audio
- On-call: [REDACTED]

---

**Last Updated**: 2025-01-15
**Maintained By**: DevOps Team
**Version**: 1.0.0
