# Synth & Effect Standardization Plan

**Date:** 2025-01-08
**Author:** Claude Code
**Status:** Ready for Implementation

---

## Executive Summary

This document outlines the standardization of all Schillinger synths and effects, including:
1. **MPE & Microtonal integration** for all applicable instruments
2. **Unified build/output structure** for DSP/VST/AU delivery
3. **Formalized user workflow** (no exploring build folders)
4. **Updated documentation** system

---

## Part 1: MPE & Microtonal Integration Strategy

### Philosophy (Based on User Guidance)

✅ **MPE as universal input layer** - All instruments can accept MPE
✅ **Selective consumption** - Each instrument decides what to use
✅ **Gesture-based mapping** - MPE → Internal parameters
✅ **Not a mandate** - Expression as a choice, not a requirement

### Instrument Categorization

#### **Full MPE Support** ✅
*Instruments that benefit from per-note articulation*

| Instrument | MPE Level | Rationale |
|------------|-----------|-----------|
| KaneMarco Aether (Strings) | ✅ Full | Physical modeling strings, per-note bow force, contact point |
| KaneMarco Aether String | ✅ Full | Same as above, dedicated string synth |
| KaneMarco (VA) | ✅ Full | Virtual analog, per-note filter/amp/pitch modulation |
| NexSynth (FM) | 🟡 Preset-based | FM synthesis, some patches benefit, others don't |
| **Giant Instruments** | ✅ Full | All giant instruments already have full MPE |

**MPE Mapping for Full MPE Instruments:**
```cpp
MPEGestureMapping {
    pressureToForce = 1.0f;        // Filter cutoff, oscillator mod, or excitation
    timbreToSpeed = 0.5f;          // LFO speed, envelope time, or articulation
    pitchBendToRoughness = 0.3f;   // Detune, FM depth, or texture
    pressureSmoothing = 0.02f;
    timbreSmoothing = 0.02f;
    pitchBendSmoothing = 0.01f;
};
```

#### **Partial MPE Support** 🟡
*Instruments that benefit from gesture control but not melodic MPE*

| Instrument | MPE Level | Rationale |
|------------|-----------|-----------|
| LOCAL_GAL (Acid) | 🟡 Partial | Acid synth, per-note accent/glide but not full expression |
| DrumMachine | 🟡 Partial | Per-drum articulation, pitch bend limited to toms |
| **Giant Drums** | 🟡 Partial | Strike force, stick hardness (already implemented) |
| **Giant Percussion** | 🟡 Partial | Strike energy, strike location (already implemented) |

**MPE Mapping for Partial MPE Instruments:**
```cpp
MPEGestureMapping {
    pressureToForce = 0.8f;        // Strike velocity, accent amount
    timbreToContactArea = 0.5f;    // Brightness, decay time
    pitchBendToRoughness = 0.1f;   // Minimal (mostly for toms/tuned drums)
    pressureSmoothing = 0.01f;     // Faster response for drums
    timbreSmoothing = 0.01f;
    pitchBendSmoothing = 0.005f;
};
```

#### **MPE-Lite Support** 🟠
*Instruments where MPE has limited utility*

| Instrument | MPE Level | Rationale |
|------------|-----------|-----------|
| SamSampler | 🟠 Lite | Samples are baked, MPE for filter/amp only |
| FilterGate (effect) | ❌ None | It's an effect, not an instrument |

**MPE-Lite Mapping:**
```cpp
MPEGestureMapping {
    pressureToForce = 0.5f;        // Filter cutoff or amp
    timbreToSpeed = 0.0f;          // Not used
    pitchBendToRoughness = 0.0f;   // Not used (samples have fixed pitch)
    pressureSmoothing = 0.01f;
};
```

### Microtonal Tuning Strategy

**Universal Support** - ALL melodic instruments get microtonal tuning

