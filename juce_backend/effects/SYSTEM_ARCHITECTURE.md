# White Room Guitar Effects - System Architecture

## 🎸 Two-Complementary Approaches

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHITE ROOM GUITAR EFFECTS                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │                                     │
                ▼                                     ▼
    ┌───────────────────┐               ┌─────────────────────┐
    │ INDIVIDUAL PEDALS │               │   PEDALBOARD        │
    │                   │               │   SYSTEM            │
    └───────────────────┘               └─────────────────────┘
                │                                     │
                │                                     │
    ┌───────────┴────────┐                   ┌─────┴──────────┐
    │                    │                   │                │
    ▼                    ▼                   ▼                ▼
┌─────────┐      ┌─────────┐      ┌─────────┐    ┌──────────┐
│Overdrive│      │  Fuzz   │      │ Chorus  │    │  Delay   │
│  .vst3  │      │  .vst3  │      │  .vst3  │    │  .vst3  │
└─────────┘      └─────────┘      └─────────┘    └──────────┘
    │                │                │                │
    │                │                │                │
    └────────────────┴────────────────┴────────────────┘
                           │
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
            ┌──────────┐  ┌─────────────┐
            │   DAW    │  │ Pedalboard  │
            │  Chain   │  │   .vst3     │
            └──────────┘  └─────────────┘
```

---

## 🔧 Individual Pedal Plugins

### File Structure
```
overdrive_pedal/
├── include/plugin/
│   └── (none - uses pedals/include/dsp/)
├── src/plugin/
│   ├── OverdrivePluginProcessor.h
│   ├── OverdrivePluginProcessor.cpp
│   ├── OverdrivePluginEditor.h
│   └── OverdrivePluginEditor.cpp
└── CMakeLists.txt (in ../overdrive_pedal_build/)
```

### DSP Engine (Shared)
```
pedals/include/dsp/
├── GuitarPedalPureDSP.h          (Base class)
├── OverdrivePedalPureDSP.h
├── FuzzPedalPureDSP.h
├── ChorusPedalPureDSP.h
└── DelayPedalPureDSP.h
```

### Build Output
```
overdrive_pedal_build/build/
├── AudioUnit/
│   └── Overdrive.component/
├── VST3/
│   └── Overdrive.vst3/
├── CLAP/
│   └── Overdrive.clap/
└── Standalone/
    └── Overdrive.app
```

---

## 🎛️ Modular Pedalboard System

### Architecture
```
PedalboardPureDSP
│
├── std::vector<PedalSlot> pedals_;
│
└── struct PedalSlot
    ├── std::unique_ptr<GuitarPedalPureDSP> pedal
    ├── bool bypassed
    ├── float mix           (0-1, dry/wet)
    ├── float inputGain     (trim)
    └── float outputGain    (trim)
```

### Processing Flow
```
Input Signal
    │
    ▼
┌─────────────────────────────────────┐
│  Global Input Level                  │
│  (params_.inputLevel)                │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Pedal Slot 0                       │
│  ├── Input Gain                     │
│  ├── [PEDAL DSP]                    │
│  │   └── OverdrivePedalPureDSP     │
│  ├── Mix (dry/wet blend)            │
│  └── Output Gain                    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Pedal Slot 1                       │
│  ├── Input Gain                     │
│  ├── [PEDAL DSP]                    │
│  │   └── FuzzPedalPureDSP          │
│  ├── Mix (dry/wet blend)            │
│  └── Output Gain                    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Pedal Slot 2                       │
│  ├── Input Gain                     │
│  ├── [PEDAL DSP]                    │
│  │   └── DelayPedalPureDSP         │
│  ├── Mix (dry/wet blend)            │
│  └── Output Gain                    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Global Output Level                 │
│  (params_.outputLevel)               │
└─────────────────────────────────────┘
    │
    ▼
Output Signal
```

---

## 🔄 Reordering Operations

### Move Pedal
```cpp
// Before: [Overdrive] [Fuzz] [Delay]
// After:  [Fuzz] [Overdrive] [Delay]

board.movePedal(0, 1);

// Implementation:
// 1. std::move(Overdrive) to temp
// 2. Erase slot 0
// 3. Insert at slot 1
// 4. Next processBlock() uses new order instantly
```

### Swap Pedals
```cpp
// Before: [Overdrive] [Fuzz]
// After:  [Fuzz] [Overdrive]

board.swapPedals(0, 1);

// Implementation:
// std::swap(pedals_[0], pedals_[1]);
// Instant, no audio glitch
```

### Bypass Pedal
```cpp
// Before: [Overdrive] [Fuzz] [Delay]
// After:  [Overdrive] [BYPASSED] [Delay]

