# Modular Control Surface Architecture - White Room Hardware Platform

**Date**: January 15, 2026
**Status**: Conceptual Design
**Philosophy**: Modular, reconfigurable, expandable control surface
**Based On**: On-hand component inventory

---

## Executive Summary

A fully modular control surface system that can be reconfigured for different workflows:
- **Audio Mixing**: 7 faders (6 tracks + master, or 4 subgroups + master)
- **Drum Machine**: LED button matrix (step sequencer)
- **Synthesis Control**: Banks of encoders/knobs with interchangeable caps
- **Transport Controls**: Dedicated section with motorized fader automation

**Key Innovation**: **Hot-pluggable modules** using SCH-BUS/1 protocol - reconfigure without firmware changes!

---

## Design Philosophy

### Modularity Principles

1. **Hot-Pluggable**: Add/remove modules without power cycling
2. **Layout-Driven**: Change functionality by swapping layout JSON files
3. **Capability-Based**: Modules declare capabilities, host binds semantics
4. **Mechanical Modularity**: Standardized panel sizes, mounting holes
5. **Electronic Modularity**: SCH-BUS/1 for data, standard power connectors

### Three-Layer Architecture (SCH-BUS/1)

```
┌─────────────────────────────────────────────┐
│ Layer 3 — White Room Engine                 │
│ • DSP, synthesis, effects, recording        │
└───────────────────────────▲─────────────────┘
                            │ control events
┌───────────────────────────┴─────────────────┐
│ Layer 2 — Control Plane (SCH-BUS/1 Host)    │
│ • Layout binding (module → control ID)      │
│ • Hot-plug detection                         │
│ • Feedback routing                           │
└───────────────────────────▲─────────────────┘
                            │ bus events
┌───────────────────────────┴─────────────────┐
│ Layer 1 — Hardware Modules (Modular!)       │
│ • Fader modules (7x motorized)              │
│ • Encoder modules (8x dual encoders)        │
│ • Button matrix modules (16x16 LEDs)        │
│ • Display modules (optional)                │
└─────────────────────────────────────────────┘
```

---

## Module Types

### Module 1: Fader Module (7-Channel)

**Components**:
- Behringer X32 motorized faders (x7)
- MCP23017 I/O expander (x2 = 32 I/O)
- TL072CN (x2) - Position sensing buffers

**Capabilities**:
```json
{
  "model": "fader_module_7ch",
  "power_class": "P3",
  "capabilities": {
    "inputs": [
      {"id": "fader.0", "type": "continuous", "resolution": 10},
      {"id": "fader.1", "type": "continuous", "resolution": 10},
      {"id": "fader.2", "type": "continuous", "resolution": 10},
      {"id": "fader.3", "type": "continuous", "resolution": 10},
      {"id": "fader.4", "type": "continuous", "resolution": 10},
      {"id": "fader.5", "type": "continuous", "resolution": 10},
      {"id": "fader.6", "type": "continuous", "resolution": 10}
    ],
    "outputs": [
      {"id": "motor.0", "type": "pwm", "channels": 1},
      {"id": "motor.1", "type": "pwm", "channels": 1},
      {"id": "motor.2", "type": "pwm", "channels": 1},
      {"id": "motor.3", "type": "pwm", "channels": 1},
      {"id": "motor.4", "type": "pwm", "channels": 1},
      {"id": "motor.5", "type": "pwm", "channels": 1},
      {"id": "motor.6", "type": "pwm", "channels": 1},
      {"id": "led.0-6", "type": "pwm", "channels": 1}
    ]
  }
}
```

