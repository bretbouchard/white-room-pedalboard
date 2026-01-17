# iOS AUv3 Plugin Status & Implementation Plan

**Date:** 2025-01-17
**Status:** Analysis Complete - 1 of 7 instruments have iOS AUv3 support

---

## Executive Summary

Only **1 of 7 instruments** currently has iOS AUv3 plugin support (localgal). The remaining 6 instruments (kane_marco, giant_instruments, drummachine, Nex_synth, Sam_sampler, choral) would benefit significantly from iOS AUv3 plugins for mobile music production.

---

## Current Status

### ✅ HAS iOS AUv3 Support

| Instrument | Location | Status | Features |
|------------|----------|--------|----------|
| **localgal** | `juce_backend/instruments/localgal/ios-auv3/` | ✅ Complete | Feel Vector controls, SwiftUI UI, MIDI support |

**localgal Features:**
- Feel Vector 5D control system
- SwiftUI interface with real-time visualization
- AUv3 extension with proper entitlements
- Minimal host app for distribution
- SharedDSP C++ library wrapper
- Complete documentation

### ❌ NO iOS Support

| Instrument | Type | Priority | Complexity |
|------------|------|----------|------------|
| **kane_marco** | Synthesizer | High | Medium |
| **giant_instruments** | Percussion/Drums | High | Medium |
| **drummachine** | Drum Machine | Medium | Low |
| **Nex_synth** | FM Synthesizer | Medium | Medium |
| **Sam_sampler** | Sampler (SF2) | Low | Low |
| **choral** | Effect Plugin | Medium | Medium |

---

## Instrument Analysis

### 1. kane_marco - Kane Marco Aether Synthesizer

**Type:** Polyphonic synthesizer with unique control surface

**Characteristics:**
- Based on Kane Marco's "Aether" concept
- Complex modulation matrix
- Rich parameter set
- Would benefit from mobile touch controls

**iOS AUv3 Requirements:**
- Parameter mapping (likely 50+ parameters)
- Multi-page UI (modulation matrix, oscillators, filters, envelopes)
- MIDI MPE support (if applicable)
- Preset management

**Complexity:** Medium (many parameters but standard synth architecture)

**Estimated Effort:** 2-3 days

---

### 2. giant_instruments - Giant Drums & Horns

**Type:** Percussion and brass instruments

**Characteristics:**
- Drum synthesis (no samples)
- Formant-based brass instruments
- Multiple sound engines
- Requires specialized UI for drum/pattern control

**iOS AUv3 Requirements:**
- Drum pad interface (trigger samples)
- Pattern sequencer UI
- Formant filter controls
- Multiple engine selection

**Complexity:** Medium (specialized UI but standard DSP)

**Estimated Effort:** 2-3 days

---

### 3. drummachine - White Room Drum Machine

**Type:** Drum machine with pattern sequencer

**Characteristics:**
- Drum synthesis (not samples)
- Pattern-based sequencing
- Step sequencer UI
- Swing and groove controls

**iOS AUv3 Requirements:**
- 16-step sequencer UI
- Drum pad triggers
- Pattern storage/recall
- Swing and shuffle controls

**Complexity:** Low-Medium (standard drum machine pattern)

**Estimated Effort:** 1-2 days

---

### 4. Nex_synth - FM Synthesizer

**Type:** FM synthesis with advanced modulation

**Characteristics:**
- Multi-operator FM synthesis
- Complex modulation routing
- Advanced algorithms
- Preset system

**iOS AUv3 Requirements:**
- Operator matrix UI (6x6 or similar)
- Algorithm selection
- Modulation routing display
- Preset browser

**Complexity:** Medium-High (FM synthesis is complex to visualize)

**Estimated Effort:** 3-4 days

---

### 5. Sam_sampler - SoundFont Sampler

**Type:** Sampler using SF2 files

**Characteristics:**
- Loads SoundFont files
- Multiple instruments in one SF2
- Basic ADSR envelope
- Low CPU usage

**iOS AUv3 Requirements:**
- SF2 file picker (iOS file access)
- Instrument selection dropdown
- Basic ADSR controls
- Simple, straightforward UI

**Complexity:** Low (sampler with minimal parameters)

**Estimated Effort:** 1 day

---

### 6. choral - Chorus Effect

**Type:** Audio effect plugin (not instrument)

**Characteristics:**
- Chorus modulation effect
- LFO controls (rate, depth, feedback)
- Delay parameters
- Mix control

**iOS AUv3 Requirements:**
- Effect AUv3 (different API than instrument)
- Simpler UI than instruments
- Wet/dry mix control
- LFO visualization

**Complexity:** Medium (effect plugins are simpler than instruments)

**Estimated Effort:** 1-2 days

**Note:** This is an EFFECT, so it should go in `juce_backend/effects/choral/ios-auv3/`

---

## Implementation Strategy

### Phase 1: Quick Wins (Low Complexity)

