# Plugin Inventory

## Built Plugins

### Current Build Status
- **Format:** VST3 only
- **Architecture:** Apple Silicon (arm64) only
- **Build Date:** 2026-01-15
- **Build Type:** Release
- **Location:** `juce_backend/*_plugin_build/build/*_artefacts/Release/VST3/`

## Plugin List

### 1. AetherGiantHorns
- **Type:** Instrument
- **Format:** VST3
- **Path:** `aether_giant_horns_plugin_build/build/AetherGiantHorns_artefacts/Release/VST3/AetherGiantHorns.vst3`
- **Description:** Physical modeling brass ensemble
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 2. AetherGiantVoice
- **Type:** Instrument
- **Format:** VST3
- **Path:** `aether_giant_voice_plugin_build/build/AetherGiantVoice_artefacts/Release/VST3/AetherGiantVoice.vst3`
- **Description:** Physical modeling vocal synthesis
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 3. FarFarAway
- **Type:** Effect
- **Format:** VST3
- **Path:** `farfaraway_plugin_build/build/FarFarAway_artefacts/Release/VST3/FarFarAway.vst3`
- **Description:** Spatial audio processor
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 4. FilterGate
- **Type:** Effect
- **Format:** VST3
- **Path:** `filtergate_plugin_build/build/FilterGate_artefacts/Release/VST3/FilterGate.vst3`
- **Description:** Envelope filter with gating
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 5. KaneMarcoAetherString
- **Type:** Instrument
- **Format:** VST3
- **Path:** `kane_marco_aether_string_plugin_build/build/KaneMarcoAetherString_artefacts/Release/VST3/KaneMarcoAetherString.vst3`
- **Description:** Physical modeling string ensemble
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 6. KaneMarcoAether
- **Type:** Instrument
- **Format:** VST3
- **Path:** `kane_marco_aether_plugin_build/build/KaneMarcoAether_artefacts/Release/VST3/KaneMarcoAether.vst3`
- **Description:** Physical modeling hybrid synthesizer
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 7. LocalGal
- **Type:** Instrument
- **Format:** VST3
- **Path:** `localgal_plugin_build/build/LocalGal_artefacts/Release/VST3/LocalGal.vst3`
- **Description:** Granular synthesis instrument
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 8. Monument
- **Type:** Effect
- **Format:** VST3
- **Path:** `monument_plugin_build/build/Monument_artefacts/Release/VST3/Monument.vst3`
- **Description:** Harmonic resonator
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 9. NexSynth
- **Type:** Instrument
- **Format:** VST3
- **Path:** `nex_synth_plugin_build/build/NexSynth_artefacts/Release/VST3/NexSynth.vst3`
- **Description:** FM synthesis with modulation matrix
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

### 10. SamSampler
- **Type:** Instrument
- **Format:** VST3
- **Path:** `sam_sampler_plugin_build/build/SamSampler_artefacts/Release/VST3/SamSampler.vst3`
- **Description:** SF2 sampler with multi-layer support
- **Status:** ✅ Built
- **Tested:** ❌ No
- **Known Issues:** None

## Missing Builds

### AU Format (macOS)
- **Status:** ❌ Not built
- **Required For:** Logic Pro, GarageBand
- **Priority:** P0 (Critical)
- **Action:** Need to build AU versions

### Universal Binary (macOS)
- **Status:** ❌ Not built
- **Required For:** Intel Macs
- **Priority:** P1 (Important)
- **Action:** Need to build x86_64 slices

### Windows Build
- **Status:** ❌ Not built
- **Required For:** Windows DAWs
- **Priority:** P1 (Important)
- **Action:** Need to configure Windows build

## Plugin Metadata

### Common Features Across All Plugins
- **VST3 Version:** 3.x
- **JUCE Version:** 7.x
- **Minimum OS:** macOS 10.15+
- **Architecture:** arm64 (Apple Silicon only)
- **Sample Rates:** 44.1kHz - 192kHz
- **Buffer Sizes:** 16 - 2048 samples

### Parameter Counts (Approximate)
- **AetherGiantHorns:** ~50 parameters
- **AetherGiantVoice:** ~40 parameters
- **FarFarAway:** ~30 parameters
- **FilterGate:** ~50 parameters
- **KaneMarcoAetherString:** ~60 parameters
- **KaneMarcoAether:** ~70 parameters
- **LocalGal:** ~40 parameters
- **Monument:** ~20 parameters
- **NexSynth:** ~80 parameters (with modulation matrix)
- **SamSampler:** ~30 parameters

## Installation Paths

### VST3 (macOS)
```bash
# System-wide
/Library/Audio/Plug-Ins/VST3/

# User-specific
~/Library/Audio/Plug-Ins/VST3/
```

### AU (macOS) - Not Yet Built
```bash
# System-wide
/Library/Audio/Plug-Ins/Components/

# User-specific
~/Library/Audio/Plug-Ins/Components/
```

### VST3 (Windows) - Not Yet Built
```bash
C:\Program Files\Common Files\VST3\
C:\Users\<username>\AppData\Local\Programs\Common\VST3\
```

## Plugin IDs

For automation and testing, each plugin has a unique ID:

| Plugin | VST3 ID | AU ID (Not Built) |
|--------|---------|-------------------|
| AetherGiantHorns | `com.schillinger.aethergianthorns` | TBD |
| AetherGiantVoice | `com.schillinger.aethergiantvoice` | TBD |
| FarFarAway | `com.schillinger.farfaraway` | TBD |
| FilterGate | `com.schillinger.filtergate` | TBD |
| KaneMarcoAetherString | `com.schillinger.kanemarcoaetherstring` | TBD |
| KaneMarcoAether | `com.schillinger.kanemarcoaether` | TBD |
| LocalGal | `com.schillinger.localgal` | TBD |
| Monument | `com.schillinger.monument` | TBD |
| NexSynth | `com.schillinger.nexsynth` | TBD |
| SamSampler | `com.schillinger.samsampler` | TBD |

## Testing Priority

### High Priority (P0) - Core Instruments
1. NexSynth - FM synthesis flagship
2. KaneMarcoAether - Physical modeling flagship
3. SamSampler - Sample playback

### Medium Priority (P1) - Effects
1. FilterGate - Dynamics processing
2. Monument - Harmonic processing
3. FarFarAway - Spatial effects

### Lower Priority (P2) - Specialized
1. AetherGiantHorns - Brass ensemble
2. AetherGiantVoice - Vocal synthesis
3. KaneMarcoAetherString - String ensemble
4. LocalGal - Granular synthesis

---

**Last Updated:** 2026-01-15
**Total Plugins:** 10
**Formats Built:** VST3 only
**Formats Missing:** AU, Universal Binary, Windows