| Instrument | Microtonal | Recommended Scales |
|------------|------------|-------------------|
| KaneMarco Aether | ✅ Yes | JI, Meantone, Pythagorean (historical strings) |
| KaneMarco Aether String | ✅ Yes | JI, Meantone, Pythagorean |
| KaneMarco (VA) | ✅ Yes | All temperaments, experimental scales |
| NexSynth (FM) | ✅ Yes | Experimental, Bohlen-Pierce, spectral |
| LOCAL_GAL (Acid) | ✅ Yes | 12-TET, 19-TET, quarter tones |
| SamSampler | ✅ Yes | 12-TET (user can map samples to other scales) |
| DrumMachine | ✅ Yes | Tuned percussion scales |
| **Giant Instruments** | ✅ Yes | Already implemented (30+ scales) |

### Implementation Approach

#### **Step 1: Enhance BaseInstrumentProcessor Template**

Add MPE and microtonal support to `include/plugin_templates/BaseInstrumentProcessor.h`:

```cpp
class BaseInstrumentProcessor : public juce::AudioProcessor {
protected:
    // MPE Support (optional, can be enabled per instrument)
    std::unique_ptr<MPEUniversalSupport> mpeSupport_;
    bool mpeEnabled_ = false;

    // Microtonal Support (optional, can be enabled per instrument)
    std::unique_ptr<MicrotonalTuningManager> tuningManager_;
    bool microtonalEnabled_ = false;

public:
    // Enable MPE (call in constructor if instrument supports MPE)
    void enableMPE(const MPEGestureMapping& mapping = MPEGestureMapping());

    // Enable microtonal tuning (call in constructor if instrument supports it)
    void enableMicrotonal();

    // Get gesture values for a note (call from your voice handling)
    MPENoteState::GestureValues getMPEGestures(int noteNumber, int midiChannel);

    // Convert MIDI to frequency with microtonal tuning
    float midiToFrequency(int midiNote);
};
```

#### **Step 2: Per-Instrument Integration**

For each instrument, add support in their plugin processor:

```cpp
// Example: LOCAL_GAL Plugin Processor
class LOCAL_GALPluginProcessor : public BaseInstrumentProcessor {
public:
    LOCAL_GALPluginProcessor()
        : BaseInstrumentProcessor(/* ... */)
    {
        // Enable MPE (partial support for acid synth)
        MPEGestureMapping acidMapping;
        acidMapping.pressureToForce = 0.8f;      // Accent amount
        acidMapping.timbreToContactArea = 0.5f;   // Filter brightness
        acidMapping.pitchBendToRoughness = 0.1f;  // Glide/subtle pitch
        enableMPE(acidMapping);

        // Enable microtonal tuning
        enableMicrotonal();
    }
};
```

---

## Part 2: Unified Build & Output Structure

### Current State Analysis

**Current Output Location:**
```
plugins/build_new/
├── LOCAL_GAL_artefacts/Release/{AU,VST3}/
├── SamSampler_artefacts/Release/{AU,VST3}/
├── NexSynth_artefacts/Release/{AU,VST3}/
├── KaneMarco_artefacts/Release/{AU,VST3}/
├── KaneMarcoAether_artefacts/Release/{AU,VST3}/
├── KaneMarcoAetherString_artefacts/Release/{AU,VST3}/
├── DrumMachine_artefacts/Release/{AU,VST3}/
└── FilterGate_artefacts/Release/{AU,VST3}/
```

**Problems:**
- ❌ Users have to explore build folders
- ❌ No standardized installation location
- ❌ No "user-friendly" distribution method
- ❌ Separate folders for each plugin

### Proposed Structure

#### **Option A: Unified Release Folder (RECOMMENDED)**

