# Build Artifact Management - Quick Reference for AI Agents

## MANDATORY RULE

**ALL build artifacts MUST be placed in `.build/` directory.**

**VIOLATION:** Creating build artifacts outside `.build/` is FORBIDDEN.

---

## Quick Checklist

### Before ANY Build Operation

- [ ] Check if `.build/` exists: `ls -la .build/`
- [ ] If not, run: `./build-config/scripts/setup-builds.sh`
- [ ] Verify build location is correct for your build system

### During Build

- [ ] Use centralized build paths (see below)
- [ ] NEVER create `build/` in project root
- [ ] Follow build system-specific conventions

### After Build

- [ ] Run: `./build-config/scripts/validate-builds.sh`
- [ ] Fix any violations immediately
- [ ] Store learnings in Confucius

---

## Build System Quick Reference

### CMake (JUCE Plugins)

```bash
# CORRECT ✅
cmake -B .build/cmake/<plugin-name> -S <source-dir>
cmake --build .build/cmake/<plugin-name>

# WRONG ❌
cd <source-dir>
cmake -B build -S .
```

### Xcode (iOS/macOS)

```bash
# CORRECT ✅
xcodebuild -project Project.xcodeproj \
  -derivedDataPath .build/xcode/DerivedData \
  -scheme SchemeName

# WRONG ❌
xcodebuild -project Project.xcodeproj \
  -scheme SchemeName
# Uses ~/Library/Developer/Xcode/DerivedData
```

### Swift Package Manager

```bash
# CORRECT ✅
swift build --scratch-path .build/swift

# WRONG ❌
swift build
# Uses local .build/ directory
```

### Python

```bash
# CORRECT ✅
pip install . --build .build/python/build

# WRONG ❌
pip install .
# Creates build/ in project root
```

---

## Common Violations to Avoid

### ❌ NEVER Do This

```bash
# Creating build/ in project root
mkdir build
cmake -B build -S .

# Using local derived data
xcodebuild -scheme MyScheme
# (No -derivedDataPath specified)

# Using default SPM build location
swift build
# (No --scratch-path specified)

# Creating __pycache__ in project
python -m py_compile mymodule.py
# (Creates __pycache__ locally)
```

### ✅ ALWAYS Do This

```bash
# Use centralized build location
cmake -B .build/cmake/myproject -S path/to/source

# Specify derived data path
xcodebuild -scheme MyScheme \
  -derivedDataPath .build/xcode/DerivedData

# Use centralized scratch path
swift build --scratch-path .build/swift

# Use build root for Python
pip install . --build .build/python/build
```

---

## Validation

### Check Compliance

```bash
./build-config/scripts/validate-builds.sh
```

### Exit Codes

- **0**: No violations found ✅
- **1**: Violations found ❌

### CI/CD Integration

```bash
# Use in CI/CD for enforcement
./build-config/scripts/validate-builds.sh --exit-code
```

---

## Cleanup

### Clean Build Intermediates

```bash
./build-config/scripts/clean-builds.sh
```

### Clean Everything (Including Artifacts)

```bash
./build-config/scripts/clean-builds.sh --all
```

---

## Environment Variables

Source these before building:

```bash
export WHITE_ROOM_BUILD_ROOT=".build"
export WHITE_ROOM_ARTIFACTS=".artifacts"
export XCODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/xcode"
export CMAKE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/cmake"
export SWIFT_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/swift"
export PYTHON_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/python"
export NODE_BUILD_DIR="$WHITE_ROOM_BUILD_ROOT/node"
```

---

## Getting Help

### Documentation

- **BUILD_STRUCTURE.md** - Complete build system documentation
- **build-config/README.md** - Usage guide
- **.claude/BUILD_ENV.md** - Environment variable reference

### Scripts

- **setup-builds.sh** - Create build directory structure
- **migrate-builds.sh** - Migrate existing artifacts
- **clean-builds.sh** - Clean build artifacts
- **validate-builds.sh** - Validate compliance

### Troubleshooting

1. Check `.build/` exists
2. Run validation to see violations
3. Run migration if needed
4. Read BUILD_STRUCTURE.md for details

---

## Examples

### Example 1: Building a JUCE Plugin

```bash
# Check .build/ exists
ls -la .build/

# Configure CMake
cmake -B .build/cmake/aetherdrive \
  -S juce_backend/aetherdrive_plugin_build \
  -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build .build/cmake/aetherdrive

# Validate
./build-config/scripts/validate-builds.sh
```

### Example 2: Building an iOS App

```bash
# Check .build/ exists
ls -la .build/

# Build with Xcode
xcodebuild -project WhiteRoomiOS.xcodeproj \
  -scheme WhiteRoomiOS \
  -derivedDataPath .build/xcode/DerivedData \
  -configuration Debug

# Validate
./build-config/scripts/validate-builds.sh
```

### Example 3: Building Swift Package

```bash
# Check .build/ exists
ls -la .build/

# Build with SPM
swift build --scratch-path .build/swift

# Validate
./build-config/scripts/validate-builds.sh
```

---

## Summary

**One Rule:** All build artifacts in `.build/`

**Three Steps:**
1. Setup: `./build-config/scripts/setup-builds.sh`
2. Build: Use centralized paths
3. Validate: `./build-config/scripts/validate-builds.sh`

**Enforcement:** Violations blocked by CI/CD

---

**Remember:** If you create build artifacts outside `.build/`, you are in violation. Always use centralized build paths.
