# Phase 4: Apple TV Hardening - Implementation Plan

**Date:** December 30, 2025
**Branch:** juce_backend_clean
**Status:** 🟡 In Progress
**Priority:** HIGH (Production Gatekeeper)

---

## 🎯 Objective

Validate that the JUCE backend is production-ready for Apple TV deployment through comprehensive testing:

1. **Performance** - Verify < 20% CPU per instrument
2. **Stability** - No crashes, no memory leaks
3. **Regression** - Ensure no new bugs
4. **Determinism** - Golden audio output validation

---

## 📊 Current Infrastructure Assessment

### ✅ Existing Assets

#### Performance Monitoring
- **CPUMonitor** (`include/audio/CPUMonitor.h`) - Comprehensive CPU tracking
  - Real-time audio thread monitoring
  - Per-core metrics
  - Performance thresholds (warning, critical, overload)
  - Alert system with listeners
  - Statistical analysis (mean, std dev, min/max)

#### Test Framework
- **Google Test** - Already configured and working
- **Integration Tests** - Phase 3 complete (10/13 tests passing)
- **Instrument Tests** - 72/72 Pure DSP tests passing
- **Test CMake** - Comprehensive test infrastructure

#### Audio Analysis
- **CoreDSPAnalyzer** - Spectral analysis
- **PitchDetector** - Pitch tracking
- **DynamicsAnalyzer** - LUFS, dynamic range
- **SpatialAnalyzer** - Stereo imaging
- **QualityDetector** - Clipping, phase detection

### ❌ Missing Infrastructure

#### Performance Tests
- Per-instrument CPU profiling
- Load testing (multiple instruments)
- Stress testing (worst-case scenarios)
- Memory profiling

#### Stability Tests
- Memory leak detection
- Crash resilience
- Long-running stability
- Error recovery

#### Golden Tests
- Headless rendering infrastructure
- Audio file I/O
- Comparison utilities
- Test input SongModels
- Golden reference files

---

## 🔨 Implementation Strategy

### Phase 4A: Performance Testing (Week 1)

**Deliverables:**
1. Per-instrument CPU profiling
2. Load testing (8 instruments simultaneously)
3. Stress testing (worst-case note density)
4. Memory profiling

**Files to Create:**
```
tests/performance/
├── CMakeLists.txt                    # Test build config
├── InstrumentPerformanceTest.cpp     # Per-instrument CPU tests
├── LoadPerformanceTest.cpp           # Multi-instrument load tests
├── StressPerformanceTest.cpp         # Worst-case scenario tests
└── MemoryProfileTest.cpp             # Memory usage profiling
```

**Acceptance Criteria:**
- ✅ Each instrument < 20% CPU at 48kHz
- ✅ 8 instruments < 80% CPU total
- ✅ Memory usage < 100MB per instrument
- ✅ No memory leaks detected

---

### Phase 4B: Stability Testing (Week 2)

**Deliverables:**
1. Memory leak detection (Valgrind/ASan)
2. Crash resilience tests
3. Long-running stability (24 hours)
4. Error recovery validation

**Files to Create:**
```
tests/stability/
├── CMakeLists.txt                    # Test build config
├── MemoryLeakTest.cpp                # Leak detection tests
├── CrashResilienceTest.cpp           # Crash recovery tests
├── LongRunningStabilityTest.cpp      # 24-hour stability test
└── ErrorRecoveryTest.cpp             # Error handling tests
```

**Acceptance Criteria:**
- ✅ No memory leaks (Valgrind clean)
- ✅ No crashes (10,000 test iterations)
- ✅ Stable for 24 hours continuous playback
- ✅ Graceful error recovery

---

### Phase 4C: Golden Tests (Week 3)

**Deliverables:**
1. Headless rendering infrastructure
2. Audio file I/O utilities
3. Audio comparison utilities
4. Test SongModel inputs
5. Golden reference WAV files

**Files to Create:**
```
tests/golden/
├── CMakeLists.txt                    # Test build config
├── GoldenTest.cpp                    # Main test runner
├── AudioFileIO.{h,cpp}               # WAV file read/write
├── AudioComparator.{h,cpp}           # Audio comparison utilities
├── reference/                        # Golden reference files
│   ├── NexSynth/
│   │   ├── basic_note.wav
│   │   ├── chord_test.wav
│   │   └── preset_01.wav
│   ├── SamSampler/
│   ├── LocalGal/
│   └── KaneMarco/
└── inputs/                           # Test SongModel files
    ├── basic_note.json
    ├── chord_test.json
    └── preset_test.json
```

**Supporting Files:**
```
include/testing/
├── GoldenTest.h                      # Test utilities
├── AudioFileIO.h                     # Audio I/O interface
└── AudioComparator.h                 # Comparison interface
```

**Acceptance Criteria:**
- ✅ Deterministic output (same input = same audio)
- ✅ Sample-accurate timing
- ✅ Bit-exact match (within -80dB tolerance)
- ✅ All 8 instruments validated

