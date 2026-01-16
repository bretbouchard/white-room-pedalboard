# Comprehensive Pedal Test Plan

## Overview

This document outlines the comprehensive test suite for all 10 guitar pedals.
Total estimated tests: **485**

## Test Categories

- **Basic signal tests**: 30 tests
- **Parameter sweep tests**: 294 tests
- **Preset tests**: 46 tests
- **Circuit mode tests**: 17 tests
- **Parameter smoothing tests**: 98 tests

## Pedal Breakdown

### BiPhase

- **Parameters**: 9
- **Presets**: 7
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 27
  - Preset tests: 7
  - Parameter smoothing tests: 9
  - **Subtotal**: 46 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | RateA | 0.0 | 1.0 | 0.5 |  |
| 1 | DepthA | 0.0 | 1.0 | 0.5 |  |
| 2 | FeedbackA | 0.0 | 1.0 | 0.5 |  |
| 3 | RateB | 0.0 | 1.0 | 0.5 |  |
| 4 | DepthB | 0.0 | 1.0 | 0.5 |  |
| 5 | FeedbackB | 0.0 | 1.0 | 0.5 |  |
| 6 | Mix | 0.0 | 1.0 | 0.5 |  |
| 7 | Level | 0.0 | 1.0 | 0.5 |  |
| 8 | Routing | 0.0 | 1.0 | 0.5 |  |

#### Presets

1. ClassicBiPhase
2. StereoPhaser
3. DeepPhase
4. SubtlePhase
5. Rotary
6. JetPhaser
7. Vibrato

### Chorus

- **Parameters**: 11
- **Presets**: 0
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 33
  - Preset tests: 0
  - Parameter smoothing tests: 11
  - **Subtotal**: 47 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Rate | 0.0 | 1.0 | 0.5 |  |
| 1 | Depth | 0.0 | 1.0 | 0.5 |  |
| 2 | Mix | 0.0 | 1.0 | 0.5 |  |
| 3 | Tone | 0.0 | 1.0 | 0.5 |  |
| 4 | VoiceCount | 0.0 | 1.0 | 0.5 |  |
| 5 | Circuit | 0.0 | 1.0 | 0.5 |  |
| 6 | VibratoMode | 0.0 | 1.0 | 0.5 |  |
| 7 | SpeedSwitch | 0.0 | 1.0 | 0.5 |  |
| 8 | Waveform | 0.0 | 1.0 | 0.5 |  |
| 9 | StereoModeParam | 0.0 | 1.0 | 0.5 |  |
| 10 | Detune | 0.0 | 1.0 | 0.5 |  |

### Compressor

- **Parameters**: 10
- **Presets**: 8
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 30
  - Preset tests: 8
  - Parameter smoothing tests: 10
  - **Subtotal**: 51 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Threshold | 0.0 | 1.0 | 0.5 |  |
| 1 | Ratio | 0.0 | 1.0 | 0.5 |  |
| 2 | Attack | 0.0 | 1.0 | 0.5 |  |
| 3 | Release | 0.0 | 1.0 | 0.5 |  |
| 4 | Level | 0.0 | 1.0 | 0.5 |  |
| 5 | Blend | 0.0 | 1.0 | 0.5 |  |
| 6 | Sustain | 0.0 | 1.0 | 0.5 |  |
| 7 | Knee | 0.0 | 1.0 | 0.5 |  |
| 8 | Tone | 0.0 | 1.0 | 0.5 |  |
| 9 | Circuit | 0.0 | 1.0 | 0.5 |  |

#### Presets

1. Country
2. Funk
3. Rock
4. Jazz
5. ChickenPicking
6. MaxSustain
7. Transparent
8. Squash

### Delay

- **Parameters**: 14
- **Presets**: 0
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 42
  - Preset tests: 0
  - Parameter smoothing tests: 14
  - **Subtotal**: 59 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Time | 0.0 | 1.0 | 0.5 |  |
| 1 | Feedback | 0.0 | 1.0 | 0.5 |  |
| 2 | Mix | 0.0 | 1.0 | 0.5 |  |
| 3 | Tone | 0.0 | 1.0 | 0.5 |  |
| 4 | Modulation | 0.0 | 1.0 | 0.5 |  |
| 5 | Level | 0.0 | 1.0 | 0.5 |  |
| 6 | Circuit | 0.0 | 1.0 | 0.5 |  |
| 7 | TapTempo | 0.0 | 1.0 | 0.5 |  |
| 8 | Wow | 0.0 | 1.0 | 0.5 |  |
| 9 | Flutter | 0.0 | 1.0 | 0.5 |  |
| 10 | FilterModeParam | 0.0 | 1.0 | 0.5 |  |
| 11 | MultiTap | 0.0 | 1.0 | 0.5 |  |
| 12 | ReverseMode | 0.0 | 1.0 | 0.5 |  |
| 13 | Ducking | 0.0 | 1.0 | 0.5 |  |

### EQ

- **Parameters**: 7
- **Presets**: 8
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 21
  - Preset tests: 8
  - Parameter smoothing tests: 7
  - **Subtotal**: 39 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Bass | 0.0 | 1.0 | 0.5 |  |
| 1 | Mid | 0.0 | 1.0 | 0.5 |  |
| 2 | Treble | 0.0 | 1.0 | 0.5 |  |
| 3 | MidFreq | 0.0 | 1.0 | 0.5 |  |
| 4 | Level | 0.0 | 1.0 | 0.5 |  |
| 5 | Q | 0.0 | 1.0 | 0.5 |  |
| 6 | Circuit | 0.0 | 1.0 | 0.5 |  |

