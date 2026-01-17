# Effects iOS AUv3 Status & Implementation Plan

## Current Status Overview

### ✅ Completed iOS AUv3 Effects (2/13)

1. **AetherDrive** ✅
   - Type: Guitar distortion/saturation pedal
   - Parameters: 9 (Drive, Bass, Mid, Treble, Body Resonance, Resonance Decay, Mix, Output Level, Cabinet Sim)
   - Location: `juce_backend/effects/AetherDrive/ios-auv3/`
   - Status: Complete, awaiting Xcode project creation

2. **biPhase** ✅
   - Type: Dual 6-stage phaser (Mu-Tron Bi-Phase emulation)
   - Parameters: 13 (Rate A/B, Depth A/B, Feedback A/B, Shape A/B, Source A/B, Routing Mode, Sweep Sync, Mix)
   - Location: `juce_backend/effects/biPhase/ios-auv3/`
   - Status: Complete, awaiting Xcode project creation

### ❌ Effects Missing iOS AUv3 (11/13)

## Effects Requiring iOS AUv3 Implementation

### Category 1: Individual Pedal Plugins ( pedals/ submodule)

These are individual guitar pedal effects that share the `pedals/` DSP library:

#### 1. **Overdrive** 🎯 HIGH PRIORITY
- **DSP File**: `pedals/include/dsp/OverdrivePedalPureDSP.h`
- **Type**: Overdrive/distortion pedal
- **Estimated Parameters**: 5-8 (Drive, Tone, Level, maybe Tone controls)
- **Complexity**: LOW (simple pedal, similar to AetherDrive but simpler)
- **Time Estimate**: 1 day
- **Business Value**: High (most common guitar effect)

#### 2. **Fuzz** 🎯 HIGH PRIORITY
- **DSP File**: `pedals/include/dsp/FuzzPedalPureDSP.h`
- **Type**: Fuzz distortion pedal
- **Estimated Parameters**: 5-8 (Fuzz, Tone, Level, maybe Bias)
- **Complexity**: LOW (simple pedal)
- **Time Estimate**: 1 day
- **Business Value**: High (classic guitar effect)

#### 3. **Chorus** ⏳ WAITING FOR V2
- **DSP File**: `pedals/include/dsp/ChorusPedalPureDSP.h`
- **Type**: Chorus effect
- **Estimated Parameters**: 6-10 (Rate, Depth, Mix, Tone, maybe Voice count)
- **Complexity**: LOW-MEDIUM
- **Time Estimate**: 1-2 days
- **Status**: User mentioned "choral is doing work on its own so wait until v2 is completed"
- **Note**: This is likely the "choral" effect mentioned

#### 4. **Delay** 🎯 MEDIUM PRIORITY
- **DSP File**: `pedals/include/dsp/DelayPedalPureDSP.h`
- **Type**: Delay effect
- **Estimated Parameters**: 8-12 (Time, Feedback, Mix, Filter, maybe Modulation)
- **Complexity**: MEDIUM (delay line handling, tap tempo)
- **Time Estimate**: 1-2 days
- **Business Value**: High (essential guitar effect)

#### 5. **Reverb** 🎯 MEDIUM PRIORITY
- **DSP File**: `pedals/include/dsp/ReverbPedalPureDSP.h`
- **Type**: Reverb effect
- **Estimated Parameters**: 8-15 (Decay, Pre-delay, Mix, Tone, Room Size, maybe Density)
- **Complexity**: MEDIUM (reverb algorithms)
- **Time Estimate**: 2-3 days
- **Business Value**: High (essential for guitarists)

#### 6. **Compressor** 🎯 LOW PRIORITY
- **DSP File**: `pedals/include/dsp/CompressorPedalPureDSP.h`
- **Type**: Compressor pedal
- **Estimated Parameters**: 6-10 (Threshold, Ratio, Attack, Release, Makeup Gain, maybe Blend)
- **Complexity**: MEDIUM (compression envelope detection)
- **Time Estimate**: 1-2 days
- **Business Value**: Medium (utility effect)