---

### Phase 4D: Regression Suite (Week 4)

**Deliverables:**
1. Automated regression test suite
2. CI/CD integration
3. Performance regression detection
4. Audio regression detection

**Files to Create:**
```
tests/regression/
├── CMakeLists.txt                    # Test build config
├── RegressionSuite.cpp               # Main regression runner
├── PerformanceRegressionTest.cpp     # Detect performance slowdowns
└── AudioRegressionTest.cpp           # Detect audio changes
```

**CI/CD Integration:**
```yaml
# .github/workflows/phase4_tests.yml
name: Phase 4 Apple TV Hardening
on: [push, pull_request]
jobs:
  performance:
    runs-on: [macos-latest, self-hosted-apple-tv]
    steps:
      - run: InstrumentPerformanceTest
      - run: LoadPerformanceTest
      - run: StressPerformanceTest
  stability:
    runs-on: [macos-latest, self-hosted-apple-tv]
    steps:
      - run: MemoryLeakTest
      - run: CrashResilienceTest
  golden:
    runs-on: [macos-latest, self-hosted-apple-tv]
    steps:
      - run: GoldenTest
  regression:
    runs-on: [macos-latest, self-hosted-apple-tv]
    steps:
      - run: RegressionSuite
```

**Acceptance Criteria:**
- ✅ All tests pass in CI/CD
- ✅ Performance baseline established
- ✅ Audio baseline established
- ✅ Regression detection active

---

## 🧪 Test Implementation Details

### Performance Testing

#### Per-Instrument CPU Test
```cpp
TEST(InstrumentPerformance, NexSynthSingleNote)
{
    // Create instrument
    auto instrument = DSP::createInstrument("NexSynth");
    ASSERT_NE(instrument, nullptr);

    // Configure
    instrument->prepare(48000.0, 512);

    // Start CPU monitoring
    CPUMonitor cpuMonitor;
    cpuMonitor.initialize();
    cpuMonitor.startMonitoring();

    // Trigger worst-case scenario
    instrument->noteOn(60, 1.0f);
    instrument->noteOn(64, 1.0f);
    instrument->noteOn(67, 1.0f);

    // Process 10 seconds
    constexpr int numBlocks = (48000 * 10) / 512;
    float* output[2];
    float left[512], right[512];
    output[0] = left;
    output[1] = right;

    for (int i = 0; i < numBlocks; ++i) {
        cpuMonitor.beginAudioProcessing();
        instrument->process(output, 2, 512);
        cpuMonitor.endAudioProcessing(512);
    }

    // Check CPU usage
    auto metrics = cpuMonitor.getCurrentMetrics();
    EXPECT_LT(metrics.audioThreadUsage, 0.20);  // < 20% CPU
}
```

#### Load Testing (8 Instruments)
```cpp
TEST(LoadPerformance, EightInstrumentsSimultaneous)
{
    std::vector<std::unique_ptr<DSP::InstrumentDSP>> instruments;
    std::vector<const char*> instrumentNames = {
        "NexSynth", "SamSampler", "LocalGal",
        "KaneMarco", "KaneMarcoAether", "KaneMarcoAetherString",
        "DrumMachine", "FilterGate"
    };

    // Create all instruments
    for (auto name : instrumentNames) {
        auto inst = DSP::createInstrument(name);
        ASSERT_NE(inst, nullptr);
        inst->prepare(48000.0, 512);
        instruments.push_back(std::move(inst));
    }

    // Start CPU monitoring
    CPUMonitor cpuMonitor;
    cpuMonitor.initialize();
    cpuMonitor.startMonitoring();

    // Trigger all instruments
    for (auto& inst : instruments) {
        inst->noteOn(60, 0.8f);
    }

    // Process 10 seconds
    constexpr int numBlocks = (48000 * 10) / 512;
    float* output[2];
    float left[512], right[512];
    output[0] = left;
    output[1] = right;

    for (int i = 0; i < numBlocks; ++i) {
        cpuMonitor.beginAudioProcessing();

        // Process all instruments
        for (auto& inst : instruments) {
            inst->process(output, 2, 512);
        }

        cpuMonitor.endAudioProcessing(512);
    }

    // Check CPU usage
    auto metrics = cpuMonitor.getCurrentMetrics();
    EXPECT_LT(metrics.audioThreadUsage, 0.80);  // < 80% CPU total
}
```

---

### Golden Test Implementation

