# UI Team Guidance - Bus Strip & Parameter Metadata

**Received**: December 30, 2025
**Status**: Pending Implementation
**Priority**: High (blocks UI/DSP integration)

---

## Overview

The UI team has provided two critical deliverables to ensure DSP reality and instrument-grade UI stay aligned:

1. **Bus Strip Variant** - Derived from Track Strip (zero reinvention)
2. **JUCE-Side Parameter Metadata Map** - The missing glue for UI automation

**Core Principle**: *The DSP declares meaning. The UI renders meaning. Neither is allowed to guess.*

---

## 1. Bus Strip Variant

### 1.1 Bus Strip Intent (Formal)

**Entity**: Bus / Group / Aux
**Intent**: "How are multiple signals combined, shaped, and forwarded?"

This is not a track. It does not represent a source.

### 1.2 What Is the Same (Invariant)

These do NOT change from Track Strip:
- Vertical orientation
- Strip → Block grammar
- Flat vs rounded edge semantics
- Value-first controls
- No modal shaping
- Stable spatial layout

**If any of these change, it's a violation.**

### 1.3 What Is Different (Derived, Not Invented)

| Aspect      | Track Strip           | Bus Strip                  |
|------------|-----------------------|----------------------------|
| Identity   | Track name            | Bus name / type            |
| Input      | Trim                  | Summing indicator          |
| EQ         | Optional              | Primary                    |
| Dynamics   | Optional              | Primary                    |
| Sends      | Yes                   | Rare / optional            |
| Output     | To buses              | To master / next bus       |
| Meter      | Mono/stereo           | Stereo / summed            |

These are emphasis changes, not layout changes.

### 1.4 Canonical Bus Strip Stack

```
┌──────────────────────────┐
│ HEADER (Bus Identity)    │
├──────────────────────────┤
│ INPUT (Summing State)    │
├──────────────────────────┤
│ EQ (Primary)             │
├──────────────────────────┤
│ DYNAMICS (Primary)       │
├──────────────────────────┤
│ ROUTING                  │
├──────────────────────────┤
│ OUTPUT                   │
└──────────────────────────┘
```

### 1.5 Canonical SwiftUI Implementation

```swift
struct BusStrip: View {
    let name: String
    let busType: String   // e.g. "GROUP", "AUX", "MASTER"

    var body: some View {
        Strip {
            // HEADER (boundary)
            StripBlock(rounded: true) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(name)
                            .font(InstrumentFont.header)
                        Text(busType)
                            .font(InstrumentFont.micro)
                            .opacity(0.6)
                    }
                    Spacer()
                    StereoMeterBar()
                }
            }

            // INPUT (summing indicator)
            StripBlock(rounded: false) {
                ValueControl(value: "Σ 12", label: "inputs")
            }

            // EQ (primary)
            StripBlock(rounded: false) {
                VStack(spacing: 4) {
                    EQBand(value: "+1.2", label: "low")
                    EQBand(value: "-0.8", label: "mid")
                    EQBand(value: "+0.4", label: "high")
                }
            }

            // DYNAMICS (primary)
            StripBlock(rounded: false) {
                ValueControl(value: "2.5:1", label: "bus comp")
            }

            // ROUTING (boundary)
            StripBlock(rounded: true) {
                ValueControl(value: "MASTER", label: "route")
            }

            // OUTPUT
            StripBlock(rounded: false) {
                ValueControl(value: "-3.0", label: "out")
            }
        }
        .frame(width: 160)
    }
}
```

### 1.6 Why This Is Correct

- No new primitives introduced
- Bus-specific meaning conveyed by values, labels, meter type
- Spatial grammar preserved
- A trained user can read a bus instantly

**This is how hardware consoles do it.**

---

## 2. JUCE-Side Parameter Metadata Map

### 2.1 The Problem This Solves

**Without metadata**:
- UI hardcodes controls
- DSP changes break UI
- Automation becomes ad-hoc
- Strip grammar erodes over time

**Metadata is how you keep power structured.**

### 2.2 Core Concept

JUCE exposes **parameter descriptors**, not just parameters.

Each parameter declares:
- What it is
- Where it lives
- How dangerous it is
- How it should be rendered

**UI does not infer meaning.**

### 2.3 Canonical Parameter Descriptor (JUCE → UI)

```cpp
struct ParameterMeta
{
    std::string id;              // "eq.low.gain"
    std::string label;           // "low"
    std::string unit;            // "dB", "ratio", "%"

    float minValue;
    float maxValue;
    float defaultValue;

    enum class Intent {
        Input,
        Shaping,
        Routing,
        Output
    } intent;

    enum class Block {
        Header,
        Input,
        EQ,
        Dynamics,
        Sends,
        Routing,
        Output
    } block;

    enum class Risk {
        Safe,
        Destructive
    } risk;

    bool automatable;
    bool perVoice;
};
```

