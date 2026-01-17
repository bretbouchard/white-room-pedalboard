# FilterGate - Handoff Specification

**DSP Core + Swift FFI**
**Version**: 1.0
**Date**: 2025-12-30

---

## 0. Product Definition

FilterGate is a modular DSP block combining dual phaser, multi-model filter, filter gate, and ADSR/ADR envelopes, designed as a single controllable "instrument articulation processor" rather than a traditional pedal.

---

## 1. Architectural Overview

### Layers

```
[ Swift UI / Control Layer ]
          ↓  (C ABI / FFI)
[ FilterGate C Interface ]
          ↓
[ JUCE DSP Core ]
          ↓
[ Audio Engine / Host ]
```

### JUCE DSP Core
- Owns all audio processing
- Owns all modulation state
- No UI assumptions
- Deterministic, sample-accurate

### Swift Layer
- Parameter control
- Preset handling
- Automation
- No DSP logic

---

## 2. DSP Signal Flow

### Audio Path (configurable routing)

```
Input
  ↓
Pre Drive
  ↓
Router
  ├─ Phaser A
  ├─ Phaser B
  ├─ Filter Core
  └─ Dry
  ↓
Mixer
  ↓
Post Drive
  ↓
Output
```

### Control Path (always active)

```
Input Audio
 ├─ Envelope Follower
 ├─ Gate Detector
 └─ Transient Detector

→ Trigger ADSR / ADR
→ Mod Matrix
→ Phaser + Filter + VCA
```

---

## 3. Core Modules (JUCE)

### 3.1 Dual Phaser Engine

Each phaser = cascade of all-pass filters.

**Per-Phaser Parameters**

```cpp
struct PhaserParams {
    int stages;         // 4, 6, 8
    float rateHz;       // LFO rate
    float depth;        // 0..1
    float feedback;     // 0..0.95
    float centerHz;     // sweep center
    float spread;       // sweep range
    float mix;          // dry/wet
};
```

**Dual Features**
- LFO phase offset (0–180°)
- Serial / Parallel / Stereo routing
- Optional cross-feedback (clamped)

### 3.2 Filter Engine (Model-Selectable)

**Supported Models (v1)**
- SVF (LP / HP / BP / Notch)
- Ladder (Moog-style, nonlinear)
- OTA / Roland-style
- MS-20-style (nonlinear HP+LP)
- Comb filter
- Morph filter (LP↔BP↔HP)

**Common Parameters**

```cpp
struct FilterParams {
    float cutoffHz;
    float resonance;     // 0..1
    float drive;         // pre-res saturation
    float postDrive;
    float keyTrack;      // 0..1
    int   model;         // enum
};
```

Oversampling enabled automatically for nonlinear models.

### 3.3 Filter Gate

**Gate Detector**

```cpp
struct GateParams {
    float threshold;
    float attackMs;
    float holdMs;
    float releaseMs;
    float hysteresis;
};
```

**Gate Behavior**
- Gate opens VCA
- Triggers envelope
- Optionally modulates filter cutoff/resonance
- Gate output is also exposed as modulation source (0/1)

### 3.4 ADSR / ADR Engine

Minimum 2 envelopes, expandable.

```cpp
enum EnvMode { ADR, ADSR };

struct EnvelopeParams {
    EnvMode mode;
    float attackMs;
    float decayMs;
    float sustain;     // ignored in ADR
    float releaseMs;
    bool loop;
    bool velocitySensitive;
};
```

**Trigger Sources**
- Gate detector
- Manual trigger
- LFO edge
- External (future MIDI)

### 3.5 Modulation Matrix

**Sources**
- Env1, Env2
- LFO1, LFO2
- Envelope follower
- Gate (binary)
- Velocity
- Random / S&H

**Destinations**
- Filter cutoff / resonance / drive
- Phaser center / depth / feedback
- VCA level
- Mix parameters

```cpp
struct ModRoute {
    int source;
    int destination;
    float amount;      // bipolar
    float slewMs;
};
```

Hard clamp + smoothing applied post-sum.

---

## 4. JUCE Class Layout

