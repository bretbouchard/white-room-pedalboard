# Testing Methodology

## Overview

This document specifies comprehensive testing methodologies for the White Room audio plugin ecosystem, including golden render tests, cross-format consistency validation, and performance benchmarking.

## Golden Render Tests

### Purpose

Golden render tests ensure that all plugin formats (LV2, AUv3, Standalone) produce identical audio output for the same input and parameters. This validates that cross-platform compilation and format-specific wrappers do not alter the DSP core.

### Test Methodology

#### 1. Reference Generation

Generate reference audio files for each instrument using a known-good implementation:

```bash
# Build reference generator
cd juce_backend
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target GenerateGoldenReferences

# Generate references for all instruments
./build/tests/golden/GenerateGoldenReferences
```

**Reference Input Signal**:
- Duration: 10 seconds
- Sample Rate: 48000 Hz
- Channels: Stereo (interleaved)
- Format: 32-bit float WAV
- Content: Pink noise + sine sweep (20 Hz - 20 kHz)
- Level: -18 dBFS (RMS)

**Instrument Parameters**:
- Default preset loaded
- All parameters at default values
- MIDI: C4 note triggered at 1.0s, held for 4.0s
- Velocity: 100 (medium)

#### 2. Cross-Format Testing

Build and test each plugin format:

```bash
# LV2 (Linux)
cmake -B build -DBUILD_LV2_PLUGINS=ON
cmake --build build --target lv2_plugins
./build/tests/golden/GoldenTest --format lv2

# AUv3 (iOS)
cmake -B build-ios -DCMAKE_SYSTEM_NAME=iOS
cmake --build build-ios --target juce_backend_ios
./build/tests/golden/GoldenTest --format auv3

# Standalone (Desktop)
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target SchillingerEcosystemWorkingDAW
./build/tests/golden/GoldenTest --format standalone
```

#### 3. Audio Comparison

Compare output to reference using statistical analysis:

**Metrics**:
- **Peak Amplitude Difference**: < 0.01 dB
- **RMS Level Difference**: < 0.1 dB
- **Signal-to-Noise Ratio**: > 100 dB
- **Correlation Coefficient**: > 0.9999

**Failure Thresholds**:
- Peak difference > 0.1 dB: FAIL
- RMS difference > 1.0 dB: FAIL
- SNR < 90 dB: FAIL
- Correlation < 0.999: FAIL

**Example Output**:
```
Golden Render Test Results
==========================

Instrument: LocalGal
Format: LV2
Reference: references/LocalGold_ref_48k_stereo.wav
Test: build/test_output/LocalGold_lv2_48k_stereo.wav

Metrics:
  Peak Difference: 0.0003 dB (PASS)
  RMS Difference: 0.02 dB (PASS)
  SNR: 112.4 dB (PASS)
  Correlation: 0.999997 (PASS)

Status: PASS
```

### Parameter Hash Verification

Ensure parameter serialization is consistent across formats:

```bash
# Build parameter test
cmake --build build --target ParameterGoldenTest

# Run parameter hash test
./build/tests/golden/ParameterGoldenTest
```

**Test Coverage**:
- All parameters for each instrument
- Preset loading (JSON validation)
- Parameter smoothing (state transitions)
- MIDI CC mapping

**Hash Algorithm**:
- SHA-256 over parameter state block
- Includes: parameter IDs, values, ranges, curves
- Excludes: internal state, modulation sources

**Failure Modes**:
- Hash mismatch: Parameter serialization inconsistent
- Missing parameter: Format-specific parameter not exposed
- Range mismatch: Parameter scale differs between formats

---

## Cross-Format Consistency Tests

### Test Matrix

| Instrument | LV2 | AUv3 | Standalone | iOS Simulator |
|------------|-----|------|------------|---------------|
| LocalGal   | ✓   | ✓    | ✓          | ✓             |
| KaneMarco  | ✓   | ✓    | ✓          | ✓             |
| NexSynth   | ✓   | ✓    | ✓          | ✓             |
| SamSampler | ✓   | ✓    | ✓          | ✓             |
| DrumMachine| ✓   | ✓    | ✓          | ✓             |

### Platform Coverage

**Desktop Platforms**:
- macOS 10.15+ (Intel & Apple Silicon)
- Ubuntu 22.04+
- Windows 10+

**Mobile Platforms**:
- iOS 14.0+ (iPhone & iPad)
- iOS Simulator (for CI testing)

**Embedded Platforms**:
- Raspberry Pi 4 (ARMv7 & ARM64)
- Raspberry Pi 5 (ARM64)

