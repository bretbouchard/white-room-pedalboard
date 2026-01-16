# Phase 1: Single Note Test - Foundation

**Purpose**: Verify JUCE audio pipeline works and can output MIDI

This is the foundation layer - if this doesn't work, nothing above it will.

## What It Does

- Outputs a single Middle C (MIDI 60) note
- Duration: exactly 1 second
- Velocity: 80% (MIDI 102)
- Channel: MIDI channel 1
- Includes comprehensive logging at every step

## Files

- `SingleNoteTestProcessor.h` - Processor header
- `SingleNoteTestProcessor.cpp` - Processor implementation
- `SingleNoteTestEditor.h` - GUI header
- `SingleNoteTestEditor.cpp` - GUI implementation
- `CMakeLists.txt` - Build configuration (added to plugins/CMakeLists.txt)

## Building

### Prerequisites

```bash
# Ensure JUCE submodule exists
cd juce_backend
git submodule update --init --recursive
```

### Build Steps

```bash
cd juce_backend/plugins
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

### Expected Output

```
✓ LOCAL_GAL Acid Synthesizer
✓ Sam Sampler
✓ Nex FM Synth
✓ Giant Instruments (All 5 Giants in One Plugin)
✓ Schillinger Composition System
✓ Single Note Test (Foundation Test)

✅ Plugin Build Configuration Complete
```

### Plugin Location

After building:
- **VST3**: `build/SingleNoteTest_artefacts/VST3/SingleNoteTest.vst3`
- **AU** (macOS): `build/SingleNoteTest_artefacts/AU/SingleNoteTest.component`

## Testing in DAW

### Step 1: Load Plugin

1. Open your DAW (Ableton Live, Logic Pro, Reaper, etc.)
2. Scan for new plugins if needed
3. Load "SingleNoteTest" plugin as a MIDI effect

### Step 2: Add MIDI Monitor

1. Insert a MIDI monitor after the plugin
   - **Ableton**: Insert "MIDI Monitor" MIDI effect
   - **Logic**: Use "MIDI Monitor" from Scripter
   - **Reaper**: Insert "ReaMote" or "MIDI Monitor" JS plugin

### Step 3: Test

1. Start DAW playback
2. Watch the MIDI monitor
3. **Expected**: See Middle C note appear
4. **Expected**: Note duration is exactly 1 second
5. **Check logs** for detailed output

## Log Output

### Plugin Load

```
[SingleNoteTest] ========== CONSTRUCTED ==========
[SingleNoteTest] Test note: MIDI 60 (Middle C)
[SingleNoteTest] Test velocity: 0.8 (102 MIDI)
[SingleNoteTest] Test duration: 1.0 seconds
[SingleNoteTest] Test channel: 1
[SingleNoteTest] =====================================
```

### Prepare to Play

```
[SingleNoteTest] ========================================
[SingleNoteTest] prepareToPlay called:
[SingleNoteTest]   Sample rate: 44100.0 Hz
[SingleNoteTest]   Block size: 512 samples
[SingleNoteTest]   Block duration: 11.6 ms
[SingleNoteTest] ========================================
```

### Note Events

```
[SingleNoteTest] >>> NOTE ON <<<
    at sample 0 (time=0.000s)
    note=60 ch=1
[SingleNoteTest] Note ON sent: midi=60 vel=102 at sample 0
[SingleNoteTest] >>> NOTE OFF <<<
    at sample 44100 (time=1.000s)
    note=60 ch=1
[SingleNoteTest] Note OFF sent: midi=60 at sample 44100
    (time=1.000s)
```

### Test Complete

```
[SingleNoteTest] ========== TEST SUMMARY ==========
[SingleNoteTest] Note ON events: 1
[SingleNoteTest] Note OFF events: 1
[SingleNoteTest] Total playback: 1.00 seconds
[SingleNoteTest] STATUS: ✓ PASS - Note pair complete
[SingleNoteTest] ======================================
```

## GUI

The plugin editor shows:
- **Status**: Current test status (Ready/Playing/Complete)
- **Test Info**: Note number, velocity, duration, channel
- **Stats**: Note ON/OFF counts
- **Reset Button**: Restart the test

## Troubleshooting

### No MIDI Output

**Check**:
- Plugin is loaded as MIDI effect (not instrument)
- DAW transport is playing
- MIDI monitor is inserted after plugin
- Check DAW console for log output

**Common issues**:
- **AU plugins on macOS**: May need to rescan Audio Plug-Ins
- **VST3 permissions**: Ensure plugin is allowed in DAW preferences
- **MIDI routing**: Verify plugin output is routed to MIDI track

### Wrong Note Number

**Check logs**: Look for "midi=" value
- Should be 60 for Middle C
- If different, check TEST_MIDI_NOTE constant

### Wrong Timing

**Check logs**: Look for timestamp values
- Note OFF should be exactly 1.0 second after NOTE ON
- Calculate: `sampleOffset / sampleRate = seconds`

### Build Errors

**JUCE not found**:
```bash
cd juce_backend
git submodule update --init --recursive
```

**Compilation errors**:
- Check C++ standard: Requires C++20
- Check JUCE version: Requires JUCE 7.0.0 or later

## Success Criteria

✅ **Pass criteria**:
- [ ] Plugin loads in DAW without errors
- [ ] DAW MIDI monitor detects Middle C note
- [ ] Note duration is exactly 1 second
- [ ] Note ON and OFF events are paired correctly
- [ ] No xruns (audio dropouts) in DAW
- [ ] Log output shows all expected events

❌ **Fail criteria**:
- Plugin fails to load
- No MIDI output
- Wrong note number
- Wrong timing
- DAW crash
- xruns in DAW

## Next Steps

After Phase 1 passes:
- **Phase 2**: JavaScriptCore integration
- **Phase 3**: SDK integration
- **Phase 4**: MIDI generation from notes
- **Phase 5**: End-to-end test

## Platform Support

Tested on:
- macOS 10.15+ (AU, VST3)
- Windows 10+ (VST3)
- Linux (VST3)

## Notes

- This is a **MIDI effect plugin**, not an instrument
- It does not produce audio itself
- The host DAW must route the MIDI to an instrument
- All timing is sample-accurate
- Uses JUCE's high-resolution timer for precision

---

**Created**: 2026-01-13
**Phase**: 1 - Foundation
**Status**: Ready to build and test