**This struct is non-negotiable.**

### 2.4 Strip Grammar Is Encoded Here

The `block` enum is the key.

**UI Rule**: Parameters are grouped and ordered strictly by block, never by UI code.

This enforces:
- Stable layout
- No mode shuffling
- Strip consistency across platforms

### 2.5 Example: Track EQ Parameters

```cpp
ParameterMeta eqLowGain {
    "eq.low.gain",
    "low",
    "dB",
    -12.0f,
    12.0f,
    0.0f,
    Intent::Shaping,
    Block::EQ,
    Risk::Safe,
    true,
    false
};
```

### 2.6 Example: Bus Compressor Ratio

```cpp
ParameterMeta busCompRatio {
    "bus.comp.ratio",
    "comp",
    "ratio",
    1.0f,
    10.0f,
    2.0f,
    Intent::Shaping,
    Block::Dynamics,
    Risk::Safe,
    true,
    false
};
```

### 2.7 UI Consumption (Swift Side)

**Swift mirror type**:
```swift
struct ParameterMeta {
    let id: String
    let label: String
    let unit: String
    let min: Float
    let max: Float
    let defaultValue: Float
    let intent: Intent
    let block: Block
    let risk: Risk
    let automatable: Bool
}
```

**Strip Renderer (Key Insight)**:
```swift
let grouped = Dictionary(grouping: parameters) { $0.block }

ForEach(Block.allCases, id: \.self) { block in
    if let params = grouped[block] {
        StripBlock(rounded: block.isBoundary) {
            ForEach(params) { param in
                ValueControl(
                    value: format(param),
                    label: param.label
                )
            }
        }
    }
}
```

**UI never hardcodes "EQ section". The DSP declares it.**

### 2.8 Automation Falls Out Naturally

Because `automatable` is metadata:
- UI can expose automation lanes later
- SDK can bind Schillinger → param without guessing
- No retrofitting required

### 2.9 Risk Discipline (Critical)

Parameters marked `Risk::Destructive`:
- Never inline
- Require confirmation
- May use modal (allowed per constitution)

Everything else stays inline.

### 2.10 What This Buys Long-Term

- Strip grammar enforced at DSP boundary
- UI becomes a renderer, not a decision-maker
- DSP teams can add parameters safely
- Flutter / TUI / hardware reuse the same map
- Automation becomes universal

**This is how you scale power without chaos.**

---

## 3. Implementation Tasks

### Task 3.1: Add ParameterMeta to InstrumentDSP Base Class

**File**: `include/dsp/InstrumentDSP.h`

Add method:
```cpp
virtual std::vector<ParameterMeta> getParameterMetadata() const = 0;
```

### Task 3.2: Implement Parameter Metadata for NexSynthDSP

**File**: `instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp`

Return metadata for all 45+ parameters:
- Global parameters (masterVolume, pitchBendRange)
- Operator parameters (ratio, detune, modIndex, level)
- Envelope parameters (attack, decay, sustain, release)

### Task 3.3: Add Serialization for Parameter Metadata

**Format**: JSON or flat binary

Must serialize:
- All ParameterMeta fields
- Block grouping for UI rendering
- Intent and risk for automation/UX

### Task 3.4: Update InstrumentFactory to Expose Metadata

Add method:
```cpp
std::vector<ParameterMeta> getInstrumentParameterMetadata(const char* instrumentName);
```

### Task 3.5: UI Integration

**Swift side**:
- Mirror ParameterMeta struct
- Implement strip renderer that groups by Block
- Value formatter based on unit
- Risk-based UX (inline vs modal)

---

## 4. Next Steps (Highest Leverage Options)

UI team suggests these follow-ups:

1. **Master Strip** - Special rules, but derived
2. **Automation Lane Grammar** - Strip-aligned, not DAW-style
3. **Schillinger → Parameter Binding Map** - SDK integration
4. **Hardware Controller Mapping** - Derived from same metadata

---

## Final Lock-In Statement

> **The DSP declares meaning. The UI renders meaning. Neither is allowed to guess.**

Put this in both repos.

---

## Priority Assessment

**Immediate (Next Sprint)**:
- Implement ParameterMeta struct
- Add getParameterMetadata() to InstrumentDSP
- Implement for NexSynthDSP as reference

**Short Term (This Month)**:
- Serialization for metadata
- InstrumentFactory integration
- Swift UI mirror type

**Medium Term (Next Quarter)**:
- Full strip rendering with metadata
- Automation system integration
- Schillinger binding

**Long Term (Future)**:
- Hardware controller support
- TUI (terminal UI) using same metadata
- Preset browser integration

---

**Dependencies**: Blocks UI development until complete
**Risk**: High - UI/DSP drift will occur without this
**Effort**: 2-3 weeks for initial implementation