---

## Unit Tests

### Test Organization

```
tests/
├── audio/              # Audio layer tests (Scheduler, VoiceManager)
├── synthesis/          # Synthesizer integration tests
├── plugins/            # External plugin hosting tests
├── dsp/                # DSP instrument unit tests
├── golden/             # Golden render tests
├── integration/        # End-to-end integration tests
├── performance/        # Performance benchmarks
└── regression/         # Regression test suite
```

### Running Tests

**All Tests**:
```bash
cd juce_backend
cmake -B build -DBUILD_TESTING=ON
cmake --build build --target run_all_tests
```

**Specific Test Suite**:
```bash
# Audio layer tests
ctest --test-dir build -R "AudioLayer"

# Synthesizer tests
ctest --test-dir build -R "Synthesis"

# Golden render tests
ctest --test-dir build -R "Golden"
```

**Verbose Output**:
```bash
ctest --test-dir build --output-on-failure --verbose
```

**With Coverage** (Linux):
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug -DENABLE_COVERAGE=ON
cmake --build build
ctest --test-dir build
gcov build/tests/**/*.gcda
lcov --capture --directory . --output-file coverage.info
```

---

## Performance Tests

### Benchmark Metrics

**Voice Polyphony**:
- Maximum voices before dropouts
- CPU usage per voice
- Memory usage per voice

**DSP Processing**:
- Samples per second (per voice)
- Real-time safety factor
- Cache hit rate

**Plugin Format Overhead**:
- LV2: < 5% overhead vs. bare metal
- AUv3: < 8% overhead vs. bare metal
- Standalone: Baseline (0% overhead)

### Running Performance Tests

```bash
# Build performance tests
cmake --build build --target KaneMarcoPerformanceTests

# Run benchmark
./build/tests/dsp/KaneMarcoPerformanceTests --benchmark_format=console
```

**Example Output**:
```
KaneMarco Performance Benchmarks
==================================

Voice Polyphony Test:
  Max voices: 127
  CPU at max voices: 89%
  Memory per voice: 2.3 MB
  Status: PASS

DSP Processing Test:
  Samples/sec: 48,000,000
  Real-time factor: 1000x
  Cache hit rate: 94.2%
  Status: PASS

Format Overhead Test:
  Bare metal: 12.3 µs/voice
  LV2 wrapper: 12.8 µs/voice (4.1% overhead)
  AUv3 wrapper: 13.1 µs/voice (6.5% overhead)
  Status: PASS
```

### Performance Regression Detection

Compare against baseline:

```bash
# Update baseline
./build/tests/dsp/KaneMarcoPerformanceTests --benchmark_out=baseline.json

# Compare current to baseline
./build/tests/dsp/KaneMarcoPerformanceTests --benchmark_out=current.json
python3 tools/compare_benchmarks.py baseline.json current.json
```

**Regression Threshold**:
- CPU usage: +5% or more = FAIL
- Latency: +10% or more = FAIL
- Memory: +10% or more = FAIL

---

## Memory Safety Tests

### AddressSanitizer

Detect memory corruption, leaks, and use-after-free:

```bash
cmake -B build \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_FLAGS="-fsanitize=address -fno-omit-frame-pointer -g" \
  -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=address"

cmake --build build --target all_tests
ASAN_OPTIONS=detect_leaks=1:halt_on_error=0 ctest --test-dir build
```

### ThreadSanitizer

Detect data races (for multi-threaded audio processing):

```bash
cmake -B build \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_FLAGS="-fsanitize=thread -g" \
  -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=thread"

cmake --build build --target all_tests
TSAN_OPTIONS=halt_on_error=0 ctest --test-dir build
```

### UndefinedBehaviorSanitizer

Detect undefined behavior:

```bash
cmake -B build \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_FLAGS="-fsanitize=undefined -fno-sanitize-recover=all -g" \
  -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=undefined"

cmake --build build --target all_tests
UBSAN_OPTIONS=halt_on_error=0 ctest --test-dir build
```

---

## Integration Tests

### Test Scenarios

**Plugin Loading**:
- Load plugin in host (DAW)
- Verify initialization
- Check preset loading
- Validate parameter exposure

**MIDI Processing**:
- Note on/off events
- Pitch bend
- Mod wheel (CC 1)
- Sustain pedal (CC 64)
- Aftertouch

**Audio Processing**:
- Real-time processing (no dropouts)
- Sample rate changes (44.1k, 48k, 96k)
- Buffer size variations (64, 128, 256, 512 samples)
- Channel configuration (mono, stereo, surround)

**Automation**:
- Parameter automation
- Smooth transitions
- No clicks/pops

### Running Integration Tests

```bash
# Build integration tests
cmake --build build --target run_integration_tests