**Panel Size**: 7 inches wide (1" per fader) × 3 inches deep

**Configuration A: 6 Tracks + Master**
```
┌─────────────────────────────────────────────┐
│  TR1  TR2  TR3  TR4  TR5  TR6  MST        │
│ [F]  [F]  [F]  [F]  [F]  [F]  [F]         │
│  ●    ●    ●    ●    ●    ●    ●          │
└─────────────────────────────────────────────┘
```

**Configuration B: 4 Subgroups + Master**
```
┌────────────────────────────────────┐
│  SUB1  SUB2  SUB3  SUB4  MST      │
│  [F]   [F]   [F]   [F]   [F]     │
│   ●     ●     ●     ●     ●       │
└────────────────────────────────────┘
```

**Key Features**:
- Motorized automation write
- Touch sensing (MPR121)
- LED feedback (clip, automation, selection)
- 10-bit ADC resolution (1024 steps)

---

### Module 2: Encoder/Knob Module (8-Channel)

**Components**:
- Dual encoders (x8) - if available, or single encoders
- 74HC595 shift registers (x3 = 24 outputs)
- ADC0808CCN (x1) - 8-channel ADC
- MCP23017 (x1) - Button/expansion

**Capabilities**:
```json
{
  "model": "encoder_module_8ch",
  "power_class": "P2",
  "capabilities": {
    "inputs": [
      {"id": "encoder.0.A", "type": "continuous", "resolution": 12},
      {"id": "encoder.0.B", "type": "continuous", "resolution": 12},
      {"id": "encoder.0.sw", "type": "trigger"},
      ...
    ],
    "outputs": [
      {"id": "led.0.R", "type": "pwm", "channels": 1},
      {"id": "led.0.G", "type": "pwm", "channels": 1},
      {"id": "led.0.B", "type": "pwm", "channels": 1},
      ...
    ]
  }
}
```

**Panel Size**: 8 inches wide × 2 inches deep

**Knob Modularity**:
- Interchangeable knob caps (variety of sizes)
- Push-to-select functionality
- LED ring feedback (24 LEDs per encoder)

**Configuration A: 8 Dual Encoders**
```
┌──────────────────────────────────────────────┐
│  [E1]  [E2]  [E3]  [E4]  [E5]  [E6]  [E7]  [E8] │
│  ●●    ●●    ●●    ●●    ●●    ●●    ●●    ●●   │
└──────────────────────────────────────────────┘
```

**Configuration B: 16 Single Encoders** (if dual not available)
```
┌─────────────────────────────────────────────────────────┐
│ [E1] [E2] [E3] [E4] [E5] [E6] [E7] [E8] [E9] [E10] ... │
│  ●    ●    ●    ●    ●    ●    ●    ●    ●    ●        │
└─────────────────────────────────────────────────────────┘
```

---

### Module 3: LED Button Matrix (Drum Machine)

**Two Design Approaches**:

#### 3A: PB86 Mechanical Button Matrix
**Components**:
- PB86 push buttons with LEDs (x64 for 8x8 matrix, or x16 for 4x4)
- 74HC595 shift registers (x8 = 64 outputs)
- MCP23017 (x4 = 64 inputs)

**Capabilities**:
```json
{
  "model": "button_matrix_8x8",
  "power_class": "P3",
  "capabilities": {
    "inputs": [
      {"id": "button.0.0", "type": "trigger"},
      {"id": "button.0.1", "type": "trigger"},
      ...
      {"id": "button.7.7", "type": "trigger"}
    ],
    "outputs": [
      {"id": "led.0.0", "type": "pwm", "channels": 1},
      {"id": "led.0.1", "type": "pwm", "channels": 1},
      ...
      {"id": "led.7.7", "type": "pwm", "channels": 1}
    ]
  }
}
```

**Panel Sizes**:
- BM-1x8: 4" × 1" (8 buttons)
- BM-2x4: 4" × 2" (8 buttons)
- BM-8x8: 8" × 8" (64 buttons)
- BM-8x16: 16" × 8" (128 buttons)

**Stacking System**:
- **Vertical stacking**: Stack BM-1x8 modules to create 3×8, 4×8 grids
- **Horizontal placement**: Place BM-1x8 side-by-side for 1×16, 1×24 rows
- **Hot-pluggable**: Unique addresses via hardware jumpers
- **Power sharing**: Bus sharing across stacked modules

**Configuration A: 8x8 Step Sequencer**
```
┌────────────────────────────────────┐
│ ● ● ● ● ● ● ● ●  (row 0 - kick)   │
│ ● ● ● ● ● ● ● ●  (row 1 - snare)  │
│ ● ● ● ● ● ● ● ●  (row 2 - hihat)  │
│ ● ● ● ● ● ● ● ●  (row 3 - tom 1)  │
│ ● ● ● ● ● ● ● ●  (row 4 - tom 2)  │
│ ● ● ● ● ● ● ● ●  (row 5 - clap)   │
│ ● ● ● ● ● ● ● ●  (row 6 - perc)   │
│ ● ● ● ● ● ● ● ●  (row 7 - accent) │
└────────────────────────────────────┘
```

**Configuration B: Stacked BM-1x8 (3×8 grid)**
```
┌─────────────────────────────────┐
│  BM-1x8 #3 (hi-hat patterns)   │
├─────────────────────────────────┤
│  BM-1x8 #2 (snare patterns)    │
├─────────────────────────────────┤
│  BM-1x8 #1 (kick patterns)     │
└─────────────────────────────────┘
```

**Features**:
- LED feedback (step status, playhead position)
- Tactile mechanical feel (PB86 buttons)
- Stackable design (build as needed)
- Multi-page support (8×8 → 16 steps via paging)

#### 3B: Capacitive Touch Button Matrix (Premium)
**Components**:
- MPR121 capacitive touch controllers (x11 for 128 channels)
- RGB LEDs (x128 for full RGB feedback)
- Light pipes (acrylic rods for even illumination)
- Polycarbonate overlay (2mm)

**Capabilities**:
```json
{
  "model": "capacitive_touch_8x8",
  "power_class": "P4",
  "capabilities": {
    "inputs": [
      {"id": "touch.0.0", "type": "continuous", "resolution": 8},
      {"id": "touch.0.1", "type": "continuous", "resolution": 8},
      ...
      {"id": "touch.7.7", "type": "continuous", "resolution": 8}
    ],
    "outputs": [
      {"id": "led.0.0", "type": "pwm", "channels": 3},
      {"id": "led.0.1", "type": "pwm", "channels": 3},
      ...
      {"id": "led.7.7", "type": "pwm", "channels": 3}
    ]
  }
}
```

**Module Sizes**:
- CTB-1x8: 4" × 1" (8 touch buttons)
- CTB-2x4: 4" × 2" (8 touch buttons)
- CTB-8x8: 8" × 8" (64 touch buttons)
- CTB-8x16: 16" × 8" (128 touch buttons)

**Features**:
- Velocity-sensitive (pressure mapping 0-255 → MIDI 1-127)
- RGB LED feedback per button
- Premium smooth feel (no mechanical parts)
- Aftertouch support (continuous pressure)
- Auto-calibration on startup

**Comparison**:
| Feature | PB86 Mechanical | Capacitive Touch |
|---------|-----------------|------------------|
| Tactile feedback | ✅ Mechanical click | ❌ Smooth surface |
| Velocity sensitivity | ❌ On/only | ✅ Pressure sensitive |
| Durability | 1M cycles | Infinite |
| LED integration | Built-in | Custom light pipes |
| Cost per button | $0.50 | $1.50 |
| Feel | Traditional | Premium/modern |

**Recommendation**:
- Use **PB86** for: Step sequencers, clip launchers (tactile preferred)
- Use **capacitive** for: Expression control, velocity-sensitive pads, premium interfaces

---

### Module 4: Transport Control

**Components**:
- PB86 push buttons with LEDs (x8)
- Behringer X32 motorized fader (x1) - scrub/shuttle
- MPR121 capacitive touch (x1) - transport buttons

**Capabilities**:
```json
{
  "model": "transport_control",
  "power_class": "P2",
  "capabilities": {
    "inputs": [
      {"id": "button.play", "type": "trigger"},
      {"id": "button.stop", "type": "trigger"},
      {"id": "button.record", "type": "trigger"},
      {"id": "button.scrub", "type": "continuous"},
      ...
    ],
    "outputs": [
      {"id": "led.play", "type": "pwm", "channels": 1},
      {"id": "led.stop", "type": "pwm", "channels": 1},
      {"id": "led.record", "type": "pwm", "channels": 3},
      ...
    ]
  }
}
```

**Panel Size**: 4 inches wide × 2 inches deep

**Layout**:
```
┌────────────────────────────────────┐
│  [◄]  [■]  [●]  [█]  [LOC]        │
│  REW  STOP PLAY  REC   WRITE       │
│                                  │
│  [============ SCRUB ============] │
└────────────────────────────────────┘
```

---

### Module 5: Display Module (Optional)

**Components**:
- Not in current inventory (future addition)
- Could use OLED displays (SSD1306, etc.)
- Or character LCDs (16x2, 20x4)

**Capabilities**:
- Track names
- Parameter values
- Timecode display
- Metering

---

## Modular Mounting System

### Mechanical Design

**Panel Standardization**:
- **Height**: 3 inches (Eurorack compatible, 3U)
- **Depth**: 4 inches from front panel
- **Mounting Holes**: Standard 3.5" spacing (Eurorack)
- **Panel Thickness**: 1/8" aluminum or FR4

**Module Sizes**:
- **1U**: 1 inch wide (small knobs, buttons)
- **2U**: 2 inches wide (transport, small controls)
- **4U**: 4 inches wide (fader modules, small encoders)
- **8U**: 8 inches wide (8 encoders, 8x8 button matrix)
- **14U**: 14 inches wide (7 faders + transport)

**Mounting Rail System**:
```
┌────────────────────────────────────────────────────┐
│  TOP RAIL (mounted to chassis)                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ MOD │ │ MOD │ │ MOD │ │ MOD │ │ MOD │ ...   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│  BOTTOM RAIL                                      │
└────────────────────────────────────────────────────┘
```

**Power Distribution**:
- **Power Bus**: Schottky diode OR-ing for hot-plug
- **Connectors**: Molex KK or similar
- **Voltage Rails**: +5V, +3.3V, ±12V (if needed)
- **Power Classes**: P0-P5 (50mA to negotiated)

**SCH-BUS/1 Bus**:
- **Physical**: USB-C (primary), UART (backup)
- **Topology**: Daisychain or star (your choice)
- **Hot-Plug**: Supported (enumeration on connect)

---

## Configuration Examples

### Configuration 1: Audio Mixing Console

**Modules**:
- 1x Fader Module (7 faders)
- 1x Transport Module
- 1x Encoder Module (8 encoders for pan/send)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  TR1  TR2  TR3  TR4  TR5  TR6  MST                │
│  [F]  [F]  [F]  [F]  [F]  [F]  [F]                 │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  [◄]  [■]  [●]  [█]  [LOC]                      │
│  [E1] [E2] [E3] [E4] [E5] [E6] [E7] [E8]         │
└─────────────────────────────────────────────────────┘
```

**SCH-BUS/1 Layout Binding**:
```json
{
  "layout_name": "audio_mixer_6ch",
  "bindings": [
    {"module": "fader_module_7ch", "endpoint": "fader.0", "control_id": "MIX.CH0.FADER"},
    {"module": "fader_module_7ch", "endpoint": "fader.1", "control_id": "MIX.CH1.FADER"},
    ...
    {"module": "fader_module_7ch", "endpoint": "fader.6", "control_id": "MIX.MASTER.FADER"},
    {"module": "encoder_module_8ch", "endpoint": "encoder.0.A", "control_id": "MIX.CH0.PAN"},
    ...
    {"module": "transport_control", "endpoint": "button.play", "control_id": "TRANSPORT.PLAY"}
  ]
}
```

---

### Configuration 2: Drum Machine Controller

**Modules**:
- 1x LED Button Matrix (8x8)
- 1x Encoder Module (8 encoders for parameter control)
- 1x Transport Module

**Layout**:
```
┌────────────────────────────────────────────┐
│ ● ● ● ● ● ● ● ●  (step 0)                │
│ ● ● ● ● ● ● ● ●  (step 1)                │
│ ● ● ● ● ● ● ● ●  (step 2)                │
│ ● ● ● ● ● ● ● ●  (step 3)                │
│ ● ● ● ● ● ● ● ●  (step 4)                │
│ ● ● ● ● ● ● ● ●  (step 5)                │
│ ● ● ● ● ● ● ● ●  (step 6)                │
│ ● ● ● ● ● ● ● ●  (step 7)                │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│  [E1] [E2] [E3] [E4] [E5] [E6] [E7] [E8] │
│  BPM  SW  VE  PT  AC  RE  DU              │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│  [◄]  [■]  [●]  [█]                      │
└────────────────────────────────────────────┘
```

**SCH-BUS/1 Layout Binding**:
```json
{
  "layout_name": "drum_machine_sequencer",
  "bindings": [
    {"module": "button_matrix_8x8", "endpoint": "button.0.0", "control_id": "DRUM.SEQ.0.STEP0"},
    {"module": "button_matrix_8x8", "endpoint": "button.0.1", "control_id": "DRUM.SEQ.0.STEP1"},
    ...
    {"module": "encoder_module_8ch", "endpoint": "encoder.0.A", "control_id": "DRUM.BPM"},
    {"module": "encoder_module_8ch", "endpoint": "encoder.0.B", "control_id": "DRUM.SWING"},
    ...
  ]
}
```

---

### Configuration 3: Synthesis Control Surface

**Modules**:
- 2x Encoder Module (16 encoders total)
- 1x Fader Module (7 faders for ADSR/mixer)
- 1x Transport Module

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  [E1] [E2] [E3] [E4] [E5] [E6] [E7] [E8]         │
│  VCF VCA RES DR1 AT1 AT2 AT3 AT4                 │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  [E9] [E10] [E11] [E12] [E13] [E14] [E15] [E16] │
│  LFO1 LFO2 DEL REV CH1 CH2 CH3 CH4              │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  ADSR1 ADSR2 ADSR3 ADSR4 MIX1 MIX2 MIX3 MST     │
│  [F]   [F]   [F]   [F]   [F]   [F]   [F]       │
└────────────────────────────────────────────────────┘
```

---

## Knob Modularity System

### Interchangeable Knob Caps

**Your Inventory**: "Variety of knob sizes"

**Knob Types**:
1. **Small** (0.5" diameter) - High-resolution encoders
2. **Medium** (0.75" diameter) - Standard encoders
3. **Large** (1.0" diameter) - Faders, main controls
4. **Push-Button** - Built-in switches
5. **Center-Detent** - Pan, balance controls
6. **LED Ring** - Visual feedback

**Mounting System**:
- **Standard Shaft**: D-shaped or 6mm diameter
- **Set Screw**: Secure attachment
- **Color-Coded**: By function (red = filter, green = envelope, etc.)

**Configuration Examples**:
```
Module: Encoder Module (8-Channel)
Row 1: Large knobs (main parameters)
Row 2: Medium knobs (secondary parameters)
Row 3: Small knobs (fine adjustments)
Row 4: Push-button knobs (select, enter)
```

---

## SCH-BUS/1 Manifest System

### Module Discovery

Each module has a JSON manifest that declares capabilities:

**Example: Fader Module**
```json
{
  "schema": "sch-hw-manifest/1",
  "model": "fader_module_7ch",
  "power_class": "P3",
  "capabilities": {
    "inputs": [
      {
        "id": "fader.0",
        "type": "continuous",
        "resolution": 10,
        "curve": "linear",
        "description": "Track 1 fader"
      }
    ],
    "outputs": [
      {
        "id": "led.0",
        "type": "pwm",
        "channels": 1,
        "description": "Track 1 clip LED"
      },
      {
        "id": "motor.0",
        "type": "pwm",
        "channels": 1,
        "description": "Track 1 fader motor"
      }
    ]
  }
}
```

### Layout Binding

Change functionality without firmware changes:

**Example A: Audio Mixer**
```json
{
  "layout_name": "audio_mixer_6ch",
  "bindings": [
    {"endpoint": "fader.0", "control_id": "MIX.CH0.FADER"},
    {"endpoint": "encoder.0.A", "control_id": "MIX.CH0.PAN"}
  ]
}
```

**Example B: DAW Transport**
```json
{
  "layout_name": "daw_transport",
  "bindings": [
    {"endpoint": "fader.0", "control_id": "TRANSPORT.SCRUB"},
    {"endpoint": "encoder.0.A", "control_id": "TRANSPORT.SPEED"}
  ]
}
```

**Example C: Drum Machine**
```json
{
  "layout_name": "drum_sequencer",
  "bindings": [
    {"endpoint": "button.0.0", "control_id": "DRUM.KICK.STEP0"},
    {"endpoint": "encoder.0.A", "control_id": "DRUM.BPM"}
  ]
}
```

---

## Power Budget

### Module Power Consumption

| Module | Quantity | Current (mA) | Voltage (V) | Power (mW) |
|--------|----------|--------------|-------------|------------|
| Fader Module | 1 | 200 | 5 | 1000 |
| Encoder Module | 1 | 100 | 3.3 | 330 |
| Button Matrix | 1 | 150 | 5 | 750 |
| Transport | 1 | 80 | 3.3 | 264 |
| **Total** | | **530** | | **2344** |

**USB Power Limit**: 500mA (typical)
**Solution**: External power supply (5V 2A recommended)

---

## Next Steps

### Phase 1: Fader Module (Immediate)

**Why**: You have 7 motorized faders ready to use
**Timeline**: 1-2 weeks
**Components**: All on-hand

**Tasks**:
1. Design schematic (7 faders + MCP23017 + ADC)
2. Design panel (7" wide, 3" high)
3. Build prototype (perfboard or PCB)
4. Test motor control
5. Test position sensing
6. Integrate SCH-BUS/1

### Phase 2: Button Matrix (Week 3-4)

**Why**: Essential for drum machine workflow
**Timeline**: 2 weeks
**Components**: PB86 buttons (x64), 74HC595 (x8)

**Tasks**:
1. Design matrix scanning circuit
2. Design LED feedback system
3. Build 4x4 or 8x8 matrix
4. Test velocity sensitivity
5. Integrate SCH-BUS/1

### Phase 3: Encoder Module (Week 5-6)

**Why**: Synthesis control, parameter editing
**Timeline**: 2 weeks
**Components**: Encoders + ADC + 74HC595

**Tasks**:
1. Design encoder circuit (quadrature or ADC)
2. Design knob mounting system
3. Build 8-channel module
4. Test knob modularity
5. Integrate SCH-BUS/1

### Phase 4: Transport Module (Week 7)

**Why**: DAW control essential
**Timeline**: 1 week
**Components**: PB86 buttons + 1 fader

**Tasks**:
1. Design transport controls
2. Design scrub wheel
3. Build module
4. Test automation write
5. Integrate SCH-BUS/1

---

## Decision Time

**What to build first?**

1. **Fader Module** - 7 motorized faders (most impressive)
2. **Button Matrix** - Drum machine step sequencer
3. **Encoder Module** - Synthesis parameter control
4. **Transport Module** - DAW transport controls

**My Recommendation**: Start with **Fader Module**
- Uses your 7 Behringer faders immediately
- Impressive visual (7 motorized faders!)
- Foundation for all other modules
- Validates SCH-BUS/1 motor control

**Second**: **Button Matrix** (4x4 or 8x8)
- You have 80 PB86 buttons with LEDs
- Perfect for drum machine
- Fun to use and demonstrate

**Third**: **Encoder Module**
- Complete the control surface
- Add parameter editing

---

## Questions for You

1. **Fader Configuration**: 6 tracks + master, or 4 subgroups + master?
2. **Button Matrix**: 4x4 (16 buttons) or 8x8 (64 buttons)?
3. **Encoders**: Do you have dual encoders, or just single?
4. **Knob Sizes**: What sizes do you have? What's your preference?
5. **Panel Material**: Aluminum, FR4, 3D printed?
6. **Power Supply**: USB power or external supply?
7. **Chassis**: Rack mount, desktop, or custom?

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
