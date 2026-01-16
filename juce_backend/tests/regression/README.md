# Phase 4D: Regression Test Suite

**Status:** ✅ IMPLEMENTED
**Purpose:** Automated regression detection to prevent performance/audio degradation

---

## Overview

The Phase 4D regression test suite provides continuous monitoring of instrument DSP quality to prevent regressions in:
- **Performance** - CPU usage, processing time, memory allocations
- **Audio Quality** - RMS levels, spectral characteristics, determinism
- **Cross-platform consistency** - Same behavior across different platforms

---

## Test Components

### 1. Performance Regression Tests (`PerformanceRegressionTest.cpp`)

Detects performance slowdowns by comparing against established baselines from Phase 4A.

**Tests:**
- `NexSynth_PerformanceWithinBaseline` - CPU usage < 5%
- `LocalGal_PerformanceWithinBaseline` - CPU usage < 6%
- `KaneMarco_PerformanceWithinBaseline` - CPU usage < 7%
- `KaneMarcoAether_PerformanceWithinBaseline` - CPU usage < 10%
- `SamSampler_PerformanceWithinBaseline` - CPU usage < 8%
- `RealtimeSafety_NoAllocations` - Verifies no allocations in audio thread
- `AllInstrumentsWithinPerformanceBudget` - Comprehensive performance check

**Metrics:**
- CPU time for 100 blocks (~1 second of audio)
- CPU percentage (time / real-time)
- Allocation count (should be 0 for realtime safety)

### 2. Audio Regression Tests (`AudioRegressionTest.cpp`)

Detects audio quality changes using statistical analysis.

**Tests:**
- `NexSynth_DeterministicOutput` - Verifies same input produces identical output
- `LocalGal_DeterministicOutput` - Verifies determinism (critical after fix)
- `AllInstruments_AudioLevelsWithinBaseline` - RMS and peak levels within expected ranges
- `NexSynth_SpectralConsistency` - Timbre consistency checks
- `CrossPlatformConsistency_Check` - Verifies consistent behavior across instances

**Metrics:**
- RMS level (signal strength)
- Peak level (maximum amplitude)
- Crest factor (peak/RMS ratio)
- Zero crossing rate (high-frequency content)
- SNR (signal-to-noise ratio)
- Max difference (sample-accurate comparison)

### 3. Main Suite (`RegressionSuite.cpp`)

Orchestrates all tests and provides:
- Formatted test output with headers and summaries
- CLI interface for CI/CD integration
- Pass/fail reporting with statistics
- JUnit XML output (for CI systems)

---

## Building

```bash
# From project root
cd /Users/bretbouchard/apps/schill/juce_backend

# Create build directory
mkdir -p build_phase4d && cd build_phase4d

# Configure
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build regression tests
cmake --build . --target RegressionSuite

# Or build individual test executables
cmake --build . --target PerformanceRegressionTest
cmake --build . --target AudioRegressionTest
```

---

## Running Tests

### Run All Regression Tests

```bash
cd build_phase4d

# Option 1: Run executable directly
./RegressionSuite

# Option 2: Run via CMake
make run_regression_tests

# Option 3: Run via CTest
ctest -L regression --output-on-failure
```

### Run Performance Tests Only

```bash
# Run performance tests
./PerformanceRegressionTest

# Or via CMake
make run_regression_performance_tests
```

### Run Audio Tests Only

```bash
# Run audio tests
./AudioRegressionTest

# Or via CMake
make run_regression_audio_tests
```

### Filter Tests

```bash
# Run specific test
./RegressionSuite --gtest_filter=*NexSynth*

# Run all performance tests
./RegressionSuite --gtest_filter=*Performance*

# Run all audio tests
./RegressionSuite --gtest_filter=*Audio*
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/regression.yml`:

```yaml
name: Phase 4D - Regression Tests

on:
  push:
    branches: [main, juce_backend_clean]
  pull_request:
    branches: [main, juce_backend_clean]

jobs:
  regression:
    runs-on: macos-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Install dependencies
      run: |
        brew install googletest

    - name: Configure CMake
      run: |
        mkdir -p build_phase4d
        cd build_phase4d
        cmake .. -DCMAKE_BUILD_TYPE=Release

    - name: Build regression tests
      run: |
        cd build_phase4d
        cmake --build . --target RegressionSuite

    - name: Run performance tests
      run: |
        cd build_phase4d
        ./PerformanceRegressionTest --gtest_output=xml

    - name: Run audio tests
      run: |
        cd build_phase4d
        ./AudioRegressionTest --gtest_output=xml

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: regression-test-results
        path: build_phase4d/test-results/
```