```
instrument_juce/
├── Release/                          ← User-facing release folder
│   ├── VST3/
│   │   ├── LOCAL_GAL.vst3/
│   │   ├── SamSampler.vst3/
│   │   ├── NexSynth.vst3/
│   │   ├── KaneMarco.vst3/
│   │   ├── KaneMarcoAether.vst3/
│   │   ├── KaneMarcoAetherString.vst3/
│   │   ├── DrumMachine.vst3/
│   │   ├── FilterGate.vst3/
│   │   └── GiantInstruments.vst3/   ← All 5 giants in one plugin
│   ├── AU/
│   │   ├── LOCAL_GAL.component/
│   │   ├── SamSampler.component/
│   │   ├── NexSynth.component/
│   │   ├── KaneMarco.component/
│   │   ├── KaneMarcoAether.component/
│   │   ├── KaneMarcoAetherString.component/
│   │   ├── DrumMachine.component/
│   │   ├── FilterGate.component/
│   │   └── GiantInstruments.component/
│   ├── DSP_Libraries/                ← For DSP-only usage
│   │   ├── libLOCAL_GAL_DSP.dylib
│   │   ├── libSamSampler_DSP.dylib
│   │   ├── libNexSynth_DSP.dylib
│   │   ├── libKaneMarco_DSP.dylib
│   │   ├── libKaneMarcoAether_DSP.dylib
│   │   ├── libKaneMarcoAetherString_DSP.dylib
│   │   ├── libDrumMachine_DSP.dylib
│   │   ├── libFilterGate_DSP.dylib
│   │   └── libGiantInstruments_DSP.dylib
│   ├── Presets/                      ← Organized presets
│   │   ├── LOCAL_GAL/
│   │   ├── SamSampler/
│   │   ├── NexSynth/
│   │   ├── KaneMarco/
│   │   ├── KaneMarcoAether/
│   │   ├── KaneMarcoAetherString/
│   │   ├── DrumMachine/
│   │   ├── FilterGate/
│   │   └── GiantInstruments/
│   │       ├── GiantStrings/
│   │       ├── GiantDrums/
│   │       ├── GiantVoice/
│   │       ├── GiantHorns/
│   │       └── GiantPercussion/
│   ├── Documentation/
│   │   ├── User_Guide.pdf
│   │   ├── MPE_Guide.pdf
│   │   ├── Microtonal_Guide.pdf
│   │   └── README.txt
│   └── Install Scripts/
│       ├── install_vst3.sh          ← Installs VST3 to system folders
│       ├── install_au.sh            ← Installs AU to system folders
│       └── install_all.sh           ← Installs everything
│
├── plugins/                          ← Developer build folder (hidden from users)
│   └── build_new/
│       └── [artefacts folders...]
│
└── build/                           ← Legacy build folder (hidden)
    └── [...]
```

#### **Installation Script (`install_all.sh`)**

