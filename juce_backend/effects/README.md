# Effects DSP

**Purpose:** Audio effect processors (insert & send effects)

## Responsibilities

This folder contains all DSP audio effects:

- **Insert Effects** - Per-channel insert processing (EQ, compression, etc.)
- **Send Effects** - Bus effects (reverb, delay, chorus, etc.)
- **EffectDSP** - Base interface for all effects

## Interface

```cpp
class EffectDSP {
public:
    // Prepare for processing
    virtual void prepare(double sampleRate, int blockSize) = 0;

    // Reset state
    virtual void reset() = 0;

    // Process audio through effect
    virtual void process(float** inputs, float** outputs,
                        int numChannels, int numSamples) = 0;

    // Bypass effect
    virtual void setBypass(bool bypass) = 0;

    // Mix (wet/dry)
    virtual void setMix(double wetLevel) = 0;  // 0.0 to 1.0

    // Effect parameters
    virtual void setParameter(int paramId, double value) = 0;
    virtual double getParameter(int paramId) const = 0;

    // Save/load preset
    virtual bool savePreset(const char* path) = 0;
    virtual bool loadPreset(const char* path) = 0;
};
```

## Effect Categories

### Dynamics
- Compressor
- Limiter
- Gate
- Expander

### EQ & Filters
- Parametric EQ
- Graphic EQ
- High-pass / Low-pass
- Band-pass filters

### Time-Based Effects
- Reverb
- Delay
- Echo
- Chorus
- Flanger
- Phaser

### Modulation
- Tremolo
- Vibrato
- Ring Modulator

### Distortion
- Overdrive
- Distortion
- Fuzz
- Bitcrusher

## Design Constraints

- **Real-time safe**: No allocations during process()
- **Deterministic**: Same input = same output
- **Bypassable**: Can be disabled without affecting audio
- **Pure DSP**: No UI coupling
- **Preset system**: Save/load functionality

## Processing Flow

### Insert Effect (Series)
```
Input → Effect → Wet/Dry Mix → Output
```

### Send Effect (Parallel)
```
Input ──┬──→ Direct ──┬──→ Output
         │              │
         └──→ Send ──→ Effect ──┘
```

## Files

- `include/effects/EffectDSP.h` - Base interface
- `src/effects/dynamics/` - Dynamics effects
- `src/effects/eq/` - EQ & filters
- `src/effects/time/` - Time-based effects
- `src/effects/modulation/` - Modulation effects
- `tests/effects/EffectTest.cpp` - Unit tests

## Dependencies

- `include/dsp/InstrumentDSP.h` - For effect instruments
- `include/console/ConsoleChannelDSP.h` - For insert/send routing
- Platform-specific code in `platform/` layer

## Platform Notes

- tvOS: Effects only, no custom UI
- macOS: Full UI for effect parameters
- All platforms: Same DSP processing

---

**Owner:** DSP Team
**Status:** 🟡 Design Phase (interface not yet defined)
**Priority:** HIGH
