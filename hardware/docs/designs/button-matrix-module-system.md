# Button Matrix Module System - Drum Machine Control

## Overview

Modular button matrix system using PB86 push buttons with integrated LEDs. Designed for drum machine step sequencing, pattern triggering, and grid-based control interfaces.

**Key Features:**
- Stackable modules (vertical stacking for larger grids)
- Row-able modules (horizontal placement for longer patterns)
- Hot-pluggable via SCH-BUS/1
- Capacitive touch sensing with MPR121
- RGB LED feedback per button
- Standardized panel sizes

---

## Module Types

### 1. BM-1x8 (Button Matrix 1×8)

**Use Case**: Single row step sequencer, mini pattern trigger

**Panel Size**: 4" × 1" (100mm × 25mm)

**Components**:
- PB86 buttons with LEDs: 8
- MPR121 capacitive touch: 1 (12 channels, use 8)
- 74HC595 shift registers: 1 (8-bit LED control)
- MCP23017 I/O expander: 1 (16 I/O, use 8 for button state)

**SCH-BUS/1 Capabilities**:
```json
{
  "module_type": "button_matrix_1x8",
  "button_count": 8,
  "rows": 1,
  "cols": 8,
  "led_feedback": true,
  "capacitive_touch": true
}
```

**Mounting**:
- 4x M3 mounting holes (corners)
- Stacking connectors: 2×8-pin headers (top/bottom)
- Power bus sharing

**Applications**:
- Drum machine step sequencer (1 row = 1 instrument)
- Mini pattern launcher (8 patterns)
- Single control row

---

### 2. BM-2x4 (Button Matrix 2×4)

**Use Case**: Compact pattern grid, 2-instrument sequencer

**Panel Size**: 4" × 2" (100mm × 50mm)

**Components**:
- PB86 buttons with LEDs: 8
- MPR121 capacitive touch: 1 (use 8)
- 74HC595 shift registers: 1 (8-bit)
- MCP23017 I/O expander: 1 (use 8)

**SCH-BUS/1 Capabilities**:
```json
{
  "module_type": "button_matrix_2x4",
  "button_count": 8,
  "rows": 2,
  "cols": 4,
  "led_feedback": true,
  "capacitive_touch": true
}
```

**Mounting**:
- 4x M3 mounting holes
- Stacking connectors: 2×8-pin headers (top/bottom)
- Can stack vertically to make 4×4, 6×4, 8×4

**Applications**:
- 2-instrument step sequencer
- Compact pattern grid
- Transport + trigger section

---

### 3. BM-8x8 (Button Matrix 8×8)

**Use Case**: Full drum machine step sequencer (8 instruments × 16 steps)

**Panel Size**: 8" × 8" (200mm × 200mm)

**Components**:
- PB86 buttons with LEDs: 64
- MPR121 capacitive touch: 6 (72 channels total, use 64)
- 74HC595 shift registers: 8 (64-bit LED control, 8 per chain)
- MCP23017 I/O expanders: 4 (64 I/O, 16 per chip)

**SCH-BUS/1 Capabilities**:
```json
{
  "module_type": "button_matrix_8x8",
  "button_count": 64,
  "rows": 8,
  "cols": 8,
  "led_feedback": true,
  "capacitive_touch": true,
  "multi_page": true
}
```

**Multi-Page Support**:
- 8×8 buttons can control 16 steps via page switching
- Page 1: steps 1-8
- Page 2: steps 9-16
- LED indicates current page

**Mounting**:
- 4x M3 mounting holes (corners)
- Stacking connectors: 2×16-pin headers (top/bottom for expansion)
- Optional side connectors for horizontal expansion (8×16)

**Applications**:
- Classic 8-instrument drum machine
- 64-step pattern grid
- MIDI piano roll (pitch × time)
- Parameter grid (8 params × 8 presets)

---

### 4. BM-8x16 (Button Matrix 8×16)

**Use Case**: Full drum machine with 16 steps visible

**Panel Size**: 16" × 8" (400mm × 200mm)

**Components**:
- PB86 buttons with LEDs: 128
- MPR121 capacitive touch: 11 (132 channels, use 128)
- 74HC595 shift registers: 16 (128-bit LED control)
- MCP23017 I/O expanders: 8 (128 I/O)