**Target:** Sam_sampler (1 day)

**Why:**
- Fewest parameters
- Simple UI requirements
- Can use localgal as template
- High impact (users love mobile samplers)

**UI Components Needed:**
- SF2 file picker
- Instrument dropdown
- ADSR envelope graph
- Basic volume control

---

### Phase 2: Medium Complexity (Medium Priority)

**Target:** drummachine (1-2 days)

**Why:**
- Standard drum machine pattern
- Fun mobile interface (pads + sequencer)
- Popular for mobile music production

**UI Components Needed:**
- 16-pad drum interface
- Step sequencer grid
- Pattern select/save/load
- Swing and shuffle controls

---

### Phase 3: Effects (Choral) (1-2 days)

**Target:** choral effect (1-2 days)

**Why:**
- Effect plugins are simpler than instruments
- Different AUv3 API (effect vs instrument)
- Useful for guitarists/bassists on mobile

**UI Components Needed:**
- Wet/dry mix control
- LFO rate/depth
- Delay time
- Feedback control

---

### Phase 4: Complex Synths (Medium Priority)

**Target:** kane_marco, giant_instruments (2-3 days each)

**Why:**
- More complex parameter sets
- Require specialized UI
- High value for producers

**UI Components Needed:**
- Tabbed interface (pages for different sections)
- Modulation matrix visualization
- Preset browser
- Keyboard/pitch wheel (optional)

---

### Phase 5: Advanced FM (Low Priority)

**Target:** Nex_synth (3-4 days)

**Why:**
- FM synthesis is complex to visualize
- Operator matrix is non-standard UI
- Advanced features require careful design

**UI Components Needed:**
- 6x6 operator matrix
- Algorithm selection grid
- Modulation routing display
- Advanced envelope editors

---

## Reusability Strategy

### 1. Create iOS AUv3 Template

Based on localgal implementation, extract:

**Common Components:**
- `AUAudioUnit` base class
- `AUViewController` template
- Parameter management system
- MIDI event handling
- Preset save/load system
- Build scripts and CMake templates

**Benefits:**
- Consistent code across all plugins
- Faster implementation
- Easier maintenance
- Unified UX

**Location:** `juce_backend/templates/ios-auv3-instrument/`

---

### 2. Shared UI Components

**SwiftUI Views:**
- KnobControl (for parameters)
- KeyboardWidget (for instruments)
- PadGrid (for drums/percussion)
- SequencerGrid (for patterns)
- PresetBrowser (for preset management)
- LFOWidget (for LFO controls)

**Location:** `swift_frontend/WhiteRoomiOS/Views/AUv3/`

---

### 3. Build Automation

**Scripts:**
- `create-ios-auv3.sh` - Generate new iOS AUv3 project
- `build-ios-all.sh` - Build all iOS plugins
- `test-ios-auv3.sh` - Test AUv3 plugins in simulator

**Location:** `infrastructure/scripts/ios-auv3/`

---

## Implementation Plan for Each Instrument

### Sam_sampler (Priority: HIGH)

**Week 1, Days 1-2**

**Day 1:**
- [ ] Create ios-auv3 directory structure
- [ ] Copy and adapt localgal template
- [ ] Implement SF2 file picker
- [ ] Create instrument browser UI
- [ ] Basic parameter controls (volume, pan)

**Day 2:**
- [ ] ADSR envelope graph
- [ ] Preset save/load
- [ ] MIDI channel selection
- [ ] Test with various SF2 files
- [ ] Documentation

**Deliverable:** Working iOS AUv3 sampler plugin

---

### drummachine (Priority: MEDIUM)

**Week 1, Days 3-4**

**Day 1:**
- [ ] Create ios-auv3 directory
- [ ] Design 16-pad drum interface
- [ ] Implement pad triggers with velocity
- [ ] Basic sound selection

**Day 2:**
- [ ] 16-step sequencer grid
- [ ] Pattern storage/recall
- [ ] Swing and shuffle controls
- [ ] BPM control
- [ ] Documentation

**Deliverable:** Working iOS AUv3 drum machine

---

### choral (Priority: MEDIUM)

**Week 2, Days 1-2**

**Day 1:**
- [ ] Create ios-auv3 directory in effects/choral/
- [ ] Adapt localgal template for EFFECT AUv3
- [ ] Wet/dry mix control
- [ ] LFO rate/depth

**Day 2:**
- [ ] Delay parameters
- [ ] Feedback control
- [ ] Effect bypass
- [ ] Preset management
- [ ] Documentation

**Deliverable:** Working iOS AUv3 chorus effect

---

### kane_marco (Priority: HIGH)

**Week 2-3**

**Days 1-2:** Core plugin
- [ ] Create ios-auv3 directory
- [ ] Implement basic parameter mapping
- [ ] Simple synth keyboard UI
- [ ] Oscillator controls