#### 7. **EQ** 🎯 LOW PRIORITY
- **DSP File**: `pedals/include/dsp/EQPedalPureDSP.h`
- **Type**: Equalizer pedal
- **Estimated Parameters**: 8-12 (Bass, Mid, Treble, maybe semi-parametric mids)
- **Complexity**: LOW (simple filters)
- **Time Estimate**: 1 day
- **Business Value**: Medium (utility effect)

#### 8. **Noise Gate** 🎯 LOW PRIORITY
- **DSP File**: `pedals/include/dsp/NoiseGatePureDSP.h`
- **Type**: Noise gate pedal
- **Estimated Parameters**: 4-6 (Threshold, Attack, Release, maybe Hysteresis)
- **Complexity**: LOW (gate algorithm)
- **Time Estimate**: 1 day
- **Business Value**: Low (utility effect)

#### 9. **Volume** 🎯 LOW PRIORITY
- **DSP File**: `pedals/include/dsp/VolumePedalPureDSP.h`
- **Type**: Volume pedal
- **Estimated Parameters**: 1-3 (Level, maybe Min/Max)
- **Complexity**: VERY LOW (just volume control)
- **Time Estimate**: 0.5 day
- **Business Value**: Low (simple utility)

### Category 2: Standalone Effects (not in pedals/)

#### 10. **dynamics** ❓ NEEDS INVESTIGATION
- **Location**: `juce_backend/effects/dynamics/`
- **Type**: Unknown (needs investigation)
- **Status**: Need to check DSP files to understand what this effect does
- **Priority**: UNKNOWN (depends on what it is)

#### 11. **farfaraway** ❓ NEEDS INVESTIGATION
- **Location**: `juce_backend/effects/farfaraway/`
- **Type**: Unknown (needs investigation)
- **Status**: Need to check DSP files to understand what this effect does
- **Priority**: UNKNOWN (depends on what it is)

#### 12. **filtergate** ❓ NEEDS INVESTIGATION
- **Location**: `juce_backend/effects/filtergate/`
- **Type**: Unknown (needs investigation)
- **Status**: Need to check DSP files to understand what this effect does
- **Priority**: UNKNOWN (depends on what it is)

#### 13. **monument** ❓ NEEDS INVESTIGATION
- **Location**: `juce_backend/effects/monument/`
- **Type**: Unknown (needs investigation)
- **Status**: Need to check DSP files to understand what this effect does
- **Priority**: UNKNOWN (depends on what it is)

### Category 3: Special Cases

#### **pedalboard** 🎛️ UNIQUE
- **Location**: `juce_backend/effects/pedalboard/`
- **Type**: Modular pedalboard system (hosts multiple pedals)
- **DSP**: `PedalboardPureDSP` with reconfigurable pedal chain
- **Parameters**: Global + per-pedal (mix, gain, bypass) + pedal selection
- **Complexity**: VERY HIGH (needs UI for adding/removing/reordering pedals)
- **Time Estimate**: 7-10 days
- **Priority**: LOW (can use individual pedals instead)
- **Note**: This is a meta-plugin that hosts the individual pedals
- **Implementation Strategy**: Should be done LAST after all individual pedals have iOS AUv3

#### **overdrive_pedal** 🔄 DUPLICATE
- **Location**: `juce_backend/effects/overdrive_pedal/`
- **Type**: Overdrive pedal plugin wrapper
- **Note**: This appears to be a plugin wrapper that uses `pedals/include/dsp/OverdrivePedalPureDSP.h`
- **Status**: Likely DUPLICATE of Overdrive in pedals/ submodule
- **Action Needed**: Investigate if this is different from the Overdrive in pedals/

---

## Implementation Priority Matrix

### Phase 1: Quick Wins (1 day each) ✅
**Total Time: 3 days**

