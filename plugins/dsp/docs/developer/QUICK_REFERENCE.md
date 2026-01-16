# Developer Quick Reference

Essential commands, file locations, and common tasks for White Room development.

## Essential Commands

### Build Commands

```bash
# Build everything
./scripts/build_all.sh

# Build JUCE backend
cd juce_backend
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
cmake --build build --target all -j$(sysctl -n hw.ncpu)

# Build Swift frontend
cd swift_frontend/WhiteRoomiOS
xcodebuild -scheme WhiteRoomiOS clean build

# Build TypeScript SDK
cd sdk
npm run build
```

### Test Commands

```bash
# Run all tests
./scripts/test_all.sh

# C++ tests
cd juce_backend
ctest --test-dir build --output-on-failure

# Swift tests
cd swift_frontend/WhiteRoomiOS
xcodebuild test -scheme WhiteRoomiOS

# TypeScript tests
cd sdk
npm test
```

### Format & Lint

```bash
# Format all code
./scripts/format_code.sh

# Lint all code
./scripts/lint_code.sh

# Format TypeScript
cd sdk
npm run format

# Lint TypeScript
cd sdk
npm run lint

# Fix TypeScript linting
npm run lint:fix
```

### Git Commands

```bash
# Sync with upstream
git fetch upstream
git rebase upstream/main

# Create feature branch
git checkout -b feature/my-feature

# Commit with conventional format
git commit -m "feat(scope): description"

# Push to fork
git push origin feature/my-feature
```

## Key File Locations

### Source Code

```
juce_backend/
├── src/
│   ├── plugins/              # Plugin implementations
│   ├── schillinger/          # Music theory systems
│   ├── ffi/                  # Swift/C++ bridge
│   └── core/                 # Shared utilities
└── tests/                    # C++ tests

swift_frontend/WhiteRoomiOS/
└── Sources/
    ├── SwiftFrontendCore/
    │   ├── Audio/            # FFI bridge wrapper
    │   ├── Performances/     # Performance blend
    │   ├── Schillinger/      # Schillinger UI
    │   └── Views/            # SwiftUI views
    └── WhiteRoomiOS/
        └── App.swift         # App entry point

sdk/
├── src/
│   ├── types/                # Type definitions
│   ├── api/                  # API interfaces
│   └── utils/                # Utilities
└── tests/                    # TypeScript tests
```

### Configuration Files

```
juce_backend/
└── CMakeLists.txt            # CMake build config

swift_frontend/WhiteRoomiOS/
└── Package.swift             # SPM config

sdk/
├── package.json              # NPM config
├── tsconfig.json             # TypeScript config
└── vitest.config.ts          # Test config
```

### Documentation

```
docs/developer/
├── README.md                 # Documentation overview
├── getting-started.md        # Setup guide
├── architecture/             # Architecture docs
├── api/                      # API reference
├── integration/              # Integration guides
└── troubleshooting/          # Troubleshooting guides
```

## Common Workflows

### Add a New Parameter

**1. C++ Backend:**
```cpp
// In createParameters()
params.push_back(std::make_unique<juce::AudioParameterFloat>(
    "my_param",
    "My Parameter",
    juce::NormalisableRange<float>(0.0f, 1.0f),
    0.5f
));

// In processBlock()
float myParam = *params.getRawParameterValue("my_param");
```

**2. TypeScript Types:**
```typescript
export interface MyParameter {
    id: string;
    name: string;
    value: number;
    min: number;
    max: number;
}
```

**3. Swift UI:**
```swift
@State private var myParamValue: Double = 0.5

Slider(value: $myParamValue, in: 0...1) {
    Text("My Parameter")
}
```

### Debug FFI Bridge

**1. Enable logging:**
```c
#define ENABLE_FFI_DEBUG 1
```

**2. Monitor logs:**
```bash
log stream --predicate 'subsystem == "com.whiteroom.audio"' --level debug
```

**3. Add breakpoints:**
```swift
// In Swift
engineQueue.async { [weak self] in
    print("Before FFI call")
    self?.callFFI()
    print("After FFI call")
}
```

### Test Plugin in DAW

**1. Build plugin:**
```bash
cd juce_backend
cmake --build build --target LocalGal
```

