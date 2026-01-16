# Getting Started Guide

Welcome to White Room! This guide will help you set up your development environment, build the project, and get started with development.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Environment](#development-environment)
3. [Installation](#installation)
4. [Building the Project](#building-the-project)
5. [Running Tests](#running-tests)
6. [Common Workflows](#common-workflows)
7. [Next Steps](#next-steps)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview

White Room is a next-generation audio plugin development environment that combines:

- **JUCE C++ Backend** - Real-time audio processing with VST3/AU/CLAP support
- **Swift Frontend** - Modern SwiftUI interface for iOS/macOS/tvOS
- **TypeScript SDK** - Shared type definitions across the stack
- **FFI Bridge** - Seamless Swift/C++ interop for real-time audio
- **Schillinger Systems** - Algorithmic music theory and composition
- **Python Tooling** - Development utilities and automation

### What You Can Build

- **Audio Plugins** - VST3, AU, and CLAP plugins for DAWs
- **iOS Apps** - Native iOS music apps with real-time audio
- **Algorithmic Compositions** - Schillinger-based generative music
- **Audio Effects** - Real-time audio processing and effects
- **Performance Systems** - Live performance and blending tools

---

## Development Environment

### Required Tools

#### Core Dependencies

- **Git** - Version control
- **CMake** 3.22+ - Build system for JUCE
- **Python** 3.10+ - Development utilities
- **Node.js** 18+ - TypeScript tooling
- **Xcode** 14+ - Swift development (macOS/iOS)

#### Platform-Specific

**macOS:**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install cmake ninja python@3.10 node git-lfs
```

**Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    python3.10 \
    python3-pip \
    nodejs \
    npm \
    git \
    git-lfs \
    libasound2-dev \
    libx11-dev \
    libxrandr-dev \
    libxcursor-dev \
    libxinerama-dev \
    libxi-dev \
    libgl1-mesa-dev
```

**Windows:**
- Install Visual Studio 2022 with C++ development tools
- Install CMake from https://cmake.org/download/
- Install Python 3.10+ from https://www.python.org/downloads/
- Install Node.js from https://nodejs.org/

### Optional Tools

- **CLAP Validator** - CLAP plugin validation
- **REAPER** - DAW for plugin testing
- **VS Code** - Lightweight code editor
- **JetBrains CLion** - C++ IDE (recommended)

---

## Installation

### 1. Clone the Repository

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/yourusername/white_room.git
cd white_room

# Or if you already cloned without submodules:
git submodule update --init --recursive
```

### 2. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Install Node.js Dependencies

```bash
# Install TypeScript SDK dependencies
cd sdk
npm install
cd ..
```

### 4. Initialize Git Hooks

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install
```

### 5. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# (Most defaults work for development)
```

---

## Building the Project

### Build All Components

```bash
# Build everything (JUCE, Swift, TypeScript)
./scripts/build_all.sh
```

### Build Individual Components

#### JUCE Backend (C++)

```bash
cd juce_backend

# Configure CMake
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

# Build all plugins
cmake --build build --target all -j$(sysctl -n hw.ncpu)  # macOS
cmake --build build --target all -j$(nproc)              # Linux

# Build specific plugin
cmake --build build --target LocalGal
cmake --build build --target NexSynth
```

#### Swift Frontend

```bash
cd swift_frontend/WhiteRoomiOS

# Build for iOS
xcodebuild -scheme WhiteRoomiOS \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    clean build

# Build for macOS
xcodebuild -scheme WhiteRoomiOS \
    -destination 'platform=macOS' \
    clean build
```

#### TypeScript SDK

```bash
cd sdk

# Build TypeScript
npm run build

# Watch mode for development
npm run watch
```

### Build Verification

```bash
# Verify all builds succeeded
./scripts/verify_build.sh
```

---

## Running Tests

### Run All Tests

```bash
# Run complete test suite
./scripts/test_all.sh
```

### Run Component-Specific Tests

#### C++ Tests

```bash
cd juce_backend

# Run all C++ tests
ctest --test-dir build --output-on-failure

# Run specific test
ctest --test-dir build -R TestSchillinger
```

#### Swift Tests

```bash
cd swift_frontend/WhiteRoomiOS

# Run all Swift tests
xcodebuild test \
    -scheme WhiteRoomiOS \
    -destination 'platform=iOS Simulator,name=iPhone 15'

# Run specific test
xcodebuild test \
    -scheme WhiteRoomiOS \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    -only-testing:WhiteRoomiOSTests/JUCEEngineTests
```

#### TypeScript Tests

```bash
cd sdk

# Run all TypeScript tests
npm test

# Run specific test file
npm test -- --testNamePattern="ErrorHandling"

# Watch mode
npm test -- --watch
```

### Test Coverage

```bash
# Generate coverage report
cd sdk
npm run test:coverage

# View coverage in browser
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

---

## Common Workflows

### Workflow 1: Add a New Parameter to JUCE Plugin

```bash
# 1. Edit C++ plugin code
cd juce_backend/src/plugins/YourPlugin
vim YourPluginProcessor.h

# 2. Add parameter to processor
# 3. Update TypeScript definitions
cd sdk
vim src/parameters.ts
npm run build

# 4. Update Swift UI
cd swift_frontend/WhiteRoomiOS
vim Sources/SwiftFrontendCore/YourPluginView.swift

# 5. Build and test
./scripts/build_all.sh
./scripts/test_all.sh
```

### Workflow 2: Debug FFI Bridge Issue

```bash
# 1. Enable FFI debug logging
cd juce_backend/src/ffi
vim sch_engine.cpp  # Add #define ENABLE_FFI_DEBUG 1

# 2. Rebuild JUCE backend
cd ../..
cmake --build build --target schillinger-ffi

# 3. Run Swift app with logging
cd swift_frontend/WhiteRoomiOS
xcodebuild -scheme WhiteRoomiOS \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    clean build

# 4. Check console logs
log stream --predicate 'subsystem == "com.whiteroom.audio"' --level debug
```

### Workflow 3: Update Schillinger System

```bash
# 1. Modify Schillinger system
cd juce_backend/src/schillinger
vim rhythm_generator.cpp

# 2. Add unit tests
cd tests/cpp
vim test_rhythm_generator.cpp

# 3. Run tests
cd juce_backend
ctest --test-dir build -R TestRhythm

# 4. Update TypeScript types if API changed
cd sdk
vim src/schillinger.ts
npm run build
```

### Workflow 4: Test Plugin in DAW

```bash
# 1. Build plugin
cd juce_backend
cmake --build build --target LocalGal

# 2. Install to system
cp build/local_gal_plugin_build/LocalGal.vst3 ~/Library/Audio/Plug-Ins/VST3/

# 3. Open DAW (REAPER example)
open -a REAPER

# 4. Scan for new plugins in DAW
# 5. Add LocalGal to track and test
```

### Workflow 5: Format and Lint Code

```bash
# Format all code
./scripts/format_code.sh

# Lint all code
./scripts/lint_code.sh

# Fix linting issues automatically
cd sdk
npm run lint:fix

cd juce_backend
clang-tidy --fix src/ffi/*.cpp
```

---

## Next Steps

### Learn the Architecture

Read the [Architecture Overview](./architecture/overview.md) to understand:
- System architecture and components
- Data flow between layers
- Design patterns and best practices

### Explore the APIs

Check out the [API Documentation](./api/) to learn about:
- [JUCE Backend API](./api/juce-backend.md) - C++ audio engine
- [Swift Frontend API](./api/swift-frontend.md) - SwiftUI interface
- [TypeScript SDK API](./api/typescript-sdk.md) - Shared types
- [FFI Bridge API](./api/ffi-bridge.md) - Swift/C++ interop

### Build Something

Follow an integration guide:
- [Adding New Instruments](./integration/new-instruments.md) - Create synthesizers
- [Adding New Effects](./integration/new-effects.md) - Create audio effects
- [Extending Schillinger Systems](./integration/schillinger-extension.md) - Music theory

### Contribute

Read the [Contributing Guide](./contributing.md) to learn:
- Code style guidelines
- Pull request process
- Code review standards
- Testing requirements

---

## Troubleshooting

### Common Build Issues

#### Issue: CMake Configuration Fails

**Solution:**
```bash
# Verify CMake version
cmake --version  # Should be 3.22+

# Clean build directory
rm -rf juce_backend/build
cd juce_backend
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
```

#### Issue: Swift Build Fails with "Module Not Found"

**Solution:**
```bash
# Clean Swift build
cd swift_frontend/WhiteRoomiOS
rm -rf .build
rm -rf ~/Library/Developer/Xcode/DerivedData/WhiteRoomiOS-*

# Rebuild
xcodebuild clean build -scheme WhiteRoomiOS
```

#### Issue: TypeScript Compilation Errors

**Solution:**
```bash
# Clean node_modules and reinstall
cd sdk
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Common Runtime Issues

#### Issue: Plugin Not Scanning in DAW

**Solution:**
```bash
# Verify plugin exists
ls ~/Library/Audio/Plug-Ins/VST3/  # macOS

# Check file permissions
chmod +x ~/Library/Audio/Plug-Ins/VST3/*.vst3/Contents/MacOS/*

# Rescan plugins in DAW
```

#### Issue: FFI Bridge Crashes on iOS

**Solution:**
```bash
# Enable FFI logging (see Workflow 2)
# Check crash logs in Xcode Organizer
# Verify thread safety - all FFI calls must be on engineQueue
```

#### Issue: Audio Dropout/XRUNs

**Solution:**
```bash
# Increase buffer size in audio settings
# Reduce CPU load by closing other apps
# Check error handling guide for debugging
cat docs/error-handling-guide.md
```

### Getting Help

If you're still stuck:

1. **Check documentation** - Search these docs thoroughly
2. **Search issues** - Check GitHub issues for similar problems
3. **Enable logging** - Turn on debug logging
4. **Ask questions** - Post in GitHub Discussions
5. **Contact team** - Reach out to maintainers for critical issues

---

## Development Tips

### Productivity Tips

1. **Use IDE features** - Code completion, refactoring, navigation
2. **Run tests frequently** - Catch issues early
3. **Commit often** - Small, focused commits
4. **Read code** - Learn from existing implementations
5. **Use Confucius** - Check hierarchical memory for patterns

### Best Practices

1. **Write tests first** - TDD approach
2. **Document as you go** - Keep docs in sync
3. **Follow SLC principles** - Simple, Lovable, Complete
4. **Handle errors properly** - Use error handling system
5. **Optimize later** - Make it work, then make it fast

### Keyboard Shortcuts

**Xcode:**
- `Cmd + B` - Build
- `Cmd + R` - Run
- `Cmd + .` - Stop
- `Cmd + Shift + K` - Clean

**VS Code:**
- `Cmd + P` - Quick open file
- `Cmd + Shift + F` - Search in files
- `Cmd + \` - Toggle terminal

---

## Quick Reference

### Essential Commands

```bash
# Build
./scripts/build_all.sh              # Build everything
./scripts/clean.sh                  # Clean all builds

# Test
./scripts/test_all.sh               # Test everything
npm test                            # TypeScript tests
ctest --test-dir build              # C++ tests

# Format/Lint
./scripts/format_code.sh            # Format all code
./scripts/lint_code.sh              # Lint all code
npm run lint:fix                    # Fix TypeScript linting

# Git
git status                          # Check status
git pull                            # Pull latest changes
git submodule update --recursive     # Update submodules
```

### Key Files

```
white_room/
├── docs/developer/                 # This documentation
├── sdk/                            # TypeScript definitions
├── juce_backend/                   # C++ audio engine
│   ├── src/                        # Source code
│   │   ├── plugins/                # Plugin implementations
│   │   ├── schillinger/            # Music theory systems
│   │   └── ffi/                    # FFI bridge
│   └── tests/                      # C++ tests
├── swift_frontend/                 # Swift UI code
│   └── WhiteRoomiOS/
│       └── Sources/                # Swift source
└── scripts/                        # Build/test scripts
```

---

## What's Next?

You're now ready to start developing! Here are some suggested paths:

**New Developer:**
1. Read [Architecture Overview](./architecture/overview.md)
2. Explore existing code
3. Make a small change
4. Run tests
5. Submit PR

**Plugin Developer:**
1. Read [Adding New Instruments](./integration/new-instruments.md)
2. Study existing plugins
3. Create your plugin
4. Test in DAW
5. Share with community

**Contributor:**
1. Read [Contributing Guide](./contributing.md)
2. Find good first issue
3. Implement fix/feature
4. Add tests
5. Submit PR

**Welcome to White Room! Let's build something amazing together.**

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
