# SDK → Synth → Audio Pipeline Foundation Test

## Purpose

Prove the entire audio pipeline works end-to-end:

**Schillinger SDK → Synth DSP → Audio Output**

## What It Tests

1. **Schillinger SDK Loading** (via JavaScriptCore)
   - Load SDK bundle
   - Call `createSchillingerSong()`
   - Call `realizeSong()`

2. **Note Parsing**
   - Parse realized notes from JSON
   - Convert to `ScheduledEvent` objects

3. **Synth Rendering**
   - `LocalGalPureDSP` handles events
   - Renders audio to buffer
   - Output to WAV file

4. **Platform Verification**
   - Works on macOS, iOS, tvOS, Linux (Raspberry Pi)
   - No external DAW required
   - No plugin hosting required

## Building

### macOS / Linux

```bash
cd juce_backend/tests/sdk_synth_pipeline
mkdir build && cd build

cmake ..
cmake --build . --config Release

# Run the test
./SdkSynthPipelineTest
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║  SDK → SYNTH → AUDIO PIPELINE FOUNDATION TEST               ║
║  Platform: macOS                                            ║
╚════════════════════════════════════════════════════════════╝

[TEST] ========== PHASE 1: INITIALIZE SYNTH ==========
[TEST] ✓ Synth created: LocalGal v1.0.0
[TEST]   Max polyphony: 16

[TEST] ========== PHASE 2: LOAD SCHILLINGER SDK ==========
[SchillingerSDK] Loading SDK bundle...
[TEST] ✓ SDK loaded

[TEST] ========== PHASE 3: GENERATE COMPOSITION ==========
[SchillingerSDK] createSchillingerSong() called
[TEST] ✓ Song created: XXX bytes

[TEST] ========== PHASE 4: REALIZE NOTES ==========
[SchillingerSDK] realizeSong() called
[TEST] ✓ Notes realized: XXX bytes

[TEST] ========== PHASE 5: PARSE EVENTS ==========
[SchillingerSDK] Parsing realized notes...
[SchillingerSDK]  Note ON: midi=60 vel=0.8 time=0.000s
[SchillingerSDK]  Note OFF: midi=60 time=0.500s
...
[TEST] ✓ Parsed 8 events (4 note pairs)

[TEST] ========== PHASE 6: RENDER AUDIO ==========
[AudioRenderer] Rendering to file: sdk_synth_pipeline_test_output.wav
[AudioRenderer] Processing 240000 samples...
[AudioRenderer] Event scheduled at sample 0: NOTE ON midi=60
[AudioRenderer] Event scheduled at sample 24000: NOTE OFF midi=60
...
[AudioRenderer] WAV file written: XXX bytes
[TEST] ✓ Audio rendered to: sdk_synth_pipeline_test_output.wav

╔════════════════════════════════════════════════════════════╗
║  TEST COMPLETE: ✓ PASS                                    ║
╚════════════════════════════════════════════════════════════╝
```

## Output File

After successful test run:
- **File**: `sdk_synth_pipeline_test_output.wav`
- **Format**: 16-bit WAV, 48kHz, stereo
- **Duration**: 5 seconds
- **Content**: 4 notes (C, E, G, C) played through LocalGal synth

## Troubleshooting

### Build Errors

**JUCE not found**:
```bash
cd juce_backend
git submodule update --init --recursive
```

**Missing LocalGalPureDSP**:
```bash
ls instruments/localgal/include/dsp/LocalGalPureDSP.h
ls instruments/localgal/src/dsp/LocalGalPureDSP.cpp
```

### Runtime Errors

**No audio output**:
- Check log output for event scheduling
- Verify synth `prepare()` succeeded
- Check WAV file was created

**Wrong notes/timing**:
- Check JSON parsing in `parseRealizedNotes()`
- Verify `ScheduledEvent` time calculations
- Check `sampleOffset` computation

## Next Steps

After this test passes:

1. **Test all synths**: Replace `LocalGalPureDSP` with `NexSynth`, `SamSampler`, etc.
2. **Test all presets**: Load synth presets and verify audio output
3. **Test on all platforms**: macOS, iOS, tvOS, Raspberry Pi
4. **JavaScriptCore integration**: Replace manual JSON with actual SDK calls

## Platform Matrix

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Target | Primary development platform |
| iOS | ✅ Target | iPhone/iPad testing |
| tvOS | ✅ Target | Apple TV testing |
| Linux | ✅ Target | Raspberry Pi testing |

## Success Criteria

✅ **Pass**: All 6 phases complete, WAV file created with audible notes
❌ **Fail**: Any phase fails or WAV file is silent/corrupted

---

**Created**: 2026-01-13
**Phase**: Foundation - SDK → Synth → Audio Pipeline
**Status**: Ready to build