**SCH-BUS/1 Capabilities**:
```json
{
  "module_type": "button_matrix_8x16",
  "button_count": 128,
  "rows": 8,
  "cols": 16,
  "led_feedback": true,
  "capacitive_touch": true
}
```

**Mounting**:
- 6x M3 mounting holes (reinforced for larger panel)
- Side connectors for horizontal expansion (16×16, 8×24)
- Top/bottom stacking for 16×16, 24×16

**Applications**:
- Full drum machine (8 instruments × 16 steps)
- 2× 8×8 grids side-by-side
- Large pattern launchpad

---

## Stacking System

### Vertical Stacking (Add More Rows)

Stack BM-1x8 or BM-2x4 modules vertically to create taller grids:

```
┌─────────────┐
│  BM-1x8 #3  │ ← Row 3 (hi-hat patterns)
├─────────────┤
│  BM-1x8 #2  │ ← Row 2 (snare patterns)
├─────────────┤
│  BM-1x8 #1  │ ← Row 1 (kick patterns)
└─────────────┘
```

**Result**: 3×8 button grid (3 instruments × 8 steps)

**Stacking Connectors**:
- 2×8-pin headers (power + data)
- Power bus shared across all stacked modules
- SCH-BUS/1 daisy-chain (unique addresses via jumpers)

**Address Assignment**:
- Hardware jumpers on each module (0-7)
- Module #1: address 0x10, Module #2: address 0x11, etc.

### Horizontal Placement (Longer Patterns)

Place BM-1x8 modules side-by-side:

```
┌─────────┐┌─────────┐┌─────────┐
│BM-1x8 #1││BM-1x8 #2││BM-1x8 #3│
└─────────┘└─────────┘└─────────┘
```

**Result**: 1×24 button row (24-step sequencer)

**Mounting**:
- Standard rail mounting (Eurorack-style or custom)
- Interlocking tabs for alignment
- D-sub connectors for data/power linking

---

## Capacitive Touch Integration

### MPR121 Configuration

Each MPR121 provides 12 capacitive touch channels:

**BM-1x8**: 1× MPR121 (use 8 channels, 4 spare)
**BM-2x4**: 1× MPR121 (use 8 channels)
**BM-8x8**: 6× MPR121 (64 channels)
**BM-8x16**: 11× MPR121 (128 channels)

**Touch Thresholds**:
- Touch threshold: 0x0F (15)
- Release threshold: 0x0A (10)
- Debounce: 4 samples
- Filter configuration: soft + medium filtering

**I2C Addressing**:
- Base address: 0x5A
- Address select pins: 3 pins (addr0, addr1, addr2)
- 8 possible addresses per I2C bus
- Multiple I2C buses via Teensy 4.1 (Wire, Wire1, Wire2)

---

## LED Feedback System

### 74HC595 Shift Register Chains

**Per-Button RGB Control**:
PB86 has single-color LED (red/green/yellow depending on variant). For RGB, use separate LEDs per button.

**BM-1x8**: 1× 74HC595 (8-bit, 8 LEDs)
**BM-2x4**: 1× 74HC595 (8-bit, 8 LEDs)
**BM-8x8**: 8× 74HC595 (64-bit, 64 LEDs)
**BM-8x16**: 16× 74HC595 (128-bit, 128 LEDs)

**LED Colors**:
- Off: Step disabled
- Red: Step active (velocity high)
- Green: Step active (velocity low)
- Yellow: Step active (velocity medium)
- Blinking: Current play position

**Brightness Control**:
- PWM via Teensy 4.1 (OE pin on 74HC595)
- 8 brightness levels (0-7)
- Per-bank brightness control (4 banks in BM-8x8)

---

## SCH-BUS/1 Manifest Examples

### BM-1x8 Manifest

```json
{
  "module_type": "button_matrix",
  "model": "BM_1x8_v1",
  "version": "1.0.0",
  "manufacturer": "White Room",

  "capabilities": [
    {
      "type": "button_grid",
      "rows": 1,
      "cols": 8,
      "button_count": 8,
      "address": "button_1x8_0"
    },
    {
      "type": "led_feedback",
      "led_count": 8,
      "rgb": false,
      "address": "led_1x8_0"
    },
    {
      "type": "capacitive_touch",
      "channel_count": 8,
      "address": "touch_1x8_0"
    }
  ],

  "power": {
    "voltage": "5V",
    "current_typical": 150,
    "current_peak": 300
  }
}
```