1. ✅ **Volume** (0.5 day) - Simplest, warm up
2. ✅ **Noise Gate** (1 day) - Simple gate
3. ✅ **EQ** (1 day) - Simple filters
4. ✅ **Overdrive** (1 day) - Similar to AetherDrive

**Benefits**: Quick iOS AUv3 coverage boost, establishes patterns

### Phase 2: Essential Effects (1-2 days each) 🎯
**Total Time: 5-8 days**

5. 🎯 **Fuzz** (1 day) - High demand
6. 🎯 **Delay** (1-2 days) - Essential guitar effect
7. 🎯 **Reverb** (2-3 days) - Essential guitar effect

**Benefits**: Covers most common guitar effects, complete guitar rig on iOS

### Phase 3: Utility Effects (1-2 days each) 🔧
**Total Time: 2-4 days**

8. 🔧 **Compressor** (1-2 days) - Utility effect
9. ⏳ **Chorus** (1-2 days) - WAIT FOR V2 as requested

**Benefits**: Complete utility coverage

### Phase 4: Investigation & Unknown Effects (2-3 days each) ❓
**Total Time: 8-12 days (if needed)**

10. ❓ **dynamics** (2-3 days) - Needs investigation first
11. ❓ **farfaraway** (2-3 days) - Needs investigation first
12. ❓ **filtergate** (2-3 days) - Needs investigation first
13. ❓ **monument** (2-3 days) - Needs investigation first

**Action Required**: Check DSP files to understand what these effects do

### Phase 5: Complex Meta-Plugin (7-10 days) 🎛️
**Total Time: 7-10 days**

14. 🎛️ **pedalboard** (7-10 days) - Modular pedalboard system

**Benefits**: Complete pedalboard experience on iOS, but complex UI

---

## Summary Statistics

### Current Coverage
- **Effects with iOS AUv3**: 2/13 = **15%**
- **Effects needing iOS AUv3**: 11/13 = **85%**

### Total Implementation Effort
- **Quick Wins**: 3 days (4 effects)
- **Essential**: 5-8 days (3 effects)
- **Utility**: 2-4 days (2 effects, 1 waiting for v2)
- **Unknown**: 8-12 days (4 effects, need investigation)
- **Complex**: 7-10 days (1 meta-plugin)

**Total Estimated Time**: 25-37 days for all 13 effects

---

## Recommended Implementation Order

### Option 1: Coverage-First (Recommended) ⭐
**Goal**: Get iOS AUv3 for all common guitar effects quickly

1. Phase 1 (3 days): Volume, Noise Gate, EQ, Overdrive
2. Phase 2 (5-8 days): Fuzz, Delay, Reverb
3. Phase 3 (2-4 days): Compressor, Chorus (when v2 ready)

**Result**: 9 effects with iOS AUv3 in 10-15 days

### Option 2: Quality-First
**Goal**: Focus on most popular effects first

1. AetherDrive ✅ (done)
2. biPhase ✅ (done)
3. Overdrive (1 day)
4. Fuzz (1 day)
5. Delay (1-2 days)
6. Reverb (2-3 days)
7. Chorus (when v2 ready)

**Result**: 7 effects with iOS AUv3 in 5-8 days

### Option 3: All-Effects
**Goal**: Complete coverage of all effects

Implement all 11 remaining effects in priority order

**Result**: 13 effects with iOS AUv3 in 25-37 days

---

## Key Differences: Instrument vs Effect AUv3

### Critical Implementation Differences

| Aspect | Instrument (aumu) | Effect (aufx) |
|--------|------------------|---------------|
| **Component Type** | `aumu` | `aufx` |
| **Audio Input** | None (MIDI only) | Stereo/Mono input |
| **Audio Output** | Stereo output | Stereo/Mono output |
| **MIDI Handling** | Note on/off, pitch bend | Usually none |
| **UI Complexity** | High (keyboard, controls) | Lower (effect controls) |
| **Wet/Dry Mix** | Not applicable | Essential parameter |