board.getPedalSlot(1)->bypassed = true;

// Processing:
// if (slot.bypassed) continue;  // Skip this pedal
```

---

## 📊 Plugin Formats

### Build Matrix
```
                    VST3   AU   CLAP   Standalone
Overdrive            ✅     ✅    ✅       ✅
Fuzz                 🚧     🚧    🚧       🚧
Chorus               🚧     🚧    🚧       🚧
Delay                🚧     🚧    🚧       🚧
Pedalboard           🚧     🚧    🚧       🚧

✅ = Completed   🚧 = Planned
```

### Installation
```bash
# VST3
cp -r *_pedal_build/build/VST3/*.vst3 ~/Library/Audio/Plug-Ins/VST3/

# AU
cp -r *_pedal_build/build/AudioUnit/*.component ~/Library/Audio/Plug-Ins/Components/

# CLAP
cp -r *_pedal_build/build/CLAP/*.clap ~/Library/Audio/Plug-Ins/CLAP/

# Standalone
cp -r *_pedal_build/build/Standalone/*.app /Applications/
```

---

## 🎯 Usage Examples

### Example 1: Simple Setup
**User**: "I just want overdrive"

**Solution A**: Load `Overdrive.vst3`

**Solution B**: Load `Pedalboard.vst3`, add 1 Overdrive pedal

---

### Example 2: Fixed Chain
**User**: "I always use Overdrive → Chorus → Delay"

**Solution A**: Load 3 plugins, chain in DAW, save as DAW preset

**Solution B**: Load `Pedalboard.vst3`, add pedals once, save as pedalboard preset

**Advantage**: Can reorder later without touching DAW routing

---

### Example 3: Experimentation
**User**: "I wonder what Fuzz → Overdrive sounds like?"

**Solution A**: Reorder plugins in DAW (close/reopen, routing changes)

**Solution B**: Drag pedals in Pedalboard UI (instant, hear immediately)

**Advantage**: Real-time experimentation, no DAW routing needed

---

## 🚀 Build Commands

### Build Individual Pedals
```bash
cd /Users/bretbouchard/apps/schill/white_room/juce_backend
./build_individual_pedals.sh
```

### Build Specific Pedal
```bash
cd overdrive_pedal_build
cmake -B build -GXcode
cmake --build build --config Release -j8
```

### Build All (Future)
```bash
# Build all individual pedals + pedalboard
./build_all_guitar_effects.sh
```

---

## 📈 Roadmap

### Phase 1: Individual Pedals ✅
- [x] Overdrive pedal plugin
- [ ] Fuzz pedal plugin
- [ ] Chorus pedal plugin
- [ ] Delay pedal plugin

### Phase 2: Pedalboard System 🚧
- [x] PedalboardPureDSP (reconfigurable chain)
- [ ] Pedalboard plugin wrapper
- [ ] Drag-and-drop UI
- [ ] Preset save/load

### Phase 3: Advanced Features 📋
- [ ] Effects loop (serial/parallel routing)
- [ ] MIDI learn for pedal bypass
- [ ] Built-in tuner
- [ ] Metronome
- [ ] Looper

### Phase 4: More Pedals 📋
- [ ] Phaser
- [ ] Flanger
- [ ] Tremolo
- [ ] Vibrato
- [ ] Compressor
- [ ] Wah
- [ ] Reverb
- [ ] Pitch Shifter

---

## 💡 Key Innovations

1. **Modular Architecture**
   - Add/remove pedals dynamically
   - No fixed signal chain
   - Infinite possibilities

2. **Real-time Reordering**
   - Move pedals instantly
   - No audio glitches
   - Hear changes immediately

3. **Per-Pedal Control**
   - Bypass any pedal
   - Adjust mix per pedal
   - Independent gain staging

4. **Unified Preset System**
   - Save pedal configurations
   - Share complete boards
   - Load factory presets

5. **Hybrid Approach**
   - Individual plugins for simple use
   - Pedalboard for power users
   - Best of both worlds

---

## 🎸 Conclusion

This system provides:

✅ **Flexibility** - Use individual pedals or full pedalboard
✅ **Modularity** - Add/remove/reorder pedals at will
✅ **Performance** - Efficient DSP, real-safe operations
✅ **Extensibility** - Easy to add new pedal types
✅ **Quality** - Production-ready, tested DSP
✅ **User Choice** - Pick the workflow that suits you

**Welcome to the future of guitar effects!** 🎸✨