---

## Performance Baselines

Baselines are established from Phase 4A CPU performance tests:

| Instrument  | Max CPU % | Max Time (ms) | Max Allocations |
|-------------|-----------|---------------|------------------|
| NexSynth    | 5.0%      | 10.0          | 0                |
| SamSampler  | 8.0%      | 15.0          | 0                |
| LocalGal    | 6.0%      | 12.0          | 0                |
| KaneMarco   | 7.0%      | 14.0          | 0                |
| KaneMarcoAether | 10.0% | 20.0          | 0                |

**Note:** These are conservative baselines. Actual performance may be better.

---

## Audio Baselines

Audio baselines ensure no level/timbre changes:

| Instrument  | RMS Range | Peak Range | Max Difference |
|-------------|-----------|------------|----------------|
| NexSynth    | 0.1-0.3   | 0.5-1.0    | 0.001          |
| SamSampler  | 0.1-0.4   | 0.5-1.0    | 0.001          |
| LocalGal    | 0.1-0.3   | 0.5-1.0    | 0.001          |
| KaneMarco   | 0.1-0.3   | 0.5-1.0    | 0.001          |
| KaneMarcoAether | 0.1-0.4 | 0.5-1.0    | 0.001          |

---

## Updating Baselines

When intentional changes affect performance or audio:

1. **Update baselines in code:**
   - Edit `PerformanceRegressionTest.cpp` BASELINES array
   - Edit `AudioRegressionTest.cpp` AUDIO_BASELINES array

2. **Document the reason:**
   ```cpp
   // Updated 2025-12-31: Added KaneMarcoAether instrument
   // Old baseline was too strict, actual performance is 12%
   {"KaneMarcoAether", 12.0, 25.0, 0, 2 * 1024 * 1024},
   ```

3. **Run tests to verify:**
   ```bash
   ./RegressionSuite
   ```

4. **Commit changes with explanation:**
   ```bash
   git commit -m "feat: Relax KaneMarcoAether performance baseline

   Actual performance is better than initial estimate.
   Updated from 10% to 12% CPU budget."
   ```

---

## Troubleshooting

### Performance Test Failures

**Symptom:** CPU time exceeds baseline

**Possible Causes:**
1. Recent code changes introduced inefficiency
2. Compiler optimization changed
3. Different CPU architecture (ARM vs x86)

**Debug Steps:**
1. Profile the instrument to identify bottleneck
2. Check if baseline needs updating (maybe performance actually improved)
3. Verify compiler flags match baseline configuration

### Audio Test Failures

**Symptom:** RMS/Peak outside expected range

**Possible Causes:**
1. Envelope parameters changed
2. Oscillator levels modified
3. Bug in DSP algorithm

**Debug Steps:**
1. Generate audio output and inspect in DAW
2. Compare with golden reference (Phase 4C)
3. Check if change is intentional

### Determinism Test Failures

**Symptom:** Max difference > 1e-6

**Possible Causes:**
1. Random number generator not seeded (like LocalGal was)
2. Uninitialized state
3. Race conditions

**Debug Steps:**
1. Run test multiple times to verify non-determinism
2. Check random seed initialization
3. Verify all state is reset between runs

---

## Files

- `CMakeLists.txt` - Build configuration
- `RegressionSuite.cpp` - Main test runner
- `PerformanceRegressionTest.cpp` - Performance regression tests
- `AudioRegressionTest.cpp` - Audio regression tests
- `README.md` - This file

---

## Dependencies

- Google Test (gtest)
- JUCE (modules only, no GUI)
- Pure DSP instrument implementations
- Phase 4A performance baselines
- Phase 4C golden test references

---

## Status

- ✅ **Implemented:** All regression tests created and passing
- ✅ **CI/CD Ready:** Can integrate with GitHub Actions
- ✅ **Documented:** Complete usage guide and troubleshooting
- ✅ **Maintainable:** Clear baseline update process

**Phase 4D: COMPLETE!** 🏆
