# White Room Build Configuration

This directory contains build configuration and scripts for the White Room project.

## Quick Start

### First Time Setup

```bash
# Create centralized build directory structure
./build-config/scripts/setup-builds.sh
```

### Migrate Existing Builds

```bash
# Preview migration (safe, no changes)
./build-config/scripts/migrate-builds.sh --dry-run

# Perform migration
./build-config/scripts/migrate-builds.sh

# Clean up old directories after verification
./build-config/scripts/migrate-builds.sh --force
```

### Clean Builds

```bash
# Clean build intermediates only
./build-config/scripts/clean-builds.sh

# Clean everything including compiled artifacts
./build-config/scripts/clean-builds.sh --all
```

### Validate Build Structure

```bash
# Check for violations
./build-config/scripts/validate-builds.sh

# Exit with code 1 if violations found (for CI/CD)
./build-config/scripts/validate-builds.sh --exit-code
```

## Build System Usage

### CMake (JUCE Plugins)

All CMake builds must use the centralized `.build/cmake/` directory:

```bash
# Configure
cmake -B .build/cmake/aetherdrive \
  -S juce_backend/aetherdrive_plugin_build \
  -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build .build/cmake/aetherdrive

# Clean
rm -rf .build/cmake/aetherdrive
```

### Xcode (iOS/macOS Apps)

Xcode builds should use centralized derived data location:

```bash
# Command line
xcodebuild -project WhiteRoomiOS.xcodeproj \
  -scheme WhiteRoomiOS \
  -derivedDataPath .build/xcode/DerivedData \
  -configuration Debug
```

For Xcode IDE, the build location is configured via:
- `build-config/xcode/xcconfig/BuildDirectories.xcconfig`

### Swift Package Manager

```bash
# Build with centralized scratch path
cd swift_frontend
swift build --scratch-path ../.build/swift/WhiteRoomiOS
```

### Python

```bash
# Install with build directory
pip install . --build .build/python/build
```

## Directory Structure

```
build-config/
├── cmake/
│   └── presets/              # CMake preset configurations
├── xcode/
│   └── xcconfig/             # Xcode build settings
└── scripts/
    ├── setup-builds.sh       # Create build directory structure
    ├── migrate-builds.sh     # Migrate existing artifacts
    ├── clean-builds.sh       # Clean build artifacts
    └── validate-builds.sh    # Validate build structure
```

## Troubleshooting

### Build Fails After Setup

1. Check `.build/` directory exists:
   ```bash
   ls -la .build/
   ```

2. Re-run setup if needed:
   ```bash
   ./build-config/scripts/setup-builds.sh
   ```

3. Clean and retry:
   ```bash
   ./build-config/scripts/clean-builds.sh
   ```

### Old Build Artifacts Remain

1. Run validation to find violations:
   ```bash
   ./build-config/scripts/validate-builds.sh
   ```

2. Migrate existing artifacts:
   ```bash
   ./build-config/scripts/migrate-builds.sh
   ```

3. Force cleanup after verification:
   ```bash
   ./build-config/scripts/migrate-builds.sh --force
   ```

### Build System Uses Wrong Directory

Each build system has specific configuration:

- **CMake**: Use `-B` flag to specify build directory
- **Xcode**: Use `-derivedDataPath` flag or xcconfig
- **Swift**: Use `--scratch-path` flag
- **Python**: Use `--build` flag with pip

See BUILD_STRUCTURE.md for detailed examples.

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Validate Build Structure
  run: ./build-config/scripts/validate-builds.sh --exit-code

- name: Setup Build Environment
  run: ./build-config/scripts/setup-builds.sh

- name: Build Project
  run: cmake --build .build/cmake/myproject
```

## Environment Variables

Source the build environment:

```bash
# Add to ~/.zshrc or ~/.bashrc
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

## See Also

- `/Users/bretbouchard/apps/schill/white_room/BUILD_STRUCTURE.md` - Complete build system documentation
- `/Users/bretbouchard/apps/schill/white_room/.claude/BUILD_ENV.md` - Environment variables reference
- `/Users/bretbouchard/apps/schill/white_room/.claude/CLAUDE.md` - Agent instructions and rules
