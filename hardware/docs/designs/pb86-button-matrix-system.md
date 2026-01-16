# PB86 Mechanical Button Matrix System

## Overview

**Traditional mechanical button matrix** using PB86 push buttons with **built-in LEDs**. Designed for tactile feedback and reliable step sequencing.

**Key Features**:
- Mechanical tactile feel (clicky feedback)
- Built-in LEDs (simple integration)
- Stackable modules (vertical stacking)
- Cost-effective (uses on-hand components)
- Perfect for: Step sequencers, clip launchers, drum machines

---

## Button Module Types

### BM-1x8 (Button Matrix 1×8)

**Use Case**: Single row step sequencer, pattern trigger row

**Panel Size**: 4" × 1" (100mm × 25mm)

**Components**:
- PB86 push buttons with LEDs: 8
- MCP23017 I/O expander: 1 (16 I/O, use 8 for buttons)
- 74HC595 shift register: 1 (8-bit LED control)
- Current limiting resistors: 8 (1 per LED)

**SCH-BUS/1 Capabilities**:
```json
{
  "module_type": "button_matrix_mechanical",
  "model": "BM_1x8_v1",
  "button_count": 8,
  "rows": 1,
  "cols": 8,
  "led_feedback": true,
  "tactile": true
}
```

**Stacking**:
- Vertical stacking headers (2×8-pin)
- Stack 3× BM-1x8 → 3×8 grid (3 instruments × 8 steps)
- Unique addresses via hardware jumpers

---

### BM-2x4 (Button Matrix 2×4)

**Use Case**: Compact grid, mini drum machine

**Panel Size**: 4" × 2" (100mm × 50mm)

**Components**:
- PB86 push buttons with LEDs: 8
- MCP23017 I/O expander: 1
- 74HC595 shift register: 1

**Applications**:
- 2-instrument drum machine
- Compact pattern launcher
- Transport + trigger section

---

### BM-4x4 (Button Matrix 4×4)

**Use Case**: Small drum machine, clip launcher

**Panel Size**: 4" × 4" (100mm × 100mm)

**Components**:
- PB86 push buttons with LEDs: 16
- MCP23017 I/O expander: 1 (use all 16 I/O)
- 74HC595 shift register: 2 (16-bit LED control)

**Applications**:
- 4-instrument drum machine
- 16-clip launcher
- Parameter grid

---

### BM-8x8 (Button Matrix 8×8)

**Use Case**: Full drum machine, large clip launcher

**Panel Size**: 8" × 8" (200mm × 200mm)

**Components**:
- PB86 push buttons with LEDs: 64
- MCP23017 I/O expanders: 4 (64 I/O, 16 per chip)
- 74HC595 shift registers: 8 (64-bit LED control)

**Power**:
- LEDs: 64 × 20mA = 1.28A (all on)
- Typical: 640mA (50% duty cycle)

**Applications**:
- 8-instrument drum machine
- 64-clip launcher
- MIDI piano roll

---

### BM-8x16 (Button Matrix 8×16)

**Use Case**: Full-featured drum machine with 16 steps visible

**Panel Size**: 16" × 8" (400mm × 200mm)

**Components**:
- PB86 push buttons with LEDs: 128
- MCP23017 I/O expanders: 8 (128 I/O)
- 74HC595 shift registers: 16 (128-bit LED control)

**Power**:
- LEDs: 128 × 20mA = 2.56A (all on)
- Typical: 1.28A (50% duty cycle)

**Applications**:
- Full drum machine (8 instruments × 16 steps)
- 128-clip launcher
- Large control surface

---

## Stacking System

### Vertical Stacking (Add More Rows)

**Stack BM-1x8 modules vertically**:

```
┌─────────────────────────────────┐
│  BM-1x8 #3 (hi-hat patterns)   │ ← Row 3
├─────────────────────────────────┤
│  BM-1x8 #2 (snare patterns)    │ ← Row 2
├─────────────────────────────────┤
│  BM-1x8 #1 (kick patterns)     │ ← Row 1
└─────────────────────────────────┘
```

**Result**: 3×8 button grid (3 instruments × 8 steps)