**Days 3-4:** Advanced features
- [ ] Modulation matrix UI
- [ ] Filter and envelope pages
- [ ] Preset browser
- [ ] Advanced controls

**Day 5:** Polish
- [ ] Testing and refinement
- [ ] Documentation
- [ ] Performance optimization

**Deliverable:** Working iOS AUv3 Kane Marco synth

---

### giant_instruments (Priority: HIGH)

**Week 3-4**

Similar structure to kane_marco but with:
- Drum pad interface (instead of keyboard)
- Formant filter controls
- Engine selection (drums vs horns)

---

### Nex_synth (Priority: LOW)

**Week 5+**

**Days 1-2:** Basic FM
- [ ] Create ios-auv3 directory
- [ ] Simple FM controls
- [ ] Basic operators

**Days 3-4:** Operator Matrix
- [ ] 6x6 operator grid UI
- [ ] Connection visualization
- [ ] Algorithm selection

**Days 5+:** Advanced Features
- [ ] Advanced envelopes
- [ ] Modulation routing
- [ ] Preset system
- [ ] Testing and refinement

**Deliverable:** Working iOS AUv3 FM synth

---

## Build & Integration Plan

### 1. Update .gitmodules

Each instrument's iOS plugin should be part of the instrument's repository:

```gitmodules
[submodule "juce_backend/instruments/sam_sampler"]
  path = juce_backend/instruments/sam_sampler
  url = https://github.com/bretbouchard/white-room-sam-sampler.git
  branch = main
```

### 2. CI/CD Integration

**GitHub Actions workflow:**
```yaml
name: Build iOS AUv3 Plugins

on: [push, pull_request]

jobs:
  build-ios-plugins:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive
      - name: Build Sam Sampler iOS
        run: |
          cd juce_backend/instruments/sam_sampler/ios-auv3
          ./build.sh --simulator
      - name: Build Drum Machine iOS
        run: |
          cd juce_backend/instruments/drummachine/ios-auv3
          ./build.sh --simulator
      # ... etc
```

### 3. Testing Strategy

**Unit Tests:**
- Parameter changes propagate to DSP
- MIDI events are handled correctly
- Preset save/load works

**Integration Tests:**
- Load in GarageBand (macOS)
- Load in Logic Pro (macOS)
- Load in AUM (iOS)
- Test on actual iOS device

**Manual Testing Checklist:**
- [ ] Plugin loads in host
- [ ] Audio output works
- [ ] MIDI input works
- [ ] Parameters respond to UI changes
- [ ] Presets save/load correctly
- [ ] No crashes or glitches
- [ ] CPU usage is reasonable

---

## Resource Requirements

### Development Resources

**iOS Development:**
- Mac with Xcode 14+
- iOS 15+ SDK
- AUv3 SDK
- Test devices (iPhone/iPad)

**Time Estimates:**
- Sam_sampler: 1 day
- drummachine: 2 days
- choral: 2 days
- kane_marco: 5 days
- giant_instruments: 5 days
- Nex_synth: 7 days

**Total:** 22 days (~4-5 weeks of focused development)

### Dependencies

**External:**
- Apple AUv3 SDK
- iOS SDK
- Xcode command line tools

**Internal:**
- LocalGal AUv3 (as template)
- Instrument DSP code (already exists)
- Swift UI components (to be created)

---

## Success Criteria

### For Each Instrument

**Must Have:**
- ✅ Loads in iOS AUv3 host (GarageBand, AUM, etc.)
- ✅ Produces audio output without crashes
- ✅ All parameters accessible via UI
- ✅ MIDI note on/off works
- ✅ Preset save/load functional
- ✅ Passes AU validation

**Should Have:**
- ✅ Intuitive UI optimized for touch
- ✅ Real-time parameter feedback
- ✅ Low CPU usage (< 20% on modern devices)
- ✅ Supports iOS 15+ (arm64 + simulator)

**Nice to Have:**
- ✅ Core MIDI support
- ✅ Inter-app audio
- ✅ Ableton Link support
- ✅ MIDI MPE
- ✅ Audiobus support

---

## Next Steps

### Immediate Actions

1. ✅ **Create iOS AUv3 template** from localgal
2. **Implement Sam_sampler** (quick win, high value)
3. **Implement choral effect** (quick win, guitarists love it)
4. **Iterate on remaining instruments**

### Long-term Actions

1. **Build shared UI component library**
2. **Create automated build/test system**
3. **Document best practices**
4. **Community feedback and iteration**

---

## Conclusion

**Current State:** 1 of 7 instruments have iOS support (14%)

**Target State:** All 7 instruments have iOS AUv3 plugins (100%)

**Investment:** 22-30 days of focused development

**ROI:** High - Mobile music production is huge, and having iOS plugins makes White Room accessible to millions of iOS musicians worldwide.

---

**Status:** ✅ Analysis Complete - Ready to Implement
**Recommendation:** Start with Sam_sampler (quick win) → choral (quick win) → drummachine (medium) → others