### BM-8x8 Manifest

```json
{
  "module_type": "button_matrix",
  "model": "BM_8x8_v1",
  "version": "1.0.0",
  "manufacturer": "White Room",

  "capabilities": [
    {
      "type": "button_grid",
      "rows": 8,
      "cols": 8,
      "button_count": 64,
      "address": "button_8x8_0"
    },
    {
      "type": "led_feedback",
      "led_count": 64,
      "rgb": false,
      "address": "led_8x8_0",
      "brightness_control": true
    },
    {
      "type": "capacitive_touch",
      "channel_count": 64,
      "address": "touch_8x8_0"
    },
    {
      "type": "multi_page",
      "pages": 2,
      "page_indicator": "led"
    }
  ],

  "power": {
    "voltage": "5V",
    "current_typical": 800,
    "current_peak": 1200
  }
}
```

---

## Layout Bindings (Drum Machine)

### 8-Instrument Drum Machine (BM-8x8)

```json
{
  "layout_name": "drum_machine_8x16",
  "layout_version": "1.0.0",

  "bindings": [
    {
      "capability": "button_grid",
      "address": "button_8x8_0",
      "semantic": "step_sequencer",
      "mapping": {
        "rows": [
          "kick",
          "snare",
          "hi_hat_closed",
          "hi_hat_open",
          "clap",
          "rim",
          "crash",
          "ride"
        ],
        "cols": ["steps_1_8"],
        "page_switching": true
      }
    },
    {
      "capability": "led_feedback",
      "address": "led_8x8_0",
      "semantic": "step_indication",
      "mapping": {
        "states": {
          "off": "step_disabled",
          "red": "velocity_high",
          "green": "velocity_low",
          "yellow": "velocity_medium",
          "blinking": "play_position"
        }
      }
    },
    {
      "capability": "capacitive_touch",
      "address": "touch_8x8_0",
      "semantic": "velocity_sensitivity",
      "mapping": {
        "pressure": "velocity_aftertouch"
      }
    }
  ]
}
```

---

## Mechanical Design

### Panel Specifications

**Material**: Aluminum 2mm (brushed finish, black anodized)

**Button Cutouts**:
- PB86 button: 12.5mm diameter
- Spacing: 15mm grid (0.6" × 0.6")
- LED lens: 5mm diameter (centered in button)

**Mounting Holes**:
- M3 threaded inserts (4 per module)
- Corner reinforcement (BM-8x8, BM-8x16)

**Stacking Connectors**:
- 2×8-pin headers (2.54mm pitch)
- Shrouded headers (polarized)
- Keying for correct alignment

### Stacking Mechanism

**Vertical Stacking**:
```
┌──────────────────────────────┐
│     Top Stacking Header      │ ← Male pins pointing down
├──────────────────────────────┤
│                              │
│      [BM-1x8 Module #2]      │
│                              │
├──────────────────────────────┤
│    Bottom Stacking Header    │ ← Female socket receiving above
├──────────────────────────────┤
│     Top Stacking Header      │ ← Male pins pointing down
├──────────────────────────────┤
│                              │
│      [BM-1x8 Module #1]      │
│                              │
├──────────────────────────────┤
│    Bottom Stacking Header    │ ← Female socket receiving above
└──────────────────────────────┘
```

**Alignment Features**:
- Alignment pins (2x per side)
- Detent clips for secure stacking
- 10mm stacking height (module + connector gap)

**Horizontal Expansion**:
- Side-mounted D-sub 9-pin connectors
- Alignment tabs
- Optional mounting rail

---

## Power Distribution

### Power Requirements (Per Module)

**BM-1x8**: 150mA typical, 300mA peak
**BM-2x4**: 150mA typical, 300mA peak
**BM-8x8**: 800mA typical, 1200mA peak
**BM-8x16**: 1.5A typical, 2A peak

**Power Bus Sharing**:
- 5V rail shared across stacked modules
- Each module has local 3.3V regulator for Teensy/MCP23017
- LED power distributed via main 5V rail

**Recommended Power Supply**:
- For BM-1x8 (×3 stacked): 5V 1A (500mA typical)
- For BM-8x8: 5V 2A (1.2A peak)
- For BM-8x16: 5V 3A (2A peak)