### Effect-Specific Considerations

1. **Wet/Dry Mix**: Effects MUST have a mix parameter (0.0 = dry, 1.0 = wet)
2. **Input Processing**: Effects process input buffers, instruments generate from scratch
3. **No MIDI**: Most effects don't handle MIDI (except tempo sync, bypass CC)
4. **Simpler UI**: Effects typically have fewer controls than instruments
5. **Latency**: Effects may have tail time (reverb, delay) - must report correctly

---

## Technical Implementation Notes

### DSP Architecture for Pedals

All pedals in the `pedals/` submodule share a common architecture:

```cpp
// Base class for all pedals
class GuitarPedalPureDSP {
public:
    virtual void processBlock(float* buffer, int numSamples) = 0;
    virtual void setParameter(int index, float value) = 0;
    virtual float getParameter(int index) const = 0;
    virtual int getNumParameters() const = 0;
};

// Example: Overdrive
class OverdrivePedalPureDSP : public GuitarPedalPureDSP {
public:
    enum Parameters {
        Drive = 0,
        Tone,
        Level,
        NumParameters
    };

    void processBlock(float* buffer, int numSamples) override;
    void setParameter(int index, float value) override;
    // ...
};
```

### iOS AUv3 Implementation Template (Effects)

Based on AetherDrive and biPhase implementations:

```
[EffectName]/
├── ios-auv3/
│   ├── [EffectName]PluginApp/           # Host container
│   │   ├── AppDelegate.swift
│   │   ├── ViewController.swift
│   │   └── Info.plist
│   ├── [EffectName]PluginExtension/     # AUv3 extension (aufx)
│   │   ├── AudioUnit.swift              # Main AUv3 effect
│   │   ├── AudioUnitViewController.swift  # SwiftUI UI
│   │   ├── ParameterBridge.swift        # Swift ↔ C++ bridge
│   │   ├── Info.plist                   # Component type: aufx
│   │   └── [EffectName]PluginExtension.entitlements
│   ├── SharedDSP/                        # C++ static library
│   │   ├── [EffectName]DSP.h            # C interface
│   │   ├── [EffectName]DSP.cpp          # C++ wrapper
│   │   └── CMakeLists.txt
│   ├── build.sh                          # Build script
│   ├── README.md                         # Documentation
│   └── IMPLEMENTATION_SUMMARY.md
```

---

## Next Steps

### Immediate Actions Required

1. **Investigate Unknown Effects** (1-2 hours)
   - Check DSP files for: dynamics, farfaraway, filtergate, monument
   - Determine what they do
   - Estimate complexity and priority

2. **Resolve Overdrive Duplication** (30 minutes)
   - Check if `overdrive_pedal/` is different from `Overdrive` in pedals/
   - Determine if both need iOS AUv3 or just one

3. **Choose Implementation Priority** (user decision)
   - Option 1: Coverage-First (recommended)
   - Option 2: Quality-First
   - Option 3: All-Effects

4. **Begin Implementation** (parallel agents)
   - Use 2 parallel agents (same as instruments)
   - Start with Phase 1 quick wins
   - Keep agents working until all effects are complete

---

## Conclusion

**Current Status**: 2/13 effects have iOS AUv3 (15% coverage)

**To Reach 100%**: Implement 11 more effects

**Recommended Approach**:
1. Start with Phase 1 quick wins (Volume, Noise Gate, EQ, Overdrive)
2. Move to Phase 2 essentials (Fuzz, Delay, Reverb)
3. Complete Phase 3 utilities (Compressor, Chorus when v2 ready)
4. Investigate unknown effects (dynamics, farfaraway, filtergate, monument)
5. Consider pedalboard meta-plugin (complex, optional)

**Total Time Estimate**: 10-15 days for common effects, 25-37 days for all effects

**Key Success Factor**: Use parallel agents (2 at a time) to maximize speed, just like we did for instruments!