#### Headless Rendering
```cpp
TEST(GoldenOutput, NexSynthBasicNote)
{
    // Load test SongModel
    SongModel_v1 songModel = loadTestInput("inputs/basic_note.json");

    // Initialize engine
    EngineController engine;
    EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;

    ASSERT_TRUE(engine.initialize(config));
    ASSERT_TRUE(engine.loadSong(songModel));

    // Render offline (1 second)
    constexpr int numSamples = 48000;
    std::vector<float> leftChannel(numSamples);
    std::vector<float> rightChannel(numSamples);
    float* outputs[2] = { leftChannel.data(), rightChannel.data() };

    // Process entire song
    engine.play();
    for (int i = 0; i < numSamples; i += 512) {
        engine.process(outputs, 2, std::min(512, numSamples - i));
    }

    // Load golden reference
    AudioBuffer reference = loadReference("reference/NexSynth/basic_note.wav");

    // Compare audio
    AudioBuffer rendered = { leftChannel.data(), rightChannel.data(), numSamples };
    AudioComparisonResult result = compareAudio(rendered, reference);

    EXPECT_TRUE(result.matches);
    EXPECT_LT(result.maxDifference, 0.0001);  // -80dB tolerance
    EXPECT_EQ(result.sampleCount, numSamples);
}
```

#### Audio Comparison Utilities
```cpp
struct AudioComparisonResult {
    bool matches;
    double maxDifference;
    double meanDifference;
    int differingSamples;
    int sampleCount;
};

AudioComparisonResult compareAudio(const AudioBuffer& rendered,
                                   const AudioBuffer& reference,
                                   double tolerance = 0.0001)
{
    AudioComparisonResult result;
    result.sampleCount = std::min(rendered.sampleCount, reference.sampleCount);
    result.differingSamples = 0;
    result.maxDifference = 0.0;
    result.meanDifference = 0.0;

    // Compare each sample
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < result.sampleCount; ++i) {
            double diff = std::abs(rendered.channels[ch][i] -
                                  reference.channels[ch][i]);
            result.maxDifference = std::max(result.maxDifference, diff);
            result.meanDifference += diff;

            if (diff > tolerance) {
                result.differingSamples++;
            }
        }
    }

    result.meanDifference /= (result.sampleCount * 2);
    result.matches = (result.differingSamples == 0);

    return result;
}
```

---

## 📅 Timeline

| Week | Phase | Deliverables | Status |
|------|-------|--------------|--------|
| 1 | 4A | Performance Tests | 🟡 Pending |
| 2 | 4B | Stability Tests | 🔴 Not Started |
| 3 | 4C | Golden Tests | 🔴 Not Started |
| 4 | 4D | Regression Suite + CI/CD | 🔴 Not Started |

---

## ✅ Success Criteria

### Performance
- ✅ Each instrument < 20% CPU (single voice)
- ✅ 8 instruments < 80% CPU (polyphonic)
- ✅ Memory usage < 100MB per instrument
- ✅ No memory allocations in audio thread

### Stability
- ✅ No memory leaks (Valgrind clean)
- ✅ No crashes (10,000 iterations)
- ✅ 24-hour continuous playback stable
- ✅ Graceful error recovery

### Determinism
- ✅ Same SongModel = identical audio
- ✅ Sample-accurate event timing
- ✅ Bit-exact match (within -80dB)
- ✅ All instruments validated

### Regression
- ✅ Automated test suite in CI/CD
- ✅ Performance baseline established
- ✅ Audio baseline established
- ✅ Regression detection active

---

## 🚦 Exit Criteria

Phase 4 is **COMPLETE** when:

1. ✅ All performance tests pass (< 20% CPU per instrument)
2. ✅ All stability tests pass (no leaks, no crashes)
3. ✅ All golden tests pass (deterministic output)
4. ✅ Regression suite active in CI/CD
5. ✅ Tested on Apple TV hardware (or verified tvOS compatibility)
6. ✅ Documentation complete

---

## 📁 Next Steps

### Immediate (This Session)
1. ✅ Create Phase 4 plan document (THIS FILE)
2. 🟡 Create performance test infrastructure
3. 🟡 Implement per-instrument CPU tests
4. 🟡 Implement load tests

### Short Term (Next Week)
5. ❌ Implement stability tests
6. ❌ Implement golden test infrastructure
7. ❌ Generate golden reference files

### Medium Term (Next 2 Weeks)
8. ❌ Implement regression suite
9. ❌ Integrate with CI/CD
10. ❌ Document all tests
11. ❌ Final validation on Apple TV hardware

---

**Owner:** Architecture Team
**Lead:** Claude Code
**Reviewers:** DSP Team, QA Team, Platform Team
**Status:** 🟡 Phase 4A Starting

**Last Updated:** December 30, 2025

---

## 📝 Notes

- **Apple TV Hardware**: If actual Apple TV hardware unavailable, verify:
  - tvOS simulator compatibility
  - ARM64 optimizations
  - Platform-specific restrictions (no VST3/AU, limited memory)

- **CPU Budget**: < 20% per instrument allows for:
  - 5 instruments at 100% CPU (safe margin)
  - System overhead + other processing
  - Thermal headroom

- **Memory Budget**: < 100MB per instrument allows for:
  - 8 instruments = 800MB (within Apple TV limits)
  - System overhead
  - Audio buffers + processing

- **Determinism**: Critical for:
  - Reproducible renders
  - Automated testing
  - User trust