# Run specific integration test
./build/tests/integration/PluginHostingIntegrationTest
```

---

## Continuous Integration Testing

### CI Test Pipeline

```yaml
# Test stages
stages:
  - lint        # Code style and static analysis
  - unit        # Fast unit tests (< 5 min)
  - integration # Integration tests (< 10 min)
  - golden      # Golden render tests (< 15 min)
  - performance # Performance benchmarks (< 5 min)
  - sanitizers  # Memory safety tests (< 20 min)
```

### Test Execution Order

1. **Lint** (fast fail on style issues)
2. **Unit Tests** (fail fast on basic errors)
3. **Integration Tests** (verify components work together)
4. **Golden Tests** (validate audio output)
5. **Performance Tests** (check for regressions)
6. **Sanitizer Tests** (catch memory issues)

### Parallel Execution

```yaml
strategy:
  matrix:
    os: [macos-latest, ubuntu-latest, windows-latest]
    build_type: [Debug, Release]
```

Total parallel jobs: 6 (3 OS × 2 configs)

---

## Test Coverage Goals

### Code Coverage Metrics

**Target Coverage**:
- Overall: > 80%
- DSP code: > 95%
- Audio layer: > 90%
- Plugin wrappers: > 85%

**Critical Path Coverage**:
- All instruments: 100%
- Audio processing pipeline: 100%
- Parameter handling: 100%
- MIDI processing: 100%

### Generating Coverage Reports

```bash
# Linux (gcov)
cmake -B build -DENABLE_COVERAGE=ON
cmake --build build
ctest --test-dir build
gcov build/**/*.gcda
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage_html

# View report
open coverage_html/index.html
```

### Coverage in CI

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: juce_backend/coverage.info
    flags: core-dsp
    fail_ci_if_error: true
```

---

## Regression Testing

### Regression Test Suite

Track known fixed bugs and prevent them from reoccurring:

```
tests/regression/
├── bug_001_voice_stealing.cpp
├── bug_002_parameter_smoothing.cpp
├── bug_003_midi_clock.cpp
└── ...
```

**Regression Test Template**:

```cpp
// tests/regression/bug_XXX_description.cpp
TEST(RegressionBugXXX, Description) {
    // Setup: Reproduce the bug conditions
    auto instrument = createInstrument();

    // Trigger: Execute the buggy scenario
    instrument->processMIDI(midiMessage);

    // Verify: Ensure bug is fixed
    EXPECT_EQ(instrument->getParameter(paramId), expectedValue);
}
```

---

## Troubleshooting

### Common Test Failures

**Issue**: Golden render test fails with "Peak difference > 0.1 dB"

**Solution**:
1. Check sample rate matching (all must be 48kHz)
2. Verify buffer sizes are identical
3. Ensure same input signal for all formats
4. Check for NaN/Inf in output

**Issue**: Performance regression detected

**Solution**:
1. Rebuild with `-DCMAKE_BUILD_TYPE=Release`
2. Disable debug symbols
3. Check for changes in DSP code
4. Verify compiler optimization flags

**Issue**: AddressSanitizer reports memory leak

**Solution**:
1. Run with `ASAN_OPTIONS=detect_leaks=1` for detailed report
2. Check for missing `delete` / `free()`
3. Verify smart pointer usage
4. Look for circular references

---

## Best Practices

### Writing Tests

1. **Isolation**: Each test should be independent
2. **Speed**: Unit tests should run in < 1 second
3. **Clarity**: Test names should describe what is being tested
4. **Maintainability**: Use test fixtures for common setup

### Test Data Management

1. **Version Control**: Store test inputs in repository
2. **Generated Data**: Generate test outputs during test run
3. **Artifacts**: Upload failed test results to CI
4. **Cleanup**: Remove temporary files after test

### Continuous Improvement

1. **Add tests for every bug fix**
2. **Maintain > 80% code coverage**
3. **Run tests before every commit**
4. **Update documentation when adding tests**

---

## Further Reading

- JUCE Unit Testing: https://docs.juce.com/master/unit_testing.html
- Google Test Primer: https://google.github.io/googletest/primer.html
- AddressSanitizer: https://github.com/google/sanitizers/wiki/AddressSanitizer
