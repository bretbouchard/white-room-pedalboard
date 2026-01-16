# Contributing Guide

Thank you for your interest in contributing to White Room! This guide will help you understand how to contribute effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Code Style Guidelines](#code-style-guidelines)
3. [Pull Request Process](#pull-request-process)
4. [Code Review Standards](#code-review-standards)
5. [Testing Requirements](#testing-requirements)
6. [Documentation Standards](#documentation-standards)
7. [Community Guidelines](#community-guidelines)

---

## Getting Started

### First-Time Setup

```bash
# 1. Fork the repository
# Click "Fork" on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/white_room.git
cd white_room

# 3. Add upstream remote
git remote add upstream https://github.com/original/white_room.git

# 4. Install dependencies
./scripts/setup_dev.sh

# 5. Create development branch
git checkout -b feature/my-feature-name
```

### Development Workflow

```bash
# 1. Sync with upstream
git fetch upstream
git rebase upstream/main

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Make changes and commit
git add .
git commit -m "feat: Add your feature description"

# 4. Run tests
./scripts/test_all.sh

# 5. Push to your fork
git push origin feature/your-feature

# 6. Create pull request on GitHub
```

---

## Code Style Guidelines

### C++ Style (JUCE Backend)

**Formatting:**
- Use `clang-format` with provided config
- 4 spaces for indentation
- Maximum line length: 100 characters
- Braces on same line for functions/methods

**Naming Conventions:**
```cpp
// Classes: PascalCase
class AudioProcessor { };

// Methods: camelCase
void processAudio();

// Variables: camelCase
float sampleRate;

// Constants: UPPER_SNAKE_CASE
const int MAX_VOICES = 16;

// Private members: trailing underscore
class Processor {
private:
    float gain_;
};
```

**Best Practices:**
```cpp
// Use auto for iterator types
for (auto& plugin : plugins) {
    plugin->process(buffer);
}

// Use nullptr not NULL
void* ptr = nullptr;

// Use const references
void processBuffer(const juce::AudioBuffer<float>& buffer);

// Use smart pointers
std::unique_ptr<Plugin> plugin = std::make_unique<Plugin>();

// Use RAII
class AudioEngine {
public:
    AudioEngine() {
        // Acquire resources
    }
    ~AudioEngine() {
        // Release resources automatically
    }
};
```

**What to Avoid:**
```cpp
// DON'T: Raw pointers without ownership
Plugin* plugin = new Plugin();  // BAD

// DO: Smart pointers
std::unique_ptr<Plugin> plugin = std::make_unique<Plugin>();  // GOOD

// DON'T: C-style casts
float value = (float)intValue;  // BAD

// DO: C++ casts
float value = static_cast<float>(intValue);  // GOOD
```

### Swift Style (Swift Frontend)

**Formatting:**
- Use Xcode's default formatter
- 4 spaces for indentation
- Maximum line length: 120 characters
- Trailing commas in multi-line arrays/dictionaries

**Naming Conventions:**
```swift
// Classes: PascalCase
class JUCEEngine { }

// Methods: camelCase
func startEngine() { }

// Variables: camelCase
var sampleRate: Double

// Constants: camelCase with let
let maxVoices = 16

// Private properties: camelCase (no underscore)
private var engineHandle: OpaquePointer
```

**Best Practices:**
```swift
// Use guard for early exits
guard let engine = engineHandle else {
    return
}

// Use defer for cleanup
func processFile() {
    let file = openFile()
    defer {
        closeFile(file)
    }
    // Process file
}

// Use type inference
let plugins = [Plugin]()  // Type is inferred

// Use extensions for organization
extension JUCEEngine {
    // Engine methods
}

extension JUCEEngine {
    // FFI methods
}
```

**SwiftUI Specific:**
```swift
// Use @Published for reactive state
class ViewModel: ObservableObject {
    @Published var isPlaying: Bool = false
}

// Use @ViewBuilder for complex views
@ViewBuilder
var contentView: some View {
    if isPlaying {
        PlayingView()
    } else {
        StoppedView()
    }
}

// Use modifiers consistently
struct MyView: View {
    var body: some View {
        Text("Hello")
            .font(.headline)
            .foregroundColor(.primary)
            .padding()
    }
}
```

### TypeScript Style (SDK)

**Formatting:**
- Use Prettier with provided config
- 2 spaces for indentation
- Maximum line length: 100 characters
- Semicolons required

**Naming Conventions:**
```typescript
// Interfaces/Types: PascalCase
interface AudioConfig { }

// Functions: camelCase
function processAudio() { }

// Variables: camelCase
const sampleRate: number;

// Constants: UPPER_SNAKE_CASE
const MAX_VOICES = 16;

// Enums: PascalCase
enum ErrorSeverity { }
```

**Best Practices:**
```typescript
// Use explicit types for public APIs
function process(buffer: AudioBuffer): void {
    // Implementation
}

// Use type inference for internals
const plugins = new Map<string, Plugin>();

// Use union types for enums
type Severity = 'info' | 'warning' | 'error' | 'critical';

// Use readonly for immutable data
interface Config {
    readonly sampleRate: number;
}

// Use async/await not Promises
async function loadFile(): Promise<string> {
    const content = await fs.readFile('file.txt');
    return content.toString();
}
```

### Python Style (Scripts/Tools)

**Formatting:**
- Use `black` formatter
- 4 spaces for indentation
- Maximum line length: 88 characters

**Naming Conventions:**
```python
# Classes: PascalCase
class AudioEngine:
    pass

# Functions: snake_case
def process_audio():
    pass

# Variables: snake_case
sample_rate = 48000

# Constants: UPPER_SNAKE_CASE
MAX_VOICES = 16
```

**Best Practices:**
```python
# Use type hints
def process(buffer: AudioBuffer) -> None:
    pass

# Use context managers
with open('file.txt', 'r') as f:
    content = f.read()

# Use list comprehensions
samples = [process(s) for s in samples]

# Use f-strings
print(f"Sample rate: {sample_rate}")
```

---

## Pull Request Process

### Before Creating PR

**Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass (`./scripts/test_all.sh`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with upstream/main

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**

```
feat(juce): Add FM synthesizer plugin

Implement 5-operator FM synthesis with MPE support.
- Add operator frequency modulation
- Add modulation matrix
- Add envelope generators

Closes #123
```

```
fix(swift): Resolve FFI bridge crash on iOS

The FFI bridge was crashing when engineQueue was nil.
Added nil check and proper error handling.

Fixes #456
```

### PR Title Format

Use the same format as commit messages:

```
feat(juce): Add FM synthesizer plugin
fix(swift): Resolve FFI bridge crash
docs(readme): Update build instructions
```

### PR Description Template

```markdown
## Description
Brief description of changes (2-3 sentences)

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No merge conflicts

## Related Issues
Fixes #123
Related to #456
```

---

## Code Review Standards

### Review Criteria

**Code Quality:**
- Follows style guidelines
- No obvious bugs or issues
- Efficient algorithms and data structures
- Proper error handling
- Real-time safe (for audio code)

**Testing:**
- Adequate test coverage
- Tests are meaningful
- Edge cases covered
- No flaky tests

**Documentation:**
- Code is self-documenting
- Complex logic has comments
- Public APIs documented
- Examples provided

**Architecture:**
- Fits existing architecture
- Proper abstraction levels
- Minimal coupling
- High cohesion

### Review Process

**For Reviewers:**

1. **Be Constructive**
   - Provide specific feedback
   - Explain reasoning
   - Suggest improvements
   - Ask questions

2. **Be Timely**
   - Review within 48 hours
   - Communicate delays
   - Prioritize critical fixes

3. **Be Thorough**
   - Check all files
   - Run tests
   - Verify documentation
   - Test manually if needed

**For Authors:**

1. **Be Responsive**
   - Address feedback promptly
   - Explain decisions
   - Make requested changes
   - Ask for clarification

2. **Be Open**
   - Accept constructive criticism
   - Consider alternatives
   - Learn from feedback
   - Improve code quality

### Review Labels

- `approved`: Ready to merge
- `changes requested`: Needs revisions
- `comment`: Non-blocking feedback
- `wip`: Work in progress

---

## Testing Requirements

### Unit Tests

**C++ (Google Test):**
```cpp
TEST(AudioProcessor, ProcessAudio) {
    MyProcessor processor;
    processor.prepareToPlay(48000.0, 256);

    juce::AudioBuffer<float> buffer(2, 256);
    juce::MidiBuffer midi;

    processor.processBlock(buffer, midi);

    EXPECT_FALSE(buffer.hasBeenCleared());
}
```

**Swift (XCTest):**
```swift
func testEngineInitialization() {
    let engine = JUCEEngine.shared
    XCTAssertNotNil(engine.engineHandle)
}

func testPerformanceBlend() {
    let engine = JUCEEngine.shared
    let perfA = PerformanceInfo(id: "test_a", name: "Test A", description: "")
    let perfB = PerformanceInfo(id: "test_b", name: "Test B", description: "")

    engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

    XCTAssertEqual(engine.currentBlendValue, 0.5)
}
```

**TypeScript (Vitest):**
```typescript
describe('AudioConfig', () => {
    it('should validate sample rate', () => {
        const config: AudioConfig = {
            sampleRate: 48000,
            bufferSize: 256,
            inputChannels: 0,
            outputChannels: 2
        };

        expect(validateAudioConfig(config)).toBe(true);
    });
});
```

### Integration Tests

```cpp
// Test FFI bridge
TEST(FFIBridge, CreateEngine) {
    sch_engine_handle engine;
    sch_result_t result = sch_engine_create(&engine);

    EXPECT_EQ(result, SCH_OK);
    EXPECT_NE(engine, nullptr);

    sch_engine_destroy(engine);
}
```

```swift
// Test Swift to C++ communication
func testFFICommunication() {
    let engine = JUCEEngine.shared
    engine.startEngine()

    XCTAssertTrue(engine.isEngineRunning)

    engine.stopEngine()

    XCTAssertFalse(engine.isEngineRunning)
}
```

### E2E Tests

```bash
# Test complete workflow
./scripts/test_e2e.sh

# Test plugin in DAW
./scripts/test_plugin_in_daw.sh LocalGal
```

### Test Coverage

**Minimum Requirements:**
- C++: 80% coverage
- Swift: 80% coverage
- TypeScript: 90% coverage

**Check Coverage:**
```bash
# TypeScript
cd sdk
npm run test:coverage

# View report
open coverage/index.html
```

---

## Documentation Standards

### Code Documentation

**C++ (Doxygen):**
```cpp
/**
 * @brief Audio processor base class
 *
 * Provides real-time audio processing with parameter automation.
 * All audio processing must be real-time safe (no blocking operations).
 *
 * @see PluginProcessor
 */
class AudioProcessor {
public:
    /**
     * @brief Process audio buffer
     * @param buffer Audio buffer to process
     * @param midiMessages MIDI messages to process
     * @note Must be real-time safe
     */
    void processBlock(
        juce::AudioBuffer<float>& buffer,
        juce::MidiBuffer& midiMessages
    );
};
```

**Swift:**
```swift
/// Manages JUCE audio engine lifecycle
///
/// The `JUCEEngine` class provides a Swift interface to the JUCE
/// audio engine via the FFI bridge. All operations are thread-safe.
///
/// ```swift
/// let engine = JUCEEngine.shared
/// engine.startEngine()
/// ```
@MainActor
public class JUCEEngine: ObservableObject {
    /// Starts the audio engine
    ///
    /// - Throws: `WhiteRoomError.audio(.engineNotReady)` if engine fails to start
    public func startEngine() throws {
        // Implementation
    }
}
```

**TypeScript (TSDoc):**
```typescript
/**
 * Audio configuration options
 *
 * @remarks
 * Sample rate should be 44100, 48000, or 96000 for best compatibility.
 *
 * @example
 * ```ts
 * const config: AudioConfig = {
 *     sampleRate: 48000,
 *     bufferSize: 256,
 *     inputChannels: 0,
 *     outputChannels: 2
 * };
 * ```
 */
export interface AudioConfig {
    /** Sample rate in Hz */
    sampleRate: number;
    /** Buffer size in samples */
    bufferSize: number;
    /** Number of input channels */
    inputChannels: number;
    /** Number of output channels */
    outputChannels: number;
}
```

### README Documentation

Every major component should have a README:

```
component_name/
├── README.md        # Overview and usage
├── INSTALL.md       # Installation instructions
├── EXAMPLES.md      # Code examples
└── API.md           # API reference
```

### Changelog

Maintain `CHANGELOG.md` for user-visible changes:

```markdown
# Changelog

## [1.2.0] - 2026-01-15
### Added
- FM synthesizer plugin with 5 operators
- MPE support for all synthesizers
- Performance blend undo/redo

### Changed
- Improved FFI bridge performance by 40%
- Updated JUCE to version 7.0.1

### Fixed
- Fixed crash on iOS when engine not initialized
- Fixed parameter zippering in real-time audio

### Deprecated
- Old parameter API (use new ParameterManager)
```

---

## Community Guidelines

### Be Respectful

- Treat everyone with respect
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Be Inclusive

- Use inclusive language
- Welcome diverse perspectives
- Make spaces welcoming for everyone
- Accommodate different communication styles

### Be Collaborative

- Work together toward shared goals
- Share knowledge freely
- Give credit generously
- Help others succeed

### Be Professional

- Keep discussions focused
- Stay on topic
- Use appropriate channels
- Respect time boundaries

### Conflict Resolution

If you encounter issues:

1. **Try to resolve directly** - Have a private conversation
2. **Seek mediation** - Ask maintainers for help
3. **Report violations** - Contact project maintainers
4. **Block if needed** - Protect yourself from harassment

---

## Getting Help

### Questions?

- **GitHub Discussions** - Ask questions publicly
- **Documentation** - Check docs first
- **Issues** - Search for similar problems
- **Maintainers** - Contact for critical issues

### Resources

- [Getting Started](./getting-started.md)
- [Architecture Overview](./architecture/overview.md)
- [API Documentation](./api/)
- [Troubleshooting](./troubleshooting/)

### Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` - All contributors
- Release notes - Specific contributions
- Documentation - Major contributors

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

## Thank You!

Thank you for contributing to White Room! Your contributions make this project better for everyone.

**Questions?** Open an issue or discussion on GitHub.

**Ready to contribute?** Follow the [Getting Started](./getting-started.md) guide!

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
