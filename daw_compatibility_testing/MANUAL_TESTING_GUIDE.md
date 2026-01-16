# Manual DAW Testing Guide

## Quick Start (VST3 Testing in Reaper)

### Prerequisites
- macOS 10.15+ (Catalina or later)
- Apple Silicon Mac (arm64)
- Reaper DAW installed (https://www.reaper.fm/download.php)
- VST3 plugins built

### Step 1: Install Plugins

```bash
# Copy all VST3 plugins to Reaper plugin path
cp -r /Users/bretbouchard/apps/schill/white_room/juce_backend/*_plugin_build/build/*_artefacts/Release/VST3/*.vst3 ~/Library/Audio/Plug-Ins/VST3/

# Verify installation
ls ~/Library/Audio/Plug-Ins/VST3/
```

Expected output:
```
AetherGiantHorns.vst3
AetherGiantVoice.vst3
FarFarAway.vst3
FilterGate.vst3
KaneMarcoAetherString.vst3
KaneMarcoAether.vst3
LocalGal.vst3
Monument.vst3
NexSynth.vst3
SamSampler.vst3
```

### Step 2: Configure Reaper

1. **Open Reaper**
2. **Set Audio Device:**
   - Preferences → Audio → Device
   - Select "Built-in Output" (or your audio interface)
   - Sample Rate: 48000 Hz
   - Block Size: 512 samples

3. **Set Plugin Path:**
   - Preferences → Plug-ins → VST
   - Verify path includes: `~/Library/Audio/Plug-Ins/VST3/`
   - Click "Re-scan" if plugins don't appear

### Step 3: Test Plugin Loading

For each plugin (start with NexSynth):

1. **Create New Project**
   - File → New Project
   - Choose "Empty project" template

2. **Add Instrument Track**
   - Track → Insert new track
   - Right-click track → Insert virtual instrument on new track

3. **Load Plugin**
   - In FX Browser, navigate to: VSTi → White Room → [Plugin Name]
   - Double-click plugin to insert

4. **Verify Loading**
   - Plugin UI should open
   - No error messages in Console
   - Reaper shows plugin in track FX chain

**Expected Result:** ✅ Plugin loads without crash, UI displays correctly

**If Failing:** Document error in results template

### Step 4: Test Basic Functionality

For each successfully loaded plugin:

1. **Test MIDI Input**
   - Draw MIDI notes in piano roll (C4, D4, E4)
   - Press Space to play
   - Verify: Plugin produces sound

2. **Test Parameters**
   - Open plugin UI
   - Move main volume/gain parameter
   - Verify: Sound level changes audibly

3. **Test Presets**
   - Open plugin preset browser
   - Load different presets
   - Verify: Presets load and sound different

4. **Test Transport**
   - Play/Pause/Stop
   - Verify: No crashes, audio stops/starts correctly

**Expected Result:** ✅ All basic functions work correctly

### Step 5: Test Advanced Features

For plugins that pass basic tests:

1. **Test Automation**
   - Right-click plugin parameter → "Create automation envelope"
   - Draw automation curve in arrangement view
   - Play project
   - Verify: Parameter changes during playback

2. **Test State Persistence**
   - Set plugin parameters to specific values
   - Save project: File → Save project
   - Close Reaper
   - Reopen Reaper and load project
   - Verify: All parameter values restored

3. **Test Multiple Instances**
   - Add 2-3 more instances of same plugin
   - Verify: All instances load and work independently

4. **Test Sample Rate Change**
   - Preferences → Audio → Device
   - Change from 48000 to 44100
   - Verify: No crashes, audio still works

5. **Test Buffer Size Change**
   - Preferences → Audio → Device
   - Change buffer sizes: 64, 128, 256, 512, 1024
   - Verify: No crashes, no audio glitches

**Expected Result:** ✅ All advanced features work

## Test Result Documentation

### For Each Plugin, Document:

1. **Plugin Name**
2. **DAW Name & Version**
3. **macOS Version & Architecture**
4. **Test Date**
5. **Test Results**:
   - Loading: PASS/FAIL + notes
   - UI: PASS/FAIL + notes
   - MIDI Input: PASS/FAIL + notes
   - Audio Output: PASS/FAIL + notes
   - Parameters: PASS/FAIL + notes
   - Presets: PASS/FAIL + notes
   - Automation: PASS/FAIL + notes
   - State Persistence: PASS/FAIL + notes
   - Multiple Instances: PASS/FAIL + notes
   - Sample Rate Change: PASS/FAIL + notes
   - Buffer Size Change: PASS/FAIL + notes

6. **Issues Found:**
   - Error messages
   - Crash behavior
   - Graphical glitches
   - Audio problems
   - Performance issues

7. **Overall Assessment:**
   - Production Ready: YES/NO
   - Critical Blockers: List P0 issues
   - Workarounds: Document any workarounds

## Testing Checklist (Per Plugin)

Use this checklist for systematic testing:

### Loading Tests
- [ ] Plugin loads in FX browser
- [ ] Plugin inserts without crash
- [ ] UI opens correctly
- [ ] No console errors on load
- [ ] Plugin uses reasonable memory (<500MB)

### Basic Functionality Tests
- [ ] MIDI notes trigger sound
- [ ] Audio output works
- [ ] Play/pause/stop works
- [ ] Tempo changes work
- [ ] Parameters respond to changes
- [ ] Presets load correctly
- [ ] Volume control works

### Advanced Feature Tests
- [ ] Automation envelopes create
- [ ] Automation plays back correctly
- [ ] State saves to project
- [ ] State loads correctly on reopen
- [ ] Multiple instances work independently
- [ ] 2+ instances cause no issues
- [ ] Sample rate changes don't crash
- [ ] Buffer size changes don't crash

### Format-Specific Tests (VST3)
- [ ] VST3 parameter automation works
- [ ] VST3 state save/load works
- [ ] VST3 preset system works
- [ ] VST3 info page shows correct details

## Issue Severity Levels

### P0 - Critical (Production Blocker)
- Plugin crashes DAW
- No audio output
- UI fails to open
- Data loss (state not saved)
- Security vulnerability

### P1 - Important (Fix Before Release)
- Major feature broken (automation, presets)
- Performance degradation (CPU > 50%)
- Frequent minor crashes
- Memory leaks

### P2 - Nice to Have (Fix If Time)
- Minor UI glitches
- Inconvenient workarounds needed
- Edge case failures
- Documentation issues

### P3 - Cosmetic (Low Priority)
- Visual inconsistencies
- Minor text typos
- Non-standard behavior

## Test Matrix Template

| Plugin | Loading | UI | MIDI | Audio | Params | Presets | Automation | State | Multi | SRate | Buffer | Overall |
|--------|---------|-----|------|-------|--------|--------|------------|-------|-------|-------|--------|---------|
| NexSynth | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| KaneMarcoAether | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SamSampler | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| FilterGate | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Monument | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| FarFarAway | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| LocalGal | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| AetherGiantHorns | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| AetherGiantVoice | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| KaneMarcoAetherString | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

Legend:
- ✅ PASS - Works correctly
- ❌ FAIL - Critical failure
- ⚠️ PARTIAL - Works with limitations
- ⬜ NOT TESTED - Not yet tested

## Performance Benchmarks

For each plugin, measure:

### CPU Usage (at 512 buffer, 48kHz)
- Idle: __%
- 1 note: __%
- 10 notes: __%
- Polyphony max: __ notes before overload

### Memory Usage
- Initial load: __ MB
- Steady state: __ MB
- Memory leak test: __ MB after 10 min

### Latency
- Reported latency: __ samples
- Measured latency: __ samples

## Next Steps After Testing

1. **Document all results** in `results/` directory
2. **Update compatibility matrix** with findings
3. **Create issues** for any P0/P1 failures
4. **Verify fixes** for resolved issues
5. **Retest** after any code changes
6. **Update documentation** with workarounds

## Getting Help

If you encounter issues:
1. Check `reports/issues.md` for known problems
2. Check console logs for error messages
3. Test with simpler plugins first (e.g., Monument)
4. Verify DAW version compatibility
5. Check macOS version requirements

---

**Testing Timeline Estimate:**
- Plugin loading tests: ~30 minutes (10 plugins × 3 min)
- Basic functionality tests: ~2 hours (10 plugins × 12 min)
- Advanced feature tests: ~3 hours (10 plugins × 18 min)
- Documentation: ~1 hour

**Total: ~6 hours for complete manual testing**

**Last Updated:** 2026-01-15
**Status:** Ready for testing