---

## Bill of Materials

### BM-1x8 Kit

| Component | Qty | Cost |
|-----------|-----|------|
| PB86 button with LED | 8 | $4.00 |
| MPR121 capacitive touch | 1 | $1.50 |
| 74HC595 shift register | 1 | $0.50 |
| MCP23017 I/O expander | 1 | $1.50 |
| Teensy 4.1 | 1 | $0 (on-hand) |
| Aluminum panel (2mm) | 1 | $5.00 |
| Stacking headers | 2 | $1.00 |
| PCB (custom) | 1 | $10.00 |
| **Total** | | **$23.50** |

### BM-8x8 Kit

| Component | Qty | Cost |
|-----------|-----|------|
| PB86 button with LED | 64 | $32.00 |
| MPR121 capacitive touch | 6 | $9.00 |
| 74HC595 shift register | 8 | $4.00 |
| MCP23017 I/O expander | 4 | $6.00 |
| Teensy 4.1 | 1 | $0 (on-hand) |
| Aluminum panel (2mm) | 1 | $20.00 |
| Stacking headers | 4 | $2.00 |
| PCB (custom) | 1 | $30.00 |
| **Total** | | **$103.00** |

**On-Hand Components**:
- All PB86 buttons (×80 on-hand)
- All MPR121 chips (×24 on-hand)
- All MCP23017 chips (×11 on-hand)
- All 74HC595 chips (×210 on-hand)
- Teensy 4.1 (on-hand)

**Additional Cost**:
- BM-1x8: $13 (panels + PCB + connectors)
- BM-8x8: $52 (panels + PCB + connectors)

---

## Assembly Timeline

### BM-1x8
- Day 1: PCB design and order
- Day 3: Panel design and order
- Day 7: Components arrive, assembly
- Day 8: Testing and integration
- **Total**: 1 week

### BM-8x8
- Day 1: PCB design and order
- Day 3: Panel design and order
- Day 10: Components arrive, assembly
- Day 12: Testing and integration
- **Total**: 2 weeks

---

## Testing Checklist

### Hardware Testing
- [ ] All buttons register press/release
- [ ] Capacitive touch sensitivity adjusted
- [ ] LED feedback colors correct
- [ ] Stacking connectors make reliable contact
- [ ] Power consumption within spec

### SCH-BUS/1 Testing
- [ ] HELLO message on power-up
- [ ] WELCOME response from host
- [ ] MANIFEST reports correct capabilities
- [ ] BUTTON_EVENT messages sent on press
- [ ] LED_FEEDBACK messages received and applied
- [ ] Hot-plug detection (plug/unplug while running)

### Integration Testing
- [ ] Stacked modules enumerate with unique addresses
- [ ] Layout binding switches semantics (mixer → sequencer)
- [ ] LED feedback updates from DAW
- [ ] Touch pressure mapped to velocity

---

## Success Criteria

1. ✅ **Button press registers via capacitive touch**
2. ✅ **LED feedback shows step state**
3. ✅ **Multiple modules stack with unique addresses**
4. ✅ **SCH-BUS/1 enumeration works hot-plug**
5. ✅ **Layout binding changes button semantics**
6. ✅ **Power consumption within supply limits**

---

## Next Steps

1. **Start with BM-1x8** (simplest, validates core design)
2. **Build 3× BM-1x8** (stack to make 3×8 grid)
3. **Test drum machine layout** (3 instruments × 8 steps)
4. **Scale to BM-8x8** (full 8-instrument drum machine)
5. **Expand to BM-8x16** (16-step patterns visible)

---

## Design Flexibility

**Modularity Benefits**:
- Start small (BM-1x8) and expand
- Stack vertically (more instruments)
- Arrange horizontally (longer patterns)
- Mix module types (1x8 + 2x4 + 8x8)
- Reconfigure via layout files (no firmware changes)

**Example Configurations**:
- **Minimal**: 1× BM-1x8 (8-step sequencer for 1 instrument)
- **Compact**: 2× BM-2x4 stacked (2 instruments × 4 steps)
- **Standard**: 1× BM-8x8 (8 instruments × 8 steps, paged to 16)
- **Deluxe**: 1× BM-8x16 (8 instruments × 16 steps full view)
- **Mega**: 2× BM-8x16 stacked (16 instruments × 16 steps)