```bash
#!/bin/bash
# Schillinger Instrument Plugin Installer
# This script installs all plugins to standard system locations

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RELEASE_DIR="$SCRIPT_DIR/Release"

echo "🎛️  Schillinger Instrument Plugin Installer"
echo "=========================================="
echo ""

# Check if running as root (for AU installation to /Library/Audio)
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script requires root privileges for AU installation"
   echo "   You may be prompted for your password."
   echo ""
fi

# Function to install VST3
install_vst3() {
    echo "📦 Installing VST3 plugins..."

    local VST3_DIR="$HOME/Library/Audio/Plug-Ins/VST3"
    mkdir -p "$VST3_DIR"

    for plugin in "$RELEASE_DIR/VST3/"*.vst3; do
        if [ -d "$plugin" ]; then
            plugin_name=$(basename "$plugin")
            echo "   Installing $plugin_name..."
            rm -rf "$VST3_DIR/$plugin_name"
            cp -R "$plugin" "$VST3_DIR/"
        fi
    done

    echo "   ✅ VST3 plugins installed to $VST3_DIR"
    echo ""
}

# Function to install AU
install_au() {
    echo "📦 Installing AU plugins..."

    local AU_DIR="/Library/Audio/Plug-Ins/Components"
    mkdir -p "$AU_DIR"

    for plugin in "$RELEASE_DIR/AU/"*.component; do
        if [ -d "$plugin" ]; then
            plugin_name=$(basename "$plugin")
            echo "   Installing $plugin_name..."
            rm -rf "$AU_DIR/$plugin_name"
            cp -R "$plugin" "$AU_DIR/"
        fi
    done

    echo "   ✅ AU plugins installed to $AU_DIR"
    echo ""
}

# Function to install presets
install_presets() {
    echo "📦 Installing presets..."

    local PRESETS_DIR="$HOME/Documents/Schillinger/Presets"
    mkdir -p "$PRESETS_DIR"

    if [ -d "$RELEASE_DIR/Presets" ]; then
        cp -R "$RELEASE_DIR/Presets/"* "$PRESETS_DIR/"
        echo "   ✅ Presets installed to $PRESETS_DIR"
    fi
    echo ""
}

# Main installation
read -p "Install VST3 plugins? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    install_vst3
fi

read -p "Install AU plugins? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    install_au
fi

read -p "Install presets? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    install_presets
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Note: You may need to restart your DAW to see the new plugins."
echo "      AU plugins may require you to restart your computer."
```

---

## Part 3: Formalized User Workflow

### User Experience Goals

1. **No exploring build folders** - Users never see `build_new/` or artefacts
2. **One-click installation** - Single script to install everything
3. **Clear documentation** - User guides for MPE, microtonal, etc.
4. **Organized presets** - Presets in standard user Documents folder

### Build Workflow for Developers

```bash
# 1. Build all plugins
cd /Users/bretbouchard/apps/schill/instrument_juce/plugins/build_new
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j8

# 2. Copy Release folder structure
cd /Users/bretbouchard/apps/schill/instrument_juce
./scripts/prepare_release.sh

# 3. Test installation (optional)
sudo ./Release/install_all.sh

# 4. Create distribution package (optional)
./scripts/create_dmg.sh  # macOS
```

### Release Preparation Script (`prepare_release.sh`)

```bash
#!/bin/bash
# Prepare Release folder from build artefacts

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$SCRIPT_DIR/plugins/build_new"
RELEASE_DIR="$SCRIPT_DIR/Release"

echo "📦 Preparing Release folder..."
echo ""

# Create Release folder structure
mkdir -p "$RELEASE_DIR"/{VST3,AU,DSP_Libraries,Presets,Documentation,"Install Scripts"}

# Copy VST3 plugins
echo "Copying VST3 plugins..."
for artefact_dir in "$BUILD_DIR"/*_artefacts; do
    plugin_name=$(basename "$artefact_dir" | sed 's/_artefacts//')
    vst3_path="$artefact_dir/Release/VST3/$plugin_name.vst3"

    if [ -d "$vst3_path" ]; then
        echo "   $plugin_name"
        rm -rf "$RELEASE_DIR/VST3/$plugin_name.vst3"
        cp -R "$vst3_path" "$RELEASE_DIR/VST3/"
    fi
done

# Copy AU plugins
echo "Copying AU plugins..."
for artefact_dir in "$BUILD_DIR"/*_artefacts; do
    plugin_name=$(basename "$artefact_dir" | sed 's/_artefacts//')
    au_path="$artefact_dir/Release/AU/$plugin_name.component"

    if [ -d "$au_path" ]; then
        echo "   $plugin_name"
        rm -rf "$RELEASE_DIR/AU/$plugin_name.component"
        cp -R "$au_path" "$RELEASE_DIR/AU/"
    fi
done

# Copy presets
echo "Copying presets..."
for preset_folder in "$SCRIPT_DIR"/presets/*; do
    if [ -d "$preset_folder" ]; then
        plugin_name=$(basename "$preset_folder")
        echo "   $plugin_name"
        rm -rf "$RELEASE_DIR/Presets/$plugin_name"
        cp -R "$preset_folder" "$RELEASE_DIR/Presets/"
    fi
done

# Copy documentation
echo "Copying documentation..."
cp "$SCRIPT_DIR/docs"/User_Guide/*.pdf "$RELEASE_DIR/Documentation/" 2>/dev/null || true
cp "$SCRIPT_DIR/docs"/README.txt "$RELEASE_DIR/Documentation/" 2>/dev/null || true

# Copy install scripts
cp "$SCRIPT_DIR/scripts"/install_*.sh "$RELEASE_DIR/install_scripts/"

echo ""
echo "✅ Release folder prepared at $RELEASE_DIR"
```