**Stacking Features**:
- 2×8-pin stacking headers (top/bottom)
- Power bus shared across modules
- Unique addresses via hardware jumpers (0-7)
- SCH-BUS/1 daisy-chain

**Hardware Jumpers** (address assignment):
```
Jumper Setting | I2C Address
---------------+-------------
0 0 0          | 0x20
0 0 1          | 0x21
0 1 0          | 0x22
0 1 1          | 0x23
1 0 0          | 0x24
1 0 1          | 0x25
1 1 0          | 0x26
1 1 1          | 0x27
```

### Horizontal Placement (Longer Rows)

**Place BM-1x8 modules side-by-side**:

```
┌─────────┐┌─────────┐┌─────────┐
│BM-1x8 #1││BM-1x8 #2││BM-1x8 #3│
└─────────┘└─────────┘└─────────┘
```

**Result**: 1×24 button row (24-step sequencer)

**Mounting**:
- Standard rail mounting (Eurorack-style)
- Interlocking tabs for alignment
- D-sub 9-pin connectors for data/power

---

## Panel Design

### Cutout Dimensions

**PB86 Button Cutout**:
- Diameter: 12.5mm (0.49")
- Mounting holes: M2.5 threaded (4 per button)
- Spacing: 15mm center-to-center (0.6")

**LED Integration**:
- PB86 has built-in LED (no separate LED needed)
- LED shines through button cap
- Button cap available in clear/red/green/yellow

**Panel Materials**:
- Aluminum 2mm (standard)
- Brushed finish, black anodized
- Laser-etched labels

**Panel Layout Example** (BM-1x8):
```
┌──────────────────────────────────────┐
│  [Btn] [Btn] [Btn] [Btn] [Btn] [Btn] │
│   1     2     3     4     5     6    │
│  [Btn] [Btn]                        │
│   7     8                           │
└──────────────────────────────────────┘
```

**Button Labeling**:
- Number below each button (1-8)
- Instrument label to left (kick, snare, etc.)
- Step number above (1-16)

---

## LED Feedback System

### PB86 Built-in LED

**LED Characteristics**:
- Single-color LED (red, green, yellow, or clear)
- Forward voltage: 2.0V (red) or 3.0V (green/yellow)
- Forward current: 20mA max
- Built into button body

**LED States**:
- **Off**: Step disabled
- **On**: Step active
- **Blinking**: Current play position
- **Brightness**: Indicates velocity (optional)

**Current Limiting** (5V supply):
```
R_led = (5V - V_led) / 0.020A

Red LED:    (5V - 2.0V) / 0.020A = 150Ω
Green LED:  (5V - 3.0V) / 0.020A = 100Ω
```

**Use**: 150Ω for red, 100Ω for green/yellow

### 74HC595 Shift Register Control

**Per-BM-1x8**: 1× 74HC595 (8-bit)
**Per-BM-8x8**: 8× 74HC595 (64-bit)

**PWM Dimming**:
- Hardware PWM via Teensy 4.1
- OE (output enable) pin on 74HC595
- 8 brightness levels (0-7)
- Per-bank brightness control

**Multiplexing** (for larger grids):
- Bank switching (4 banks of 16 LEDs)
- 1kHz refresh rate per bank
- Reduces peak current

---

## Electrical Design

### Button Input (MCP23017)

**MCP23017 Configuration**:
- I2C address: 0x20-0x27 (set via jumpers)
- Input pins: 8 per BM-1x8, 16 per BM-4x4
- Internal pull-up resistors: 100kΩ
- Interrupt output: Notify host on button press

**Button Wiring**:
- Button connects pin to ground when pressed
- MCP23017 detects low level = button pressed
- Debounce: 10ms firmware debounce

### LED Output (74HC595)

**74HC595 Configuration**:
- Serial-to-parallel shift register
- 8-bit output per chip
- Daisy-chain for more outputs
- 20mA max per output

**LED Wiring**:
- 74HC595 output → resistor → LED → ground
- Common cathode or common anode (depends on PB86 variant)
- PWM on OE pin for brightness control

### Power Distribution

**Per-BM-1x8**:
- LEDs: 8 × 20mA = 160mA (all on)
- Typical: 80mA (50% duty cycle)
- MCP23017: 1mA
- 74HC595: 10mA

**Per-BM-8x8**:
- LEDs: 64 × 20mA = 1.28A (all on)
- Typical: 640mA (50% duty cycle)
- MCP23017: 4mA (4 chips)
- 74HC595: 80mA (8 chips)

**Recommended Power Supplies**:
- 3× BM-1x8 stacked: 5V 1A
- 1× BM-8x8: 5V 2A
- 1× BM-8x16: 5V 3A

---

## SCH-BUS/1 Integration

### Button Event Messages

**Button Press**:
```json
{
  "type": "BUTTON_EVENT",
  "button_id": 5,
  "action": "press",
  "timestamp_us": 12345678
}
```

**Button Release**:
```json
{
  "type": "BUTTON_EVENT",
  "button_id": 5,
  "action": "release",
  "timestamp_us": 12345999
}
```

### LED Feedback Messages

**Set LED State**:
```json
{
  "type": "LED_FEEDBACK",
  "button_id": 5,
  "state": "on"
}
```

**Blink LED** (playhead):
```json
{
  "type": "LED_FEEDBACK",
  "button_id": 12,
  "mode": "blink",
  "blink_rate_hz": 4
}
```

### Manifest Example (BM-1x8)

```json
{
  "module_type": "button_matrix_mechanical",
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
      "address": "led_1x8_0",
      "brightness_control": true
    },
    {
      "type": "stackable",
      "max_stack": 8,
      "addressing": "hardware_jumper"
    }
  ],

  "power": {
    "voltage": "5V",
    "current_typical": 80,
    "current_peak": 160
  }
}
```

---

## Layout Bindings (Drum Machine)

### 3-Instrument Drum Machine (3× BM-1x8 stacked)

```json
{
  "layout_name": "drum_machine_3x8",
  "layout_version": "1.0.0",

  "bindings": [
    {
      "capability": "button_grid",
      "address": "button_1x8_0",
      "semantic": "step_sequencer",
      "mapping": {
        "rows": ["kick", "snare", "hi_hat"],
        "cols": ["steps_1_8"]
      }
    },
    {
      "capability": "led_feedback",
      "address": "led_1x8_0",
      "semantic": "step_indication",
      "mapping": {
        "states": {
          "off": "step_disabled",
          "on": "step_active",
          "blinking": "play_position"
        }
      }
    }
  ]
}
```

---

## Bill of Materials

### BM-1x8 Kit

| Component | Qty | Cost | Source |
|-----------|-----|------|--------|
| PB86 button with LED | 8 | $4.00 | On-hand |
| MCP23017 I/O expander | 1 | $1.50 | On-hand |
| 74HC595 shift register | 1 | $0.50 | On-hand |
| Resistors 150Ω | 8 | $0.10 | On-hand |
| Aluminum panel 2mm | 1 | $5.00 | Custom |
| Stacking headers 2×8-pin | 2 | $1.00 | DigiKey |
| Custom PCB | 1 | $10.00 | PCBWay |
| **Total** | | **$22.60** | |

**On-Hand Components**:
- PB86 buttons (×80 on-hand)
- MCP23017 (×11 on-hand)
- 74HC595 (×210 on-hand)
- All resistors

**Additional Cost**:
- Panel + PCB + connectors = $16
- **Total**: $22.60 per BM-1x8

### BM-8x8 Kit

| Component | Qty | Cost |
|-----------|-----|------|
| PB86 button with LED | 64 | $32.00 |
| MCP23017 I/O expander | 4 | $6.00 |
| 74HC595 shift register | 8 | $4.00 |
| Resistors 150Ω | 64 | $0.80 |
| Aluminum panel 2mm | 1 | $20.00 |
| Stacking headers | 8 | $4.00 |
| Custom PCB | 1 | $30.00 |
| **Total** | | **$96.80** |

---

## Assembly Instructions

### Step 1: PCB Design and Order
- Design PCB for BM-1x8 (smallest module)
- Include mounting holes, stacking headers
- Order 5 pieces (test + 4 stacked)

### Step 2: Panel Design and Order
- Design aluminum panel (2mm)
- Laser-etched labels
- Drill button cutouts (12.5mm diameter)

### Step 3: Component Assembly
- Solder MCP23017, 74HC595
- Solder resistors
- Solder stacking headers

### Step 4: Mount Buttons
- Insert PB86 buttons through panel
- Solder buttons to PCB
- Secure with mounting nuts

### Step 5: Stack Modules
- Stack 3× BM-1x8 for testing
- Verify I2C addressing (unique per module)
- Test button matrix functionality

### Step 6: Final Integration
- Test SCH-BUS/1 enumeration
- Verify LED feedback
- Test layout bindings

---

## Testing Checklist

### Hardware Testing
- [ ] All buttons register press/release
- [ ] LED feedback works (on/off/blink)
- [ ] Stacking connectors make reliable contact
- [ ] Power consumption within spec
- [ ] No false triggers

### SCH-BUS/1 Testing
- [ ] HELLO message on power-up
- [ ] WELCOME response from host
- [ ] MANIFEST reports correct capabilities
- [ ] BUTTON_EVENT messages sent on press
- [ ] LED_FEEDBACK messages received and applied
- [ ] Hot-plug detection works

### Integration Testing
- [ ] Stacked modules enumerate with unique addresses
- [ ] Layout binding switches semantics
- [ ] LED feedback updates from DAW
- [ ] Button press triggers DAW events

---

## Comparison: PB86 vs Capacitive Touch

| Feature | PB86 Mechanical | Capacitive Touch |
|---------|-----------------|------------------|
| **Tactile feedback** | ✅ Mechanical click | ❌ Smooth surface |
| **Velocity sensitivity** | ❌ On/off only | ✅ Pressure sensitive |
| **Durability** | 1M cycles | Infinite |
| **LED integration** | Built-in (simple) | Custom (complex) |
| **Cost per button** | $0.50 | $1.50+ |
| **Feel** | Traditional | Premium/modern |
| **Complexity** | Low (simple wiring) | Moderate (MPR121 config) |
| **Calibration** | Not needed | Required (touch thresholds) |
| **Panel design** | Cutouts needed | No cutouts |
| **Perfect for** | Step sequencers, clip launchers | Expression control, velocity pads |

---

## Success Criteria

1. ✅ **Button press registers reliably**
2. ✅ **LED feedback shows step state**
3. ✅ **Multiple modules stack with unique addresses**
4. ✅ **SCH-BUS/1 enumeration works hot-plug**
5. ✅ **Layout binding changes button semantics**
6. ✅ **Power consumption within limits**
7. ✅ **Tactile feel satisfying**

---

## Example Projects

### Project 1: 3-Instrument Drum Machine (3× BM-1x8 stacked)
- 3× BM-1x8 modules stacked
- Panel: 4" × 3" (with 3 mounting slots)
- Grid: 3×8 (kick, snare, hi-hat × 8 steps)
- Cost: $68 ($22.60 × 3)
- Timeline: 1 week

### Project 2: 8-Instrument Drum Machine (1× BM-8x8)
- 1× BM-8x8 module
- Panel: 8" × 8"
- Grid: 8×8 (8 instruments × 8 steps, paged to 16)
- Cost: $97
- Timeline: 2 weeks

### Project 3: 128-Clip Launcher (1× BM-8x16)
- 1× BM-8x16 module
- Panel: 16" × 8"
- Grid: 8×16 (8 tracks × 16 clips)
- Cost: $150
- Timeline: 3 weeks

### Project 4: Modular Sequencer (Start with 1×, expand later)
- Start: 1× BM-1x8 ($23)
- Add: 2× more BM-1x8 ($46)
- Result: 3×8 drum machine
- Benefit: Start small, expand as needed

---

## Next Steps

1. **Build BM-1x8 prototype** (simplest, validates design)
2. **Test stacking system** (build 3×, stack them)
3. **Verify SCH-BUS/1 integration**
4. **Scale to BM-8x8** (full drum machine)
5. **Create drum machine layout bindings**
6. **Test with DAW integration**
