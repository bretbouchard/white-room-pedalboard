# CI/CD Quick Start Guide

Fast-track guide for White Room CI/CD pipeline usage.

## Quick Setup

### 1. Required Secrets

Add these secrets to your GitHub repository settings (`Settings → Secrets and variables → Actions`):

**Authentication**:
```
PAT_TOKEN - Personal Access Token for submodules
  Scopes: repo (full repo access)
  Create at: https://github.com/settings/tokens
```

**Code Signing (macOS/iOS)**:
```
APPLE_CERTIFICATES_P12_BASE64 - Base64 encoded .p12 certificate
CERTIFICATE_PASSWORD - Certificate password
KEYCHAIN_PASSWORD - Keychain password
APPLE_DEVELOPER_ID - Apple Developer ID
APPLE_ID - Apple ID email
APPLE_APP_PASSWORD - App-specific password
APPLE_TEAM_ID - Apple Team ID
```

**Notifications**:
```
SLACK_WEBHOOK_URL - Slack webhook URL for notifications
  Create at: https://api.slack.com/messaging/webhooks
```

**Security**:
```
SNYK_TOKEN - Snyk API token for security scanning
  Create at: https://snyk.io/account
```

### 2. Required Variables

Add these variables to your GitHub repository settings (`Settings → Secrets and variables → Actions → Variables`):

```
SLACK_WEBHOOK_URL - Same as secret (for public workflows)
TESTING_WEBHOOK_URL - Testing channel webhook
DEPLOYMENT_WEBHOOK_URL - Deployment webhook
```

## Common Workflows

### Run Tests

```bash
# Run all tests
gh workflow run juce-backend-ci.yml
gh workflow run swift-frontend-ci-enhanced.yml
gh workflow run integration-tests.yml

# Run specific test suite
gh workflow run juice-backend-ci.yml -f run_sanitizers=true
gh workflow run integration-tests.yml -f test_suite=sdk-juce
```

### Deploy to Testing

```bash
# Automatic deployment (on merge to main)
# Just merge your PR and it deploys automatically

# Manual deployment
gh workflow run deploy.yml -f deploy_environment=testing
```

### Deploy to Production

```bash
# Step 1: Create release (automatically creates version)
git commit -m "chore(release): 1.2.3"
git push

# Step 2: Deploy to production
gh workflow run deploy.yml \
  -f release_type=patch \
  -f deploy_environment=production
```

### Manual Release

```bash
# Option 1: Commit message based
git commit -m "feat: new feature" # Bumps minor version
git commit -m "fix: bug fix"      # Bumps patch version
git commit -m "BREAKING CHANGE: ..." # Bumps major version
git push

# Option 2: Manual trigger
gh workflow run deploy.yml \
  -f release_type=minor \
  -f deploy_environment=production
```

## Workflow Status

### Check Status

```bash
# List all workflows
gh workflow list

# List recent runs
gh run list

# Check specific workflow
gh run list --workflow=juce-backend-ci.yml

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# Watch logs in real-time
gh run watch
```

### Cancel Running Workflow

```bash
# List running workflows
gh run list --status=running

# Cancel specific run
gh run cancel <run-id>

# Cancel all runs for workflow
gh run list --workflow=<workflow-name> --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}
```

## Troubleshooting

### Build Failed

```bash
# View failed logs
gh run view <run-id> --log-failed

# Download logs
gh run view <run-id> --log > build.log

# Common issues:
# 1. Cache corruption → Clear cache and retry
# 2. Dependency timeout → Re-run workflow
# 3. Flaky test → Re-run failed jobs
```

### Clear Cache

```bash
# List caches
gh cache list

# Delete all caches
gh cache delete --all

# Delete specific cache
gh cache delete <cache-id>
```

### Re-run Failed Jobs

```bash
# Re-run entire workflow
gh run rerun <run-id>

# Re-run failed jobs only
gh run rerun <run-id> --failed

# Debug workflow locally (using act)
brew install act
act push  # Runs workflow locally using Docker
```

## Notifications

### Slack Integration