---

## Part 4: Documentation System

### Documentation Structure

```
instrument_juce/docs/
├── User_Guide/
│   ├── README.txt                   ← Main user guide
│   ├── Installation_Guide.md        ← How to install plugins
│   ├── Quick_Start_Guide.md         ← Get started quickly
│   └── Instrument_Overview.md       ├── All instruments overview
│
├── MPE_Guide/
│   ├── MPE_Introduction.md         ← What is MPE?
│   ├── MPE_Per_Instrument.md       ← MPE behavior per instrument
│   ├── MPE_Controllers.md          ← Compatible MPE controllers
│   └── MPE_Examples.md             ← Usage examples
│
├── Microtonal_Guide/
│   ├── Microtonal_Introduction.md  ← What is microtonal?
│   ├── Supported_Scales.md         ← List of 30+ built-in scales
│   ├── Scala_Files.md              ← How to use .scl files
│   └── Scale_Per_Instrument.md     ← Recommended scales per instrument
│
├── Developer_Guide/
│   ├── Build_System.md             ← How to build
│   ├── Adding_MPE.md               ← How to add MPE to instruments
│   ├── Adding_Microtonal.md        ← How to add microtonal
│   └── Creating_Presets.md         ← Preset creation guide
│
└── Instrument_Specific/
    ├── LOCAL_GAL.md
    ├── SamSampler.md
    ├── NexSynth.md
    ├── KaneMarco.md
    ├── KaneMarcoAether.md
    ├── KaneMarcoAetherString.md
    ├── DrumMachine.md
    ├── FilterGate.md
    └── GiantInstruments.md
```

### Example Documentation: MPE_Per_Instrument.md

```markdown
# MPE Support Per Instrument

## Overview

This document describes how each Schillinger instrument responds to MPE (MIDI Polyphonic Expression) input.

## Full MPE Instruments ✅

### KaneMarco Aether (Strings)
- **MPE Level:** Full
- **Pressure:** Controls bow force (filter cutoff + brightness)
- **Timbre:** Controls bow contact point (brightness + attack)
- **Pitch Bend:** Controls string stretch (detune + vibrato depth)
- **Best Controllers:** Roli Seaboard, LinnStrument, K-Board

### KaneMarco (Virtual Analog)
- **MPE Level:** Full
- **Pressure:** Filter cutoff + oscillator mix
- **Timbre:** LFO speed + envelope times
- **Pitch Bend:** FM depth + detune
- **Best Controllers:** Any MPE controller

[... etc for each instrument ...]
```

---

## Part 5: Implementation Checklist

### Phase 1: Infrastructure (Week 1)

- [ ] Enhance `BaseInstrumentProcessor` with MPE/microtonal hooks
- [ ] Create `Release/` folder structure
- [ ] Write `prepare_release.sh` script
- [ ] Write `install_all.sh` script
- [ ] Update CMakeLists.txt to build DSP libraries

### Phase 2: Instrument Integration (Week 2-3)

**Priority 1 (Full MPE):**
- [ ] KaneMarco Aether - Integrate MPE + microtonal
- [ ] KaneMarco Aether String - Integrate MPE + microtonal
- [ ] KaneMarco - Integrate MPE + microtonal