```
FilterGateProcessor
 ├─ PhaserEngine phaserA
 ├─ PhaserEngine phaserB
 ├─ FilterEngine filter
 ├─ GateDetector gate
 ├─ Envelope env1
 ├─ Envelope env2
 ├─ LFO lfo1
 ├─ LFO lfo2
 ├─ ModMatrix modMatrix
 ├─ DriveStage preDrive
 └─ DriveStage postDrive
```

Each module:
- Stateless interface
- Internal state only
- Resettable

---

## 5. C ABI / FFI Interface (Swift-Safe)

### Handle-Based API

```c
typedef void* FilterGateHandle;

FilterGateHandle fg_create(double sampleRate);
void fg_destroy(FilterGateHandle h);

void fg_process(
    FilterGateHandle h,
    float* input,
    float* output,
    int numFrames,
    int numChannels
);
```

### Parameter Control

```c
void fg_set_param(FilterGateHandle h, int paramID, float value);
float fg_get_param(FilterGateHandle h, int paramID);
```

### Triggering

```c
void fg_trigger_env(FilterGateHandle h, int envIndex);
void fg_reset(FilterGateHandle h);
```

---

## 6. Swift Binding Strategy

### Swift Wrapper

```swift
final class FilterGate {
    private let handle: FilterGateHandle

    init(sampleRate: Double) {
        handle = fg_create(sampleRate)
    }

    deinit {
        fg_destroy(handle)
    }

    func process(input: UnsafePointer<Float>,
                 output: UnsafeMutablePointer<Float>,
                 frames: Int,
                 channels: Int) {
        fg_process(handle, input, output, frames, channels)
    }

    func set(_ param: Param, _ value: Float) {
        fg_set_param(handle, param.rawValue, value)
    }
}
```

### Threading
- Audio thread: process() only
- UI thread: set_param() (atomic + smoothing)

---

## 7. Parameter ID Map (Stable ABI)

```cpp
enum FilterGateParamID {
    FG_FILTER_CUTOFF,
    FG_FILTER_RESONANCE,
    FG_FILTER_DRIVE,
    FG_FILTER_MODEL,

    FG_GATE_THRESHOLD,
    FG_GATE_RELEASE,

    FG_ENV1_ATTACK,
    FG_ENV1_DECAY,
    FG_ENV1_SUSTAIN,
    FG_ENV1_RELEASE,

    FG_PHASER_A_RATE,
    FG_PHASER_A_DEPTH,
    FG_PHASER_A_FEEDBACK,

    FG_PHASER_B_RATE,
    FG_PHASER_B_DEPTH,
    FG_PHASER_B_FEEDBACK,

    FG_MIX,
};
```

IDs must never change after v1.

---

## 8. Preset Schema (JSON)

```json
{
  "name": "Liquid Gate",
  "filter": {
    "model": "ladder",
    "cutoff": 1200,
    "resonance": 0.6,
    "drive": 0.3
  },
  "gate": {
    "threshold": 0.2,
    "release": 120
  },
  "env1": {
    "mode": "ADSR",
    "attack": 10,
    "decay": 80,
    "sustain": 0.4,
    "release": 200
  },
  "phaserA": {
    "stages": 6,
    "rate": 0.3,
    "depth": 0.7
  }
}
```

---

## 9. Stability & Safety Rules

### Mandatory
- Hard clamp modulation sums
- Soft clip feedback paths
- Slew all time-varying params
- Denormal protection
- Reset on sample rate change

---

## 10. v1 Acceptance Criteria

- ✅ Stereo safe
- ✅ No heap alloc in audio thread
- ✅ Deterministic output
- ✅ Swift-controlled, JUCE-owned DSP
- ✅ tvOS compatible (pure DSP)

---

## 11. Why This Fits Your Ecosystem

- Acts like a synth articulation engine
- Schillinger-friendly (envelopes + gates + motion)
- Can replace wah, auto-filter, trem, phaser, gate
- Works equally well on:
  - guitar
  - synth buses
  - drum loops
  - full mixes

---

## Next Optional Handoffs

- JUCE .cpp/.h skeletons
- Swift Package layout
- Mod-matrix auto-macro rules
- Apple TV UI control mapping
- Preset starter bank (20 patches)

This spec is implementation-ready.
