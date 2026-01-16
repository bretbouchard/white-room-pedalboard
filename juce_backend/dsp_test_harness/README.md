# DSP Test Harness

**Objective, headless audio testing for InstrumentDSP implementations.**

## Philosophy

> Audio is data. If you can't measure it, you don't have audio — you have hope.

This test suite proves—objectively—that your DSP code:
1. Produces real, continuous audio (not clicks)
2. Is stable over time
3. Is numerically sane (no NaNs, denormals)
4. Is musically meaningful
5. Has no block-edge discontinuities

## Features

- ✅ **No MIDI required** - Internal signal generation
- ✅ **No DAW required** - Pure offline rendering
- ✅ **Deterministic** - Same inputs = same outputs
- ✅ **CI/CD friendly** - Automated regression testing
- ✅ **Comprehensive metrics** - RMS, peak, FFT, SNR, etc.
- ✅ **Golden file comparison** - Audio regression detection
- ✅ **Visual inspection** - Waveform and FFT plots

## Quick Start

### Build

```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend/dsp_test_harness
mkdir build && cd build
cmake ..
make -j8
```

### Run Tests

```bash
# Run all tests for an instrument
./bin/dsp_test_host --instrument SamSampler --test silence
./bin/dsp_test_host --instrument SamSampler --test impulse
./bin/dsp_test_host --instrument SamSampler --test tone_220hz

# Or use Python test runner
python scripts/run_dsp_tests.py --bin ./bin/dsp_test_host --instrument SamSampler
```

### Update Golden Files

```bash
python scripts/run_dsp_tests.py \
    --bin ./bin/dsp_test_host \
    --instrument SamSampler \
    --update-golden
```

### Visual Inspection

```bash
python scripts/inspect_audio.py tests/audio/out/silence.wav
python scripts/inspect_audio.py tests/audio/out/tone_220hz.wav --spectrogram
```

## Test Cases

### 1. Silence Test

**Purpose:** Detect DC offsets, denormals, NaNs, runaway feedback.

**Setup:** All inputs zero, render 2 seconds

**Assertions:**
- `max(abs(sample)) < 1e-4`
- `mean ≈ 0`
- `no NaN`
- `no Inf`

**Fail indicators:**
- DC bias (uninitialized memory)
- Runaway feedback (instability)
- Bad denormal handling

### 2. Impulse Response Test

**Purpose:** Detect filters, envelopes, smoothing, clicks.

**Setup:** One-sample impulse at t=0, then silence

**Assertions:**
- Output decays smoothly
- No repeated spikes
- Energy decreases monotonically

**What it reveals:**
- Filter stability
- Envelope smoothing
- Clicks vs intentional transients

### 3. Constant Tone Test

**Purpose:** Prove sustained output, not clicks.

**Setup:** Internal oscillator, fixed frequency (220 Hz), fixed amplitude

**Assertions:**
- `RMS > 0.01`
- `Zero-crossing rate ≈ expected`
- `Spectral peak near target frequency`

**Fail indicators:**
- Click trains (block reset bug)
- Zeroed buffers
- Wrong buffer stride
- Phase reset per block

### 4. Block Boundary Continuity Test

**Purpose:** Catch the #1 DSP bug: buffer-edge discontinuities ("woodpecker")

**Setup:** Render multiple blocks, compare boundaries

**Assertion:**
- `abs(sample[N_end] - sample[N+1_start]) < ε`

**Fail indicators:**
- Phase reset per block
- Envelope retrigger per block
- Incorrect state storage

## Metrics Explained

| Metric | Description | Good Values |
|--------|-------------|-------------|
| RMS | Root mean square level | Depends on signal |
| Peak | Maximum amplitude | < 1.0 (no clipping) |
| DC Offset | DC bias | ≈ 0 |
| NaN Count | Number of NaN samples | 0 |
| Inf Count | Number of infinite samples | 0 |
| Clipped Samples | Samples at clipping limit | 0 |
| ZCR/s | Zero-crossing rate | Matches expected frequency |
| FFT Peak Hz | Dominant frequency | Near target tone |
| FFT Peak dB | Level of dominant peak | Reasonable level |
| Block Edge Max Jump | Discontinuity at block boundaries | < 0.01 |

## Golden File Comparison

The test suite supports golden file comparison for regression testing:

- **xcorr alignment** - Tolerates latency differences
- **max_abs_diff** - Point-by-point comparison
- **rms_diff** - Overall difference
- **snr_db** - Signal-to-noise ratio

**Default tolerances:**
- `max_abs_diff <= 1e-3`
- `rms_diff <= 1e-4`
- `snr_db >= 50.0`

## CI/CD Integration

### GitHub Actions

```yaml
name: DSP Audio Tests

on: [push, pull_request]

jobs:
  dsp-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: |
          cd juce_backend/dsp_test_harness
          mkdir build && cd build
          cmake ..
          make -j8

      - name: Install Python deps
        run: pip3 install numpy matplotlib

      - name: Run tests
        run: |
          cd juce_backend/dsp_test_harness
          python scripts/run_dsp_tests.py \
            --bin build/bin/dsp_test_host \
            --instrument SamSampler

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dsp-test-outputs
          path: juce_backend/dsp_test_harness/tests/audio/out/
```

## Adding New Instruments

1. **Include instrument header** in `dsp_test_host.cpp`:

```cpp
#include "../../instruments/YourInstrument/include/dsp/YourInstrumentDSP.h"
```

2. **Add factory function**:

```cpp
std::unique_ptr<DSP::InstrumentDSP> createYourInstrument()
{
    return std::make_unique<DSP::YourInstrumentDSP>();
}
```

3. **Register in instrument table**:

```cpp
TestInstrument instruments[] = {
    {"SamSampler", createSamSampler},
    {"DrumMachine", createDrumMachine},
    {"YourInstrument", createYourInstrument},  // Add here
    {nullptr, nullptr}
};
```

4. **Rebuild and test**:

```bash
cd build && make && ./bin/dsp_test_host --list-instruments
```

## Troubleshooting

### "NaN Count > 0"

- Check for division by zero
- Check for uninitialized memory
- Check for sqrt/log of negative numbers

### "High Block Edge Max Jump"

- Phase reset per block
- Envelope retrigger per block
- State not preserved across process() calls

### "FFT Peak at Wrong Frequency"

- Sample rate mismatch
- Tuning calculation error
- Phase accumulator reset

### "Golden Comparison Fails"

- Algorithm changes (update golden if intentional)
- Timing/latency changes (check lag_samples)
- Precision issues (adjust tolerances)

## File Structure

```
dsp_test_harness/
├── include/dsp_test/
│   └── DspOfflineHost.h          # Core test harness interface
├── src/
│   ├── DspOfflineHost.cpp         # Implementation
│   └── dsp_test_host.cpp          # Test executable
├── scripts/
│   ├── run_dsp_tests.py           # Python test runner
│   └── inspect_audio.py           # Visual inspector
├── tests/audio/
│   ├── golden/                    # Golden reference files
│   ├── out/                       # Test outputs
│   └── plots/                     # Waveform/FFT plots
├── CMakeLists.txt
└── README.md
```

## What This Protects You From

✔ "It compiles but sounds like shit"
✔ Clicks mistaken for audio
✔ Silent failures
✔ UI gaslighting
✔ Block reset bugs
✔ DSP state bugs
✔ False confidence

## Hard Truth

**If you don't have this test harness, you do not yet have DSP — you have undefined behavior.**

## License

Part of the Schillinger Ecosystem.
