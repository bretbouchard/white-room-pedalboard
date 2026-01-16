# Contributing to White Room

**Guide for contributors to the White Room project.**

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Coding Standards](#coding-standards)
3. [Pull Request Process](#pull-request-process)
4. [Testing Guidelines](#testing-guidelines)
5. [Documentation Requirements](#documentation-requirements)

---

## Development Setup

### Prerequisites

**Required Software**:
- Xcode 15.0+ (for Swift/macOS/iOS development)
- Visual Studio Code (for TypeScript/SDK development)
- CMake 3.25+ (for JUCE backend builds)
- Git 2.40+
- Node.js 20+ (for TypeScript SDK)

**Required Hardware**:
- Mac with Apple Silicon (M1/M2/M3) or Intel Mac
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

### Repository Setup

**1. Fork and Clone**:
```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/white_room.git
cd white_room
```

**2. Install Dependencies**:
```bash
# Swift dependencies (via Swift Package Manager)
cd swift_frontend
swift package resolve

# TypeScript SDK dependencies
cd ../sdk
npm install

# JUCE dependencies
cd ../juce_backend
cmake -B build -S .
```

**3. Build All Components**:
```bash
# Build Swift frontend
cd swift_frontend
xcodebuild -project WhiteRoom.xcodeproj -scheme WhiteRoom -configuration Debug

# Build TypeScript SDK
cd ../sdk
npm run build

# Build JUCE backend
cd ../juce_backend
cmake --build build
```

**4. Run Tests**:
```bash
# Swift tests
cd swift_frontend
swift test

# TypeScript tests
cd ../sdk
npm test

# C++ tests
cd ../juce_backend
cd build && ctest
```

### Development Workflow

**1. Create Feature Branch**:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**2. Make Changes**:
- Edit files
- Run tests locally
- Update documentation

**3. Commit Changes**:
```bash
git add .
git commit -m "feat: Add piano roll note editing"
# Follow commit message format (see below)
```

**4. Push and Create PR**:
```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

---

## Coding Standards

### Swift

**Style Guidelines**:
- Use 4 spaces for indentation (no tabs)
- Maximum line length: 120 characters
- Use camelCase for variables and functions
- Use PascalCase for types and protocols
- Prefix private methods with `_`

**Naming Conventions**:
```swift
// Types: PascalCase
struct AudioEngine { }
class TimelineViewModel { }

// Variables/Functions: camelCase
var currentTrack: Track = Track()
func playAudio() { }

// Constants: camelCase with `let`
let maxVolume: Double = 1.0

// Private: prefixed with `_`
private func _updateUI() { }
```

**Documentation**:
```swift
/// Plays audio from the current playhead position
///
/// - Returns: `true` if playback started successfully, `false` otherwise
func play() -> Bool {
    // Implementation
}
```

### TypeScript

**Style Guidelines**:
- Use 2 spaces for indentation (no tabs)
- Maximum line length: 100 characters
- Use camelCase for variables and functions
- Use PascalCase for types and interfaces
- Use `const` by default, `let` if reassignment needed

**Naming Conventions**:
```typescript
// Types/Interfaces: PascalCase
interface Track { }
class AudioEngine { }

// Variables/Functions: camelCase
const currentTrack: Track = new Track();
function playAudio(): void { }

// Constants: UPPER_SNAKE_CASE
const MAX_VOLUME = 1.0;
```

**Documentation**:
```typescript
/**
 * Plays audio from the current playhead position
 * @returns {boolean} True if playback started successfully
 */
function play(): boolean {
    // Implementation
}
```

### C++

**Style Guidelines**:
- Use 4 spaces for indentation (no tabs)
- Maximum line length: 100 characters
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use `snake_case` for member variables

**Naming Conventions**:
```cpp
// Classes: PascalCase
class AudioEngine { };

// Functions: camelCase
void playAudio() { }

// Member variables: snake_case with trailing underscore
double current_volume_ = 0.0;

// Constants: UPPER_SNAKE_CASE
const double MAX_VOLUME = 1.0;
```

**Documentation**:
```cpp
/// Plays audio from the current playhead position
/// @return true if playback started successfully
bool play() {
    // Implementation
}
```

### Commit Messages

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Example**:
```
feat(piano-roll): Add note editing functionality

- Implement note selection
- Add drag-to-move notes
- Support note resizing

Closes #123
```

---

## Pull Request Process

### Before Creating PR

**1. Update Documentation**:
- Update relevant docs
- Add API docs for new functions
- Update README if needed

**2. Run Tests**:
```bash
# Run all tests
cd swift_frontend && swift test
cd ../sdk && npm test
cd ../juce_backend/build && ctest
```

**3. Check Code Quality**:
```bash
# Swift linting
swiftlint

# TypeScript linting
npm run lint

# C++ formatting (clang-format)
clang-format -i src/*.cpp
```

**4. Update Changelog**:
- Add entry to `CHANGELOG.md`
- Follow Keep a Changelog format

### Creating Pull Request

**Title**:
```
feat(piano-roll): Add note editing functionality
```

**Description Template**:
```markdown
## Summary
Brief description of changes

## Changes
- List of major changes
- Bullet points for clarity

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Code documentation updated
- [ ] User docs updated (if needed)
- [ ] API docs updated (if needed)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

### PR Review Process

**1. Automated Checks**:
- CI builds all components
- All tests must pass
- Code coverage must not decrease
- No linting errors

**2. Code Review**:
- At least one maintainer approval required
- Address all review comments
- Update PR as needed

**3. Integration**:
- Squash and merge to main
- Delete feature branch
- Update version number
- Tag release (if applicable)

---

## Testing Guidelines

### Unit Tests

**Swift (XCTest)**:
```swift
class AudioEngineTests: XCTestCase {
    func testPlaybackStarts() {
        let engine = AudioEngine()
        XCTAssertTrue(engine.play())
    }
}
```

**TypeScript (Jest)**:
```typescript
describe('AudioEngine', () => {
    it('should start playback', () => {
        const engine = new AudioEngine();
        expect(engine.play()).toBe(true);
    });
});
```

**C++ (Catch2)**:
```cpp
TEST_CASE("AudioEngine playback", "[audio]") {
    AudioEngine engine;
    REQUIRE(engine.play() == true);
}
```

### Integration Tests

**End-to-End**:
- Test user workflows
- UI → Audio output
- Project save/load
- MIDI recording

**Test Coverage**:
- Aim for > 85% code coverage
- Focus on critical paths
- Test edge cases

### Performance Tests

**Benchmarks**:
```swift
func testAudioProcessingLatency() {
    measure {
        _ = audioEngine.process(buffer)
    }
    // Should complete in < 5ms
}
```

---

## Documentation Requirements

### Code Documentation

**Required Documentation**:
- All public APIs
- Complex algorithms
- Non-obvious code
- Thread-safety guarantees

**Documentation Tools**:
- Swift: Jazzy (DocC comments)
- TypeScript: TypeDoc (TSDoc comments)
- C++: Doxygen (Doxygen comments)

### User Documentation

**When to Update**:
- New features added
- Behavior changed
- New keyboard shortcuts
- New workflow options

**Documentation Locations**:
- `/docs/user/` - User guides
- `/docs/development/` - Developer docs
- `/docs/api/` - API reference

---

## Getting Help

**Resources**:
- **Architecture**: `/docs/development/ARCHITECTURE.md`
- **Build System**: `/docs/development/BUILD_SYSTEM.md`
- **Existing Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

**Contact**:
- Email: dev@white-room.io
- Discord: discord.gg/white-room-dev
- Twitter: @whiteroomdev

---

## Code of Conduct

**Be Respectful**:
- Treat all contributors with respect
- Welcome newcomers
- Assume good intent

**Be Constructive**:
- Focus on what is best for the community
- Show empathy toward other community members

**Be Collaborative**:
- Work together to resolve conflicts
- Ask for help when needed
- Accept feedback gracefully

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Next**: [Build System](BUILD_SYSTEM.md)

---

*Thank you for contributing to White Room! Every contribution helps make White Room better.*
