# White Room Build Environment Variables

## Mandatory Environment Variables

All AI agents and build scripts MUST use these environment variables:

```bash
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"

# Build system specific paths
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

## Loading Environment Variables

Add to your shell profile (~/.zshrc or ~/.bashrc):

```bash
# White Room build environment
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

## Agent Usage Rules

1. **Before any build operation**: Check if `.build/` exists
2. **If not present**: Run `./build-config/scripts/setup-builds.sh`
3. **Always use**: Centralized build paths defined above
4. **Never create**: `build/` directories in project root

## Build Command Examples

### CMake
```bash
cmake -B .build/cmake/myproject -S path/to/source
cmake --build .build/cmake/myproject
```

### Xcode
```bash
xcodebuild -project MyProject.xcodeproj \
  -derivedDataPath .build/xcode/DerivedData \
  -scheme MyScheme
```

### Swift Package Manager
```bash
swift build --scratch-path .build/swift
```

### Python
```bash
export PYTHON_BUILD_ROOT=.build/python
pip install . --build .build/python/build
```