**Setup**:
1. Create Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Copy webhook URL
4. Add to GitHub secrets: `SLACK_WEBHOOK_URL`

**Custom Notifications**:
Edit workflow files to customize notification format:
```yaml
- name: Slack notification
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ vars.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Custom message here"
      }
```

## Performance Monitoring

### Check Build Times

```bash
# View workflow duration
gh run view <run-id> --json conclusion,startedAt,completedAt

# Average build time (last 10 runs)
gh run list --limit 10 --json databaseId,conclusion,startedAt,completedAt | \
  jq '[.[] | (.completedAt - .startedAt) | . / 1000000000] | add / length'
```

### Optimize Builds

**Tips**:
1. Enable caching (already enabled)
2. Use matrix builds (already enabled)
3. Parallelize independent jobs
4. Use `--no-ci` flag for local testing

## Security Scanning

### Run Security Scan

```bash
# Scan dependencies
npm audit
snyk test

# Scan code
# Automatically runs in CI/CD
# View results in workflow logs
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update Swift packages
swift package update

# Update JUCE submodules
git submodule update --remote
```

## Best Practices

### Commit Messages

```
✅ Good:
feat(dsp): add reverb effect to nex_synth
fix(audio): resolve memory leak in renderer
perf(engine): optimize rendering by 20%

❌ Bad:
updates
fix stuff
wip
```

### Branch Names

```
✅ Good:
feature/add-reverb-effect
bugfix/memory-leak
hotfix/critical-audio-issue

❌ Bad:
stuff
test-branch
fix
```

### Testing

```
✅ Good:
- Test locally first
- Run all tests before pushing
- Maintain >85% coverage
- Write tests for new features

❌ Bad:
- Push without testing
- Skip tests for "simple" code
- Ignore failing tests
- Mock everything
```

## Getting Help

### Documentation
- Full Runbook: `infrastructure/cicd/CICD_RUNBOOK.md`
- GitHub Actions: https://docs.github.com/en/actions
- JUCE Docs: https://docs.juce.com/

### Support Channels
- Slack: #devops-help
- Email: devops@whiteroom.audio
- Issues: https://github.com/[repo]/issues

### Emergency Contacts
- On-Call DevOps: [REDACTED]
- Critical Issues: Slack #devops-alerts

## Quick Reference

### GitHub CLI Commands

```bash
# Workflows
gh workflow list                              # List workflows
gh workflow run <name>                        # Run workflow
gh run list                                   # List runs
gh run view <id>                              # View run
gh run watch                                  # Watch runs
gh run cancel <id>                            # Cancel run
gh run rerun <id>                             # Re-run

# PRs
gh pr list                                    # List PRs
gh pr create                                  # Create PR
gh pr merge <number>                          # Merge PR
gh pr checks <number>                         # Check status

# Issues
gh issue list                                 # List issues
gh issue create                               # Create issue
gh issue close <number>                       # Close issue

# Releases
gh release list                               # List releases
gh release create                             # Create release
gh release view <tag>                         # View release

# Cache
gh cache list                                 # List caches
gh cache delete <id>                          # Delete cache
gh cache delete --all                         # Delete all
```

### Common Workflow Inputs

**JUCE Backend CI**:
- `build_type`: Debug, Release, RelWithDebInfo
- `run_sanitizers`: true/false
- `run_performance_tests`: true/false

**Swift Frontend CI**:
- `platform`: all, ios, macos, tvos
- `run_performance_tests`: true/false

**Integration Tests**:
- `test_suite`: all, sdk-juce, swift-ffi-juce, song-rendering, real-time-audio
- `run_performance_tests`: true/false

**Deployment**:
- `release_type`: patch, minor, major
- `deploy_environment`: testing, staging, production

### Environment Variables

```bash
# Local testing with CI settings
export CI=true
export NODE_ENV=test
export INTEGRATION_TEST_MODE=mock
export HARDWARE_SIMULATION=true

# Run with CI settings locally
npm test -- --ci
swift test --enable-code-coverage
```

---

**Ready to go!** 🚀

For detailed information, see the full [CI/CD Runbook](CICD_RUNBOOK.md).
