# Console X DSP – Tier 0 + Tier 1 Source Repositories

**Authoritative Pull List (Apple TV–First)**

---

## Design Constraints (Non-Negotiable)

- **Pure C++ DSP**
- **No plugin hosting**
- **No runtime allocation**
- **No UI coupling**
- **tvOS-safe**
- **Deterministic, zero-latency**

---

## 🟩 Tier 0 — Core Console X Foundation (MANDATORY)

These form the always-on console path.
Every channel and bus uses Tier 0.

---

### 1. Airwindows – Console Core

**Repo:** https://github.com/airwindows/airwindows

This is the primary and required source.

#### Extract (DSP only, no wrappers)

From inside the Airwindows repo:

**Console / Summing**
- `Console4`
- `Console5`
- `Console6`
- `PurestConsole`

**Channel Utility**
- `Channel`
- `Gain`
- `PurestGain`

#### Why Tier 0
- Proven nonlinear summing
- Extremely low CPU
- Explicit channel → bus interaction
- Designed to be embedded, not hosted
- Already Apple-TV compatible in principle

#### How it's used
- **Always instantiated per track**
- **Always instantiated per bus**
- **Never bypassed entirely** (even in "clean" mode)
- **Mode-selectable** (Pure / Classic / Color)

#### What NOT to pull
- ❌ Plugin wrappers
- ❌ GUI code
- ❌ Preset systems
- ❌ Oversampling helpers tied to plugins

---

### 2. JUCE DSP Utilities (Selective, Internal)

**Source:** JUCE framework (already in backend)

#### Extract ONLY
- Parameter smoothing helpers
- Denormal protection
- Basic math utilities
- Optional oversampling helpers (off by default)

#### Why Tier 0
- Battle-tested infrastructure
- No licensing issues
- Already part of backend

#### Rules
- ❌ No AudioProcessorGraph
- ❌ No AudioProcessorValueTreeState
- ❌ No plugin assumptions

---

## 🟨 Tier 1 — Console-Adjacent Tone & Saturation (OPTIONAL, SUPPORTED)

Tier 1 extends Console X but never replaces it.
All Tier 1 modules are optional stages, not default effects.

---

### 3. Airwindows – Density

**Repo:** https://github.com/airwindows/airwindows

#### Extract
- `Density`
- `Density2` (optional)

#### Purpose
- Program-dependent saturation
- Adds weight without fuzz
- Excellent pre-console stage

#### Usage
- **Channel only** (default off)
- Very low CPU
- Single parameter

---

### 4. Airwindows – Drive

**Repo:** https://github.com/airwindows/airwindows

#### Extract
- `Drive`
- (optional) `SoftClip` logic portions

#### Purpose
- Harmonic edge
- Controlled aggression
- Subtle console push

#### Usage
- **Channel only**
- Never a "distortion effect"
- No tone controls

---

### 5. Airwindows – BussColors

**Repo:** https://github.com/airwindows/airwindows

#### Extract (curated subset only)
- **2–4 color modes max**
- No full BussColors menu

#### Purpose
- Bus-level coloration
- Summing personality
- Optional enhancement

#### Usage
- **Bus inserts only**
- Never default-on
- Enum-based mode selection

---

### 6. Airwindows – Purest Series

**Repo:** https://github.com/airwindows/airwindows

#### Extract
- `PurestConsole`
- `PurestGain`

#### Purpose
- Calibration
- Debugging
- Golden render reference
- "Clean digital desk" mode

#### Usage
- Console mode option
- Testing & baseline

---

## ❌ Explicitly NOT Included (Important)

These are intentionally excluded, even if tempting:
- ❌ Third-party console emulations (SSL, Neve clones)
- ❌ Closed-source DSP
- ❌ GPL-only code (unless isolated later)
- ❌ FFT-heavy saturation
- ❌ Plugin-centric frameworks
- ❌ Anything requiring background threads

---

## 🧱 Canonical JUCE Folder Mapping

```
console/
├── core/                 # Tier 0 (always-on)
│   ├── ConsoleChannelDSP.cpp
│   ├── ConsoleBusDSP.cpp
│   ├── ConsoleMath.h     # Extracted Airwindows math
│   └── GainStage.h
├── modes/                # Tier 1 (optional)
│   ├── ConsolePure.cpp
│   ├── ConsoleClassic.cpp
│   ├── ConsoleDensity.cpp
│   ├── ConsoleDrive.cpp
│   └── ConsoleBusColor.cpp
├── params/
│   └── ConsoleParams.h
└── tests/
    ├── console_gain.cpp
    ├── console_summing.cpp
    └── console_saturation.cpp
```

---

## 🔁 Canonical Signal Flow (Locked for MVP)

### Channel

```
Input Trim
 → Density (Tier 1, optional)
 → Drive (Tier 1, optional)
 → Console Channel DSP (Tier 0)
 → Output Trim
```

### Bus

```
Bus Sum
 → Console Bus DSP (Tier 0)
 → BussColor (Tier 1, optional)
 → Output
```

**No runtime reordering on Apple TV.**

---

## 🎯 Why This List Is "Correct"

This gives you:
- ✅ A real console, not an effect rack
- ✅ Apple TV–safe execution
- ✅ Deterministic summing
- ✅ Extendability to macOS / plugins later
- ✅ No re-architecture required later
- ✅ Clear ownership boundaries

---

## 📋 Implementation Tasks

When implementing Console X DSP:

1. **Extract Airwindows source files** (file-level)
2. **Write ConsoleChannelDSP.h / .cpp**
3. **Define console calibration defaults**
4. **Provide golden render test vectors**
5. **Map console params → SongModel_v1**

---

**Status:** Ready for implementation

**Source:** Console X DSP Design Specification

**Date:** December 30, 2025
