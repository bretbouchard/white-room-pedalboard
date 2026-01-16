# White Room Build Structure

## Overview

This document defines the centralized build artifact management system for White Room. All build artifacts from all build systems (Xcode, CMake, Swift Package Manager, Python, Node) MUST be placed in the `.build/` directory.

## Directory Structure

```
white_room/
├── .build/                    # All build artifacts (gitignored)
│   ├── xcode/                # Xcode build intermediates
│   │   ├── iOS/
│   │   ├── macOS/
│   │   └── DerivedData/
│   ├── cmake/                # CMake build intermediates
│   │   ├── aetherdrive/
│   │   ├── filtergate/
│   │   ├── nex_synth/
│   │   └── ...
│   ├── swift/                # Swift Package Manager builds
│   │   ├── WhiteRoomiOS/
│   │   └── sdk/
│   ├── python/               # Python build artifacts
│   │   ├── __pycache__/
│   │   ├── dist/
│   │   └── build/
│   ├── node/                 # Node.js build artifacts
│   │   └── cache/
│   └── temp/                 # Temporary build files
├── .artifacts/               # Build outputs (binaries, plugins)
│   ├── ios/
│   │   └── *.app/
│   ├── macos/
│   │   ├── *.vst3/
│   │   ├── *.component/
│   │   └── *.app/
│   ├── plugins/
│   │   └── *.vst3/
│   └── packages/
│       └── *.pkg/
└── build-config/             # Build configuration and scripts
    ├── cmake/
    │   └── presets/
    ├── xcode/
    │   └── xcconfig/
    └── scripts/
        ├── setup-builds.sh
        ├── migrate-builds.sh
        ├── clean-builds.sh
        └── validate-builds.sh
```

## Rationale

### Problems with Current State

1. **Scattered Artifacts**: Build directories scattered across 20+ plugin directories
2. **No Centralization**: Each build system creates its own `build/` directory
3. **Disk Waste**: Duplicate build artifacts consuming ~1.5GB+ disk space
4. **Cleanup Difficulty**: No single location to clean all build artifacts
5. **CI/CD Complexity**: Hard to validate all build artifacts are ignored

### Benefits of Centralized Structure

1. **Single Cleanup**: `rm -rf .build/ .artifacts/` cleans everything
2. **Predictable Locations**: All agents know where build artifacts go
3. **Better CI/CD**: Easy to validate and cache build artifacts
4. **Disk Optimization**: Shared intermediates reduce duplication
5. **Agent Enforcement**: Simple rules for all AI agents to follow

## Build System Mappings

### Xcode Projects

**Current**: `~/Library/Developer/Xcode/DerivedData/`

**New**: `.build/xcode/DerivedData/`

**Configuration**:
```bash
# Set in Xcode build settings or via xcodebuild
DERIVED_DATA_DIR=.build/xcode/DerivedData
BUILD_DIR=.build/xcode/Intermediates
```

**Example Build Command**:
```bash
xcodebuild -project WhiteRoomiOS.xcodeproj \
  -derivedDataPath .build/xcode/DerivedData \
  -scheme WhiteRoomiOS \
  -configuration Debug
```

### CMake Projects

**Current**: `juce_backend/*_plugin_build/build/`

**New**: `.build/cmake/<project-name>/`

**Configuration**:
```bash
# Always use -B flag to specify build directory
cmake -B .build/cmake/<project-name> -S <source-dir>
cmake --build .build/cmake/<project-name>
```

**Example Build Command**:
```bash
cmake -B .build/cmake/aetherdrive \
  -S juce_backend/aetherdrive_plugin_build \
  -DCMAKE_BUILD_TYPE=Release
cmake --build .build/cmake/aetherdrive
```

### Swift Package Manager

**Current**: `.build/` (already correct)

**New**: `.build/swift/`

**Configuration**:
```bash
# SPM uses .build/ by default, we map to .build/swift/
swift build --scratch-path .build/swift
```

**Example Build Command**:
```bash
cd swift_frontend
swift build --scratch-path ../.build/swift/WhiteRoomiOS
```

### Python

**Current**: `__pycache__/`, `build/`, `dist/` scattered throughout

**New**: `.build/python/__pycache__/`, `.build/python/dist/`

**Configuration**:
```bash
# Set environment variables
export PYTHON_BUILD_ROOT=.build/python
python -m py_compile <module>  # Uses __pycache__
pip install . --build .build/python/build
```

### Node.js

**Current**: `node_modules/.cache/` in each project

**New**: `.build/node/cache/`

**Configuration**:
```bash
# Set npm cache location
npm config set cache .build/node/cache
```

## Migration Plan

### Phase 1: Setup (Day 1)

1. Create `.build/` directory structure
2. Update `.gitignore` with comprehensive rules
3. Create build setup script
4. Document new structure

### Phase 2: CMake Migration (Day 1-2)

1. Update all CMake builds to use `-B .build/cmake/<project>`
2. Test each plugin builds correctly
3. Remove old `build/` directories

### Phase 3: Xcode Migration (Day 2-3)

1. Update Xcode build settings in all projects
2. Configure derived data location
3. Test iOS and macOS builds

### Phase 4: Swift & Python (Day 3)

1. Update SPM build commands
2. Configure Python build paths
3. Test all builds

### Phase 5: Cleanup & Validation (Day 4)

1. Run migration script to move existing artifacts
2. Validate no build artifacts outside `.build/`
3. Update CI/CD pipelines
4. Clean up old directories

## Enforcement

### Agent Instructions

All AI agents MUST follow these rules:

1. **Before Building**: Check if `.build/` exists, run `setup-builds.sh` if not
2. **During Build**: Always use centralized build locations
3. **After Build**: Validate artifacts are in `.build/`
4. **Never Create**: `build/` directories in project root

### Environment Variables

```bash
# Set in .claude/BUILD_ENV.md
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

### Validation

Run `./build-config/scripts/validate-builds.sh` to:
- Scan for build artifacts outside `.build/`
- Report violations
- Exit with code 1 if violations found

## Success Metrics

- [ ] Zero `build/` directories in project root
- [ ] All build artifacts in `.build/`
- [ ] All CI/CD passes validation
- [ ] Disk usage reduced by 50%+
- [ ] All agents enforce new structure
- [ ] Documentation complete and clear

## Troubleshooting

### Build Fails After Migration

1. Check build directory is correct: `ls -la .build/cmake/<project>/`
2. Clean and rebuild: `rm -rf .build/ && ./build-config/scripts/setup-builds.sh`
3. Check CMake cache: `cat .build/cmake/<project>/CMakeCache.txt`

### Old Build Artifacts Remain

1. Run migration script: `./build-config/scripts/migrate-builds.sh`
2. Run validation: `./build-config/scripts/validate-builds.sh`
3. Manually clean if needed: `find . -type d -name "build" -not -path "./.build/*" -exec rm -rf {} +`

### Agent Doesn't Follow Rules

1. Check `.claude/CLAUDE.md` has build rules
2. Check `.claude/BUILD_ENV.md` exists
3. Review agent's instructions before build
4. Report violation for documentation update

## References

- [CMake Build Directory](https://cmake.org/cmake/help/latest/manual/cmake.1.html#build-a-project)
- [Xcode Build Settings](https://developer.apple.com/documentation/xcode/build-settings-reference)
- [Swift Package Manager](https://github.com/apple/swift-package-manager)
