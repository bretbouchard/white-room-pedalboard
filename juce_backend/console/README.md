# Console (Channel Strip) DSP

**Purpose:** Mixer channel strip processing for individual tracks and master bus

## Responsibilities

This folder contains all DSP for mixer channel strips:

- **Track Channels** - Per-track processing (volume, pan, inserts, sends)
- **Master Bus** - Final output processing (limiting, EQ, metering)
- **ConsoleChannelDSP** - Base interface for all channel processing

## Interface

```cpp
class ConsoleChannelDSP {
public:
    // Prepare for processing
    virtual void prepare(double sampleRate, int blockSize) = 0;

    // Reset state
    virtual void reset() = 0;

    // Process audio through channel strip
    virtual void process(float** inputs, float** outputs,
                        int numChannels, int numSamples) = 0;

    // Mix parameters
    virtual void setVolume(double dB) = 0;       // -inf to +10 dB
    virtual void setPan(double position) = 0;    // -1.0 to +1.0
    virtual void setMuted(bool muted) = 0;
    virtual void setSoloed(bool soloed);

    // Insert effects (pre-fader)
    virtual void addInsertEffect(EffectDSP* effect) = 0;
    virtual void removeInsertEffect(int index) = 0;

    // Sends (pre/post fader)
    virtual void addSend(int busIndex, double amount, bool preFader) = 0;
    virtual void removeSend(int busIndex) = 0;
};
```

## Design Constraints

- **Real-time safe**: No allocations during process()
- **Deterministic**: Same input = same output
- **Platform-agnostic**: No tvOS/macOS-specific code
- **Pure DSP**: No UI coupling

## Processing Order

1. **Insert Effects** (pre-fader, if any)
2. **Send Processing** (pre or post fader)
3. **Volume/Gain** (dB to linear)
4. **Pan** (stereo positioning)
5. **Mute/Solo** (gain = 0 if muted)
6. **Output** (to mix bus or direct out)

## Files

- `include/console/ConsoleChannelDSP.h` - Base interface
- `src/console/TrackChannel.cpp` - Track channel implementation
- `src/console/MasterChannel.cpp` - Master bus implementation
- `tests/console/ConsoleChannelTest.cpp` - Unit tests

## Dependencies

- `include/dsp/EffectDSP.h` - Insert effect interface
- `include/routing/BusTypes.h` - Send/return types
- Platform-specific code in `platform/` layer

## Platform Notes

- tvOS: No custom channel strip UI (use system mixer)
- macOS: May expose custom console UI
- All platforms: Same DSP processing

---

**Owner:** DSP Team
**Status:** 🟡 Design Phase (interface not yet defined)
**Priority:** HIGH
