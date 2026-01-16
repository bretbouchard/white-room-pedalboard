# Suggested Commands for White Room Development

## Essential Commands (Always Use First)

```bash
# Check bd for existing work BEFORE starting any task
bd ready --json

# Check Confucius for relevant patterns BEFORE starting any task
# (Ask Claude to search Confucius)
```

## SDK (TypeScript) Commands

```bash
cd sdk

# Build all packages
npm run build

# Build specific package
npm run build:shared
npm run build:core
npm run build:generation
npm run build:audio

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Type checking
npm run type-check:all

# Linting
npm run lint:all

# Fix linting issues
npm run lint:fix

# Quality check (type-check + lint)
npm run quality
```

## Swift Frontend Commands

```bash
cd swift_frontend

# Build with SPM
swift build

# Run tests
swift test

# Format code
swift-format .

# Build for tvOS Simulator
xcodebuild -scheme SwiftFrontend -destination 'platform=tvOS Simulator,name=Apple TV'

# Build for iOS Simulator
xcodebuild -scheme SwiftFrontend -destination 'platform=iOS Simulator,name=iPhone 15'

# Build for macOS
swift run
```

## JUCE Backend Commands

```bash
cd juce_backend

# Configure build
cmake -B build -S .

# Build
cmake --build build

# Run tests
cd build
ctest --output-on-failure
```

## Beads (Task Tracking) Commands

```bash
# Check ready work
bd ready --json

# Create new issue
bd create "Task description"

# Update issue status
bd update <id> --status "doing"

# Close issue with resolution (triggers Confucius auto-learning)
bd close <id> --message "Fixed by [solution]. This pattern should be remembered."
```

## SpecKit Commands

```bash
# Write feature specification
/speckit.specify

# Create implementation plan
/speckit.plan

# Generate actionable tasks
/speckit.tasks

# Execute implementation
/speckit.implement

# Validate completion
/validate
```

## Git Commands

```bash
# Check status
git status

# Create feature branch
git checkout -b feature/feature-name

# Commit with bd issue reference
git commit -m "[white_room-123] Fix build error"

# Push to remote
git push origin feature/feature-name
```

## System Commands (macOS/Darwin)

```bash
# List files
ls -la

# Find files
find . -name "*.ts"

# Search in files
grep -r "pattern" .

# Check disk space
df -h

# Check processes
ps aux | grep process-name

# Kill process
kill -9 <pid>
```

## Validation Command

```bash
# Run complete validation (5-phase)
/validate

# This runs:
# 1. Linting
# 2. Type Checking
# 3. Style Checking
# 4. Unit Testing
# 5. End-to-End Testing
```