#### Presets

1. Flat
2. BassBoost
3. TrebleBoost
4. MidScoop
5. VShape
6. Country
7. Blues
8. Jazz

### Fuzz

- **Parameters**: 12
- **Presets**: 0
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 36
  - Preset tests: 0
  - Parameter smoothing tests: 12
  - **Subtotal**: 51 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Fuzz | 0.0 | 1.0 | 0.5 |  |
| 1 | Tone | 0.0 | 1.0 | 0.5 |  |
| 2 | Contour | 0.0 | 1.0 | 0.5 |  |
| 3 | Gate | 0.0 | 1.0 | 0.5 |  |
| 4 | Volume | 0.0 | 1.0 | 0.5 |  |
| 5 | Stab | 0.0 | 1.0 | 0.5 |  |
| 6 | Circuit | 0.0 | 1.0 | 0.5 |  |
| 7 | Bias | 0.0 | 1.0 | 0.5 |  |
| 8 | InputTrim | 0.0 | 1.0 | 0.5 |  |
| 9 | GateMode | 0.0 | 1.0 | 0.5 |  |
| 10 | OctaveUp | 0.0 | 1.0 | 0.5 |  |
| 11 | MidScoop | 0.0 | 1.0 | 0.5 |  |

### NoiseGate

- **Parameters**: 6
- **Presets**: 8
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 18
  - Preset tests: 8
  - Parameter smoothing tests: 6
  - **Subtotal**: 35 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Threshold | 0.0 | 1.0 | 0.5 |  |
| 1 | Attack | 0.0 | 1.0 | 0.5 |  |
| 2 | Hold | 0.0 | 1.0 | 0.5 |  |
| 3 | Release | 0.0 | 1.0 | 0.5 |  |
| 4 | Hysteresis | 0.0 | 1.0 | 0.5 |  |
| 5 | Mix | 0.0 | 1.0 | 0.5 |  |

#### Presets

1. Silent
2. Medium
3. Open
4. Studio
5. Fast
6. Slow
7. Tracking
8. Transparent

### Overdrive

- **Parameters**: 12
- **Presets**: 0
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 36
  - Preset tests: 0
  - Parameter smoothing tests: 12
  - **Subtotal**: 51 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Drive | 0.0 | 1.0 | 0.5 |  |
| 1 | Tone | 0.0 | 1.0 | 0.5 |  |
| 2 | Bass | 0.0 | 1.0 | 0.5 |  |
| 3 | Mid | 0.0 | 1.0 | 0.5 |  |
| 4 | Treble | 0.0 | 1.0 | 0.5 |  |
| 5 | Level | 0.0 | 1.0 | 0.5 |  |
| 6 | Circuit | 0.0 | 1.0 | 0.5 |  |
| 7 | Presence | 0.0 | 1.0 | 0.5 |  |
| 8 | Bite | 0.0 | 1.0 | 0.5 |  |
| 9 | TightLoose | 0.0 | 1.0 | 0.5 |  |
| 10 | BrightCap | 0.0 | 1.0 | 0.5 |  |
| 11 | MidFocus | 0.0 | 1.0 | 0.5 |  |

### Reverb

- **Parameters**: 10
- **Presets**: 8
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 30
  - Preset tests: 8
  - Parameter smoothing tests: 10
  - **Subtotal**: 51 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Decay | 0.0 | 1.0 | 0.5 |  |
| 1 | Mix | 0.0 | 1.0 | 0.5 |  |
| 2 | Tone | 0.0 | 1.0 | 0.5 |  |
| 3 | PreDelay | 0.0 | 1.0 | 0.5 |  |
| 4 | Size | 0.0 | 1.0 | 0.5 |  |
| 5 | Diffusion | 0.0 | 1.0 | 0.5 |  |
| 6 | Modulation | 0.0 | 1.0 | 0.5 |  |
| 7 | Damping | 0.0 | 1.0 | 0.5 |  |
| 8 | Level | 0.0 | 1.0 | 0.5 |  |
| 9 | Type | 0.0 | 1.0 | 0.5 |  |

#### Presets

1. SmallRoom
2. LargeHall
3. VintagePlate
4. FenderSpring
5. ShimmerVerb
6. ModulatedVerb
7. ReverseVerb
8. GatedVerb

### Volume

- **Parameters**: 7
- **Presets**: 7
- **Test Count**:
  - Basic signal tests: 3
  - Parameter sweep tests: 21
  - Preset tests: 7
  - Parameter smoothing tests: 7
  - **Subtotal**: 38 tests

#### Parameters

| Index | Name | Min | Max | Default | Unit |
|-------|------|-----|-----|---------|------|
| 0 | Volume | 0.0 | 1.0 | 0.5 |  |
| 1 | Minimum | 0.0 | 1.0 | 0.5 |  |
| 2 | ExpressionMode | 0.0 | 1.0 | 0.5 |  |
| 3 | Reverse | 0.0 | 1.0 | 0.5 |  |
| 4 | Curve | 0.0 | 1.0 | 0.5 |  |
| 5 | Range | 0.0 | 1.0 | 0.5 |  |
| 6 | Level | 0.0 | 1.0 | 0.5 |  |

#### Presets

1. Standard
2. Expression
3. ReverseDir
4. LogCurve
5. Linear
6. LimitedRange
7. FullRange