**Priority 2 (Partial MPE):**
- [ ] LOCAL_GAL - Integrate partial MPE + microtonal
- [ ] DrumMachine - Integrate partial MPE + microtonal

**Priority 3 (MPE-Lite):**
- [ ] SamSampler - Integrate MPE-lite + microtonal

**Skip:**
- [ ] FilterGate - No MPE (it's an effect)

### Phase 3: Documentation (Week 4)

- [ ] Write User Guide documents
- [ ] Write MPE Guide documents
- [ ] Write Microtonal Guide documents
- [ ] Write per-instrument documentation
- [ ] Create example usage videos (optional)

### Phase 4: Testing & Release (Week 5)

- [ ] Test all plugins in major DAWs (Logic, Ableton, Reaper, Bitwig)
- [ ] Test MPE controllers (Seaboard, LinnStrument)
- [ ] Test microtonal scales (all 30+ built-in)
- [ ] Test installation scripts on clean macOS system
- [ ] Create first public release

---

## Part 6: Questions for User

1. **Giant Instruments Plugin:**
   - Should all 5 giant instruments be in ONE plugin (with instrument selector)?
   - Or 5 separate plugins?
   - *Recommendation: ONE plugin with selector (like current AetherGiantProcessor)*

2. **DSP Libraries:**
   - Do we want to distribute standalone DSP libraries (for programmatic use)?
   - Or just VST3/AU plugins?

3. **Installation:**
   - Should plugins install to user folders (`~/Library/Audio`) or system folders (`/Library/Audio`)?
   - Should we require sudo/root for AU installation?

4. **Presets:**
   - Should presets be included in the plugin bundle?
   - Or installed to `~/Documents/Schillinger/Presets`?

5. **Documentation:**
   - PDF or Markdown format?
   - Include in plugin bundle or separate download?

---

## Appendix: File Manifest

### Files to Create

```
scripts/
├── prepare_release.sh              ← Prepare Release folder
├── install_all.sh                  ← Install all plugins
├── install_vst3.sh                 ← Install VST3 only
├── install_au.sh                   ← Install AU only
└── create_dmg.sh                   ← Create .dmg for distribution

Release/                             ← Created by prepare_release.sh
├── VST3/
├── AU/
├── DSP_Libraries/
├── Presets/
├── Documentation/
└── install_scripts/

docs/
├── User_Guide/
│   ├── README.txt
│   ├── Installation_Guide.md
│   ├── Quick_Start_Guide.md
│   └── Instrument_Overview.md
├── MPE_Guide/
│   ├── MPE_Introduction.md
│   ├── MPE_Per_Instrument.md
│   ├── MPE_Controllers.md
│   └── MPE_Examples.md
├── Microtonal_Guide/
│   ├── Microtonal_Introduction.md
│   ├── Supported_Scales.md
│   ├── Scala_Files.md
│   └── Scale_Per_Instrument.md
├── Developer_Guide/
│   ├── Build_System.md
│   ├── Adding_MPE.md
│   ├── Adding_Microtonal.md
│   └── Creating_Presets.md
└── Instrument_Specific/
    ├── LOCAL_GAL.md
    ├── SamSampler.md
    ├── NexSynth.md
    ├── KaneMarco.md
    ├── KaneMarcoAether.md
    ├── KaneMarcoAetherString.md
    ├── DrumMachine.md
    ├── FilterGate.md
    └── GiantInstruments.md
```

### Files to Modify

```
include/plugin_templates/
├── BaseInstrumentProcessor.h       ← Add MPE/microtonal support
└── BaseInstrumentEditor.h          ← Add MPE visualization (optional)

plugins/CMakeLists.txt               ← Add DSP library targets

[Each Instrument]/src/ui/
└── [Instrument]PluginProcessor.cpp ← Enable MPE/microtonal
```

---

**End of Standardization Plan**