**2. Install plugin:**
```bash
cp build/local_gal_plugin_build/LocalGal.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

**3. Open DAW and test:**
- REAPER: Rescan plugins, add LocalGal to track
- Ableton: Rescan, add LocalGal to track
- Logic: Rescan, add LocalGal to track

## Environment Setup

### Required Tools

```bash
# Check versions
cmake --version     # 3.22+
python3 --version   # 3.10+
node --version      # 18+
xcodebuild -version # 14+ (macOS)
```

### Development Setup

```bash
# Clone repository
git clone --recurse-submodules https://github.com/yourusername/white_room.git
cd white_room

# Install dependencies
pip install -r requirements.txt
cd sdk && npm install && cd ..

# Initialize submodules
git submodule update --init --recursive

# Build project
./scripts/build_all.sh
```

## Debugging Tips

### Enable Debug Logging

**C++:**
```cpp
#define ENABLE_DEBUG_LOG 1
#if ENABLE_DEBUG_LOG
    DBG_LOG("Debug message: " << value);
#endif
```

**Swift:**
```swift
import os.log
let log = OSLog(subsystem: "com.whiteroom.audio", category: "Debug")
os_log("Debug message: %{public}@", log: log, type: .debug, "value")
```

**TypeScript:**
```typescript
const DEBUG = process.env.DEBUG === 'true';
function debugLog(msg: string) {
    if (DEBUG) console.log(`[DEBUG] ${msg}`);
}
```

### Profile Performance

**macOS:**
```bash
# CPU profiling
instruments -t "Time Profiler" -D trace.trace ./build/MyApp

# Memory profiling
instruments -t "Allocations" -D mem.trace ./build/MyApp
```

**C++:**
```cpp
class ScopedTimer {
public:
    ScopedTimer(const juce::String& name)
        : name(name), startTime(juce::Time::getHighResolutionTicks()) {}

    ~ScopedTimer() {
        auto elapsed = juce::Time::getHighResolutionTicks() - startTime;
        DBG(name + " took " + juce::String(elapsed) + " ticks");
    }

private:
    juce::String name;
    int64 startTime;
};
```

## Common Issues & Solutions

### Build Fails

```bash
# Clean build
rm -rf juce_backend/build
cd juce_backend
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

# Rebuild
cmake --build build --target all
```

### Plugin Not Scanning

```bash
# Check installation
ls ~/Library/Audio/Plug-Ins/VST3/

# Fix permissions
chmod +x ~/Library/Audio/Plug-Ins/VST3/*.vst3/Contents/MacOS/*

# Rescan in DAW
```

### FFI Bridge Crashes

```bash
# Enable crash logging
# Check thread safety (all FFI calls on engineQueue)
# Verify engine initialization
```

## Git Workflow

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**
```
feat(juce): Add FM synthesizer plugin
fix(swift): Resolve FFI bridge crash
docs(readme): Update build instructions
```

### Branch Naming

```
feature/my-feature-name
fix/my-bug-fix
docs/my-doc-update
```

## Useful Aliases

Add to your `.zshrc` or `.bashrc`:

```bash
# White Room aliases
alias wr-build='./scripts/build_all.sh'
alias wr-test='./scripts/test_all.sh'
alias wr-clean='./scripts/clean.sh'
alias wr-lint='./scripts/lint_code.sh'
alias wr-format='./scripts/format_code.sh'

# Git aliases
alias wr-sync='git fetch upstream && git rebase upstream/main'
alias wr-feature='git checkout -b feature/'
alias wr-pr='git push origin $(git branch --show-current)'
```

## Keyboard Shortcuts

### Xcode

- `Cmd + B` - Build
- `Cmd + R` - Run
- `Cmd + .` - Stop
- `Cmd + Shift + K` - Clean
- `Cmd + Shift + F` - Find in files

### VS Code

- `Cmd + P` - Quick open file
- `Cmd + Shift + F` - Search in files
- `Cmd + \` - Toggle terminal
- `Cmd + B` - Toggle sidebar

## Resources

### Documentation

- [Getting Started](./getting-started.md) - Setup and first build
- [Architecture Overview](./architecture/overview.md) - System architecture
- [API Reference](./api/) - API documentation
- [Troubleshooting](./troubleshooting/) - Common issues

### Tools

- [JUCE Documentation](https://docs.juce.com/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [CMake Documentation](https://cmake.org/documentation/)

### Community

- [GitHub Issues](https://github.com/yourusername/white_room/issues)
- [GitHub Discussions](https://github.com/yourusername/white_room/discussions)

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
