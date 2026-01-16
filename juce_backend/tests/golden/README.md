# Golden Output Tests

**Purpose:** Headless rendering and deterministic output validation

## What Are Golden Tests?

Golden tests render audio offline and compare against known-good "golden" reference files. This ensures:

- **Deterministic output**: Same SongModel = same audio
- **No regressions**: Code changes don't alter output unexpectedly
- **Cross-platform consistency**: Same results on tvOS, macOS, etc.
- **Validated DSP**: All instruments produce correct audio

## Test Structure

```
tests/golden/
├── reference/          # Golden reference files
│   ├── NexSynth/       # Instrument-specific references
│   │   ├── test_basic.wav
│   │   ├── test_chord.wav
│   │   └── test_preset_01.wav
│   ├── SamSampler/
│   └── LocalGal/
├── inputs/             # Test SongModel files
│   ├── basic_song.json
│   ├── chord_test.json
│   └── preset_test.json
├── outputs/            # Generated renders (gitignored)
└── GoldenTest.cpp      # Test runner
```

## Test Flow

1. **Load SongModel** - Load test input from `inputs/`
2. **Render Offline** - Process audio without real-time constraints
3. **Generate Output** - Save rendered audio to `outputs/`
4. **Compare to Golden** - Diff with reference in `reference/`
5. **Pass/Fail** - Test passes if outputs match within tolerance

## Writing Tests

### Test Input (SongModel)
```json
{
  "id": "test_basic",
  "name": "Basic Note Test",
  "tempo": 120.0,
  "timeSigUpper": 4,
  "timeSigLower": 4,
  "duration": 1.0,
  "tracks": [
    {
      "id": "track_0",
      "name": "NexSynth",
      "instrumentId": "NexSynth",
      "notes": [
        {
          "startTime": 0.0,
          "duration": 0.5,
          "midiNote": 60,
          "velocity": 0.8
        }
      ]
    }
  ],
  "buses": [
    {
      "id": "master",
      "name": "Master",
      "busIndex": 0,
      "volume": 0.0
    }
  ],
  "masterBusId": "master"
}
```

### Test Code
```cpp
TEST(GoldenOutput, NexSynthBasicNote)
{
    // Load test input
    SongModel_v1 songModel = loadTestInput("inputs/basic_note.json");

    // Initialize engine
    EngineController engine;
    EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;

    ASSERT_TRUE(engine.initialize(config));
    ASSERT_TRUE(engine.loadSong(songModel));

    // Render offline
    constexpr int numSamples = 48000;  // 1 second
    float* outputs[2];
    float leftChannel[numSamples];
    float rightChannel[numSamples];
    outputs[0] = leftChannel;
    outputs[1] = rightChannel;

    // Process entire song
    engine.play();
    for (int i = 0; i < numSamples; i += 512) {
        engine.process(outputs, 2, std::min(512, numSamples - i));
    }

    // Compare to golden reference
    AudioBuffer rendered = {outputs[0], outputs[1], numSamples};
    AudioBuffer reference = loadReference("reference/NexSynth/test_basic.wav");

    EXPECT_TRUE(compareAudio(rendered, reference, 0.0001));  // -80dB tolerance
}
```

## Audio Comparison

### Comparison Criteria
- **Sample-accurate timing**: Events at same sample positions
- **Bit-exact output**: Identical samples (within float precision)
- **Tolerance**: -80dB (0.0001) for numerical errors
- **Duration**: Same length (within 1 sample)

### Failure Modes
- **Timing mismatch**: Events at different samples
- **Value drift**: Samples differ beyond tolerance
- **Length mismatch**: Different output duration
- **Missing content**: Silence where audio expected

## Determinism Requirements

For golden tests to work, all of these must be deterministic:

- ✅ **PRNG seeds**: Each instrument instance gets unique seed
- ✅ **Parameter smoothing**: Same interpolation every time
- ✅ **Event timing**: Sample-accurate, no jitter
- ✅ **DSP algorithms**: No undefined behavior, no race conditions
- ✅ **Denormal handling**: Consistent across platforms

## Running Tests

### Run All Golden Tests
```bash
# Run all golden tests
./tests/golden/GoldenTest

# Or via CMake
make GoldenTest
./GoldenTest
```

### Generate New Golden References
```bash
# Run tests with --generate-golden flag
./GoldenTest --generate-golden

# This will:
# 1. Render all tests
# 2. Save outputs to reference/ (instead of outputs/)
# 3. Overwrite existing golden files
```

### Update Specific Golden
```bash
# Regenerate just one test
./GoldenTest --generate-golden --test=NexSynthBasicNote
```

## Continuous Integration

### CI Pipeline
```yaml
golden_tests:
  script:
    - cmake -B build -DCMAKE_BUILD_TYPE=Release
    - cmake --build build --target GoldenTest
    - ./build/GoldenTest
  artifacts:
    paths:
      - tests/golden/outputs/  # For debugging failures
```

### On Failure
1. CI saves rendered output to `outputs/`
2. Download artifacts for analysis
3. Compare reference vs rendered in audio editor
4. Investigate cause of diff
5. Fix bug OR update golden if intentional change

## Platform Differences

### Same Results, Different Platforms
- ✅ **tvOS**: Bit-exact match with reference
- ✅ **macOS**: Bit-exact match with reference
- ✅ **ARM vs x86**: Bit-exact match (same compiler flags)

### Potential Issues
- ⚠️ **Compiler differences**: Different optimizations may cause drift
- ⚠️ **Library versions**: Different math libraries may differ slightly
- ⚠️ **Floating point**: ARM vs x86 may have minor differences

### Solution
- Use tolerance (-80dB) for minor floating-point differences
- Generate platform-specific golden files if needed
- Document any known platform differences

## Files

- `tests/golden/GoldenTest.cpp` - Test runner
- `tests/golden/reference/` - Golden reference files
- `tests/golden/inputs/` - Test SongModel files
- `tests/golden/outputs/` - Generated renders (gitignored)
- `include/testing/GoldenTest.h` - Test utilities

## Dependencies

- `integration/EngineController.h` - SongModel loading
- `integration/SongModelAdapter.h` - SongModel parsing
- `include/dsp/InstrumentFactory.h` - Instrument creation
- Audio file I/O (dr_wav or similar)

---

**Owner:** QA Team
**Status:** 🔴 Not Implemented (Phase 4 task)
**Priority:** HIGH (required for production)
