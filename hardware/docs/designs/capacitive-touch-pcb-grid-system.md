# Capacitive Touch Grid System - Custom PCB Design

## Overview

**Custom PCB grids** of any size, each with capacitive touch sensors + RGB LEDs, controlled by MPR121 touch drivers. Design one PCB layout, scale to any grid size.

**Key Concept**: One driver design, multiple grid configurations!

---

## System Design

### Core Design Pattern

**Each PCB contains**:
- MPR121 capacitive touch controllers (as many as needed)
- Touch electrodes (copper pads on PCB)
- RGB LEDs (one under each touch pad)
- LED drivers (74HC595 shift registers or constant current drivers)
- Edge connectors (for daisy-chaining multiple PCBs)

**Grid Sizes Available**:
- 4×4 (16 touch points) - 1× MPR121
- 8×8 (64 touch points) - 6× MPR121
- 8×16 (128 touch points) - 11× MPR121
- 16×16 (256 touch points) - 22× MPR121
- **Custom**: Any size you need!

---

## MPR121 Scaling Strategy

### Channel Allocation

**Single MPR121**: 12 channels
- Use 8 channels for 4×2 grid (8 touch points)
- Use all 12 channels for irregular grids
- Leave 4 channels spare (for future expansion)

**Multiple MPR121s**: Daisy-chain via I2C
```
┌─────────────────────────────────────┐
│  [MPR121 #1]  [MPR121 #2]  [MPR121 #3] │
│   Channels     Channels      Channels  │
│   1-12         13-24         25-36     │
│   (4×3 grid)   (4×3 grid)    (4×3 grid)│
└─────────────────────────────────────┘
```

**I2C Addressing**:
- Base address: 0x5A
- Address pins: ADDR0, ADDR1, ADDR2
- 8 unique addresses per I2C bus
- Multiple I2C buses for 64+ channels

---

## Grid Configurations

### Grid 4×4 (16 Touch Points)

**PCB Size**: 60mm × 60mm (2.36" × 2.36")

**Components**:
- MPR121: 2 (24 channels, use 16, 8 spare)
- RGB LEDs: 16
- Current limiting resistors: 48 (3 per LED)

**Touch Layout**:
```
┌────────────────────────────────────┐
│  ●  ●  ●  ●   (row 0, electrodes 0-3) │
│  ●  ●  ●  ●   (row 1, electrodes 4-7) │
│  ●  ●  ●  ●   (row 2, electrodes 8-11)│
│  ●  ●  ●  ●   (row 3, electrodes 12-15)│
└────────────────────────────────────┘
```

**MPR121 Channel Assignment**:
- MPR121 #1 (0x5A): Channels 0-7 (rows 0-1)
- MPR121 #2 (0x5B): Channels 8-15 (rows 2-3)
- Spare channels: 16-23 (unused)

**I2C Addressing**:
- MPR121 #1: ADDR0=0, ADDR1=0 (0x5A)
- MPR121 #2: ADDR0=1, ADDR1=0 (0x5B)

**Power**:
- LEDs: 16 × 60mA = 960mA (all white, 100%)
- Typical: 480mA (50% brightness)
- MPR121: 2 × 350µA = 700µA

**Cost**: ~$35
- 2× MPR121: $3
- 16× RGB LEDs: $3.20
- PCB + panel + connectors: $28

---

### Grid 8×8 (64 Touch Points)

**PCB Size**: 120mm × 120mm (4.7" × 4.7")

**Components**:
- MPR121: 6 (72 channels, use 64, 8 spare)
- RGB LEDs: 64
- 74HC595 shift registers: 8 (64-bit LED control)
- Current limiting resistors: 192

**Touch Layout**:
```
┌────────────────────────────────────────────────┐
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 0, ch 0-7)   │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 1, ch 8-15)  │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 2, ch 16-23) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 3, ch 24-31) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 4, ch 32-39) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 5, ch 40-47) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 6, ch 48-55) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 7, ch 56-63) │
└────────────────────────────────────────────────┘
```

**MPR121 Channel Assignment**:
- MPR121 #1 (0x5A): Channels 0-11 (rows 0-0.75)
- MPR121 #2 (0x5B): Channels 12-23 (rows 1-1.75)
- MPR121 #3 (0x5C): Channels 24-35 (rows 2-2.75)
- MPR121 #4 (0x5D): Channels 36-47 (rows 3-3.75)
- MPR121 #5 (0x5E): Channels 48-59 (rows 4-4.75)
- MPR121 #6 (0x5F): Channels 60-63 (row 5), 64-71 (spare)

**Note**: MPR121 #5 and #6 use remaining channels for row 5, plus spares for rows 6-7 can be added with more MPR121s if needed.

**I2C Addressing** (single bus):
- ADDR0, ADDR1, ADDR2 set to give 0x5A-0x5F
- All 6 chips on same I2C bus

**Power**:
- LEDs: 64 × 60mA = 3.84A (all white)
- Typical: 1.92A (50% brightness)
- MPR121: 6 × 350µA = 2.1mA

**Cost**: ~$120
- 6× MPR121: $9
- 64× RGB LEDs: $12.80
- 8× 74HC595: $4
- PCB + panel + connectors: $94

---

### Grid 8×16 (128 Touch Points)

**PCB Size**: 240mm × 120mm (9.4" × 4.7")

**Components**:
- MPR121: 11 (132 channels, use 128, 4 spare)
- RGB LEDs: 128
- 74HC595 shift registers: 16 (128-bit LED control)

**Touch Layout**:
```
┌──────────────────────────────────────────────────────────────────────┐
│  ●●●●●●●●●●●●●●●●  (row 0, ch 0-15)                                │
│  ●●●●●●●●●●●●●●●●  (row 1, ch 16-31)                               │
│  ●●●●●●●●●●●●●●●●  (row 2, ch 32-47)                               │
│  ●●●●●●●●●●●●●●●●  (row 3, ch 48-63)                               │
│  ●●●●●●●●●●●●●●●●  (row 4, ch 64-79)                               │
│  ●●●●●●●●●●●●●●●●  (row 5, ch 80-95)                               │
│  ●●●●●●●●●●●●●●●●  (row 6, ch 96-111)                              │
│  ●●●●●●●●●●●●●●●●  (row 7, ch 112-127)                             │
└──────────────────────────────────────────────────────────────────────┘
```

**MPR121 Channel Assignment**:
- MPR121 #1-#10: 120 channels (rows 0-9.75)
- MPR121 #11: 8 channels (row 10), 4 spare

**Note**: For 8 rows, need 8 × 16 = 128 channels. With 11 MPR121s, have 132 channels total.

**I2C Addressing**:
- Use multiple I2C buses (Teensy 4.1 has Wire, Wire1, Wire2)
- Bus 0: MPR121 #1-#6 (0x5A-0x5F)
- Bus 1: MPR121 #7-#11 (0x5A-0x5E)

**Power**:
- LEDs: 128 × 60mA = 7.68A (all white)
- Typical: 3.84A (50% brightness)
- MPR121: 11 × 350µA = 3.85mA

**Cost**: ~$220
- 11× MPR121: $16.50
- 128× RGB LEDs: $25.60
- 16× 74HC595: $8
- PCB + panel + connectors: $170

---

### Grid 16×16 (256 Touch Points)

**PCB Size**: 240mm × 240mm (9.4" × 9.4")

**Components**:
- MPR121: 22 (264 channels, use 256, 8 spare)
- RGB LEDs: 256
- 74HC595 shift registers: 32 (256-bit LED control)

**Touch Layout**: 16 rows × 16 columns

**MPR121 Channel Assignment**:
- MPR121 #1-#21: 252 channels (rows 0-20.75)
- MPR121 #22: 4 channels (row 21), 8 spare

**I2C Addressing**:
- Bus 0: MPR121 #1-#8 (0x5A-0x61)
- Bus 1: MPR121 #9-#16 (0x5A-0x61)
- Bus 2: MPR121 #17-#22 (0x5A-0x5F)

**Power**:
- LEDs: 256 × 60mA = 15.36A (all white)
- Typical: 7.68A (50% brightness)
- Need 5V 10A power supply (minimum)

**Cost**: ~$420
- 22× MPR121: $33
- 256× RGB LEDs: $51.20
- 32× 74HC595: $16
- PCB + panel + connectors: $320

---

## PCB Design

### Touch Electrode Layout

**Electrode Pattern** (on PCB top layer):
```
┌────────────────────────────────────┐
│  ┌────────┐  ┌────────┐            │
│  │ Pad 0  │  │ Pad 1  │            │
│  │  ●     │  │  ●     │            │
│  │  LED   │  │  LED   │            │
│  └────────┘  └────────┘            │
│                                    │
│  ┌────────┐  ┌────────┐            │
│  │ Pad 2  │  │ Pad 3  │            │
│  │  ●     │  │  ●     │            │
│  └────────┘  └────────┘            │
└────────────────────────────────────┘
```

**Electrode Specifications**:
- **Size**: 10mm diameter circle (78.5mm²)
- **Material**: Copper with ENIG finish (gold)
- **Spacing**: 15mm center-to-center (0.6")
- **Clearance**: 5mm to ground plane
- **Guard ring**: 2mm ground ring around each pad

**PCB Stack-up** (4-layer):
- **Layer 1 (Top)**: Touch electrodes + LED footprints
- **Layer 2 (GND)**: Solid ground plane with guard rings
- **Layer 3 (Power)**: 5V LED power + 3.3V logic
- **Layer 4 (Bottom)**: MPR121 chips, routing, connectors

**LED Placement**:
- RGB LED mounted directly under touch pad
- 5mm RGB LED (common cathode)
- LED shines through polycarbonate panel
- No light pipe needed

---

## Panel Design

### Behind-Panel Mounting

**Panel Material**: Polycarbonate 3mm (clear or frosted)

**No Cutouts Needed!**

**Mounting Stack-up**:
```
┌─────────────────────────────────────┐
│  Polycarbonate Panel (3mm)          │ ← User touches here
│  (smooth surface, no cutouts)       │
├─────────────────────────────────────┤
│  [Custom PCB with touch pads]       │ ← PCB mounted here
│  ┌────┬────┬────┬────┐             │
│  │ ●  │ ●  │ ●  │ ●  │             │
│  └────┴────┴────┴────┘             │
│                                     │
│  Mounting plate (aluminum 2mm)      │ ← Structural support
└─────────────────────────────────────┘
```

**Mounting Hardware**:
- M3 standoffs (10mm height)
- M3 nuts and washers
- Standoffs at PCB corners + intermediate points
- Creates cavity for PCB + components

**Total Thickness**: 3 + 1.6 + 2 + 10 = 16.6mm (≈ 5/8")

---

## Interconnection

### Daisy-Chaining Multiple PCBs

**Edge Connectors**: 2×8-pin shrouded headers (2.54mm pitch)

**Pin Assignment**:
```
Pin 1-2:  5V power (VCC)
Pin 3-4:  Ground (GND)
Pin 5-6:  I2C SDA (with pull-up)
Pin 7-8:  I2C SCL (with pull-up)
Pin 9-10: LED data (MOSI)
Pin 11-12: LED clock (SCK)
Pin 13-14: LED latch (LAT)
Pin 15-16: Address select (ADDR0, ADDR1)
```

**Daisy-Chain Topology**:
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ PCB #1  ├────┤ PCB #2  ├────┤ PCB #3  │
│  4×4    │    │  4×4    │    │  4×4    │
└─────────┘    └─────────┘    └─────────┘
     │              │              │
     └──────────────┴──────────────┘
                    │
              [To Teensy 4.1]
```

**Power Distribution**:
- 5V rail runs through all PCBs
- Each PCB has local 3.3V LDO for MPR121s
- Thick traces (2mm) for power distribution

---

## LED Control System

### Option 1: 74HC595 Shift Registers

**Configuration**:
- 8-bit shift register
- Daisy-chain for more outputs
- 20mA max per output
- PWM on OE pin for brightness control

**Per-Grid Requirements**:
- 4×4: 2× 74HC595 (16 LEDs)
- 8×8: 8× 74HC595 (64 LEDs)
- 8×16: 16× 74HC595 (128 LEDs)
- 16×16: 32× 74HC595 (256 LEDs)

**Advantages**:
- Low cost ($0.50 per chip)
- Simple to implement
- Daisy-chainable

**Disadvantages**:
- Limited to 20mA per LED
- No constant current
- Requires resistors

### Option 2: TLC5940/TLC5971 LED Drivers

**Configuration**:
- 16-channel constant current LED driver
- 12-bit PWM per channel
- Dot correction (current calibration)
- Daisy-chain via SPI

**Per-Grid Requirements**:
- 4×4: 1× TLC5940 (16 LEDs)
- 8×8: 4× TLC5940 (64 LEDs)
- 8×16: 8× TLC5940 (128 LEDs)
- 16×16: 16× TLC5940 (256 LEDs)

**Advantages**:
- Constant current (better brightness consistency)
- 12-bit PWM (smooth dimming)
- No resistors needed

**Disadvantages**:
- Higher cost ($2-3 per chip)
- More complex SPI interface

### Option 3: WS2812B RGB LEDs

**Configuration**:
- Integrated RGB LED with driver
- 3-wire interface (data, power, ground)
- Daisy-chain data line
- 8-bit PWM per color (24-bit color)

**Per-Grid Requirements**:
- 4×4: 16× WS2812B
- 8×8: 64× WS2812B
- 8×16: 128× WS2812B
- 16×16: 256× WS2812B

**Advantages**:
- Simplest wiring (3 wires total)
- Integrated driver (no extra chips)
- Full RGB color per LED

**Disadvantages**:
- Higher cost per LED ($1-2 each)
- Propagation delay (issues with 100+ LEDs)
- Requires precise timing

---

## SCH-BUS/1 Integration

### Manifest Example (8×8 Grid)

```json
{
  "module_type": "capacitive_touch_grid",
  "model": "CT_GRID_8x8_v1",
  "version": "1.0.0",
  "manufacturer": "White Room",

  "capabilities": [
    {
      "type": "touch_grid",
      "rows": 8,
      "cols": 8,
      "touch_points": 64,
      "controller": "MPR121",
      "controller_count": 6
    },
    {
      "type": "led_feedback",
      "led_count": 64,
      "rgb": true,
      "driver": "74HC595",
      "driver_count": 8,
      "brightness_control": true
    },
    {
      "type": "velocity_sensitive",
      "pressure_range": "0-255",
      "velocity_mapping": "exponential"
    }
  ],

  "power": {
    "voltage": "5V",
    "current_typical": 1920,
    "current_peak": 3840
  }
}
```

---

## Bill of Materials (Per Grid Size)

### 4×4 Grid

| Component | Qty | Cost |
|-----------|-----|------|
| MPR121 touch controller | 2 | $3.00 |
| RGB LEDs (common cathode) | 16 | $3.20 |
| Resistors 150Ω (red) | 16 | $0.16 |
| Resistors 100Ω (green/blue) | 32 | $0.32 |
| 3.3V LDO (AMS1117-3.3) | 2 | $1.00 |
| Capacitors 10µF | 4 | $0.20 |
| 74HC595 shift register | 2 | $1.00 |
| Custom PCB (4-layer) | 1 | $20.00 |
| Polycarbonate panel (3mm) | 1 | $5.00 |
| Edge connectors | 2 | $1.00 |
| **Total** | | **$34.88** |

### 8×8 Grid

| Component | Qty | Cost |
|-----------|-----|------|
| MPR121 touch controller | 6 | $9.00 |
| RGB LEDs | 64 | $12.80 |
| Resistors | 192 | $1.92 |
| 3.3V LDO | 6 | $3.00 |
| Capacitors | 12 | $0.60 |
| 74HC595 shift register | 8 | $4.00 |
| Custom PCB (4-layer) | 1 | $60.00 |
| Polycarbonate panel (3mm) | 1 | $20.00 |
| Edge connectors | 4 | $2.00 |
| **Total** | | **$113.32** |

### 8×16 Grid

| Component | Qty | Cost |
|-----------|-----|------|
| MPR121 touch controller | 11 | $16.50 |
| RGB LEDs | 128 | $25.60 |
| Resistors | 384 | $3.84 |
| 3.3V LDO | 11 | $5.50 |
| Capacitors | 22 | $1.10 |
| 74HC595 shift register | 16 | $8.00 |
| Custom PCB (4-layer) | 1 | $100.00 |
| Polycarbonate panel (3mm) | 1 | $40.00 |
| Edge connectors | 6 | $3.00 |
| **Total** | | **$203.54** |

---

## Assembly Instructions

### Step 1: Design PCB
- Choose grid size (4×4, 8×8, 8×16, custom)
- Calculate number of MPR121s needed
- Layout touch electrodes (10mm pads, 15mm spacing)
- Place MPR121 chips, LED drivers
- Order PCB (4-layer recommended)

### Step 2: Panel Design
- Cut polycarbonate to PCB size
- No cutouts needed!
- Optional: Laser-etch labels
- Drill mounting holes

### Step 3: PCB Assembly
- Solder MPR121 chips (SMT)
- Solder LED drivers (SMT or through-hole)
- Solder LEDs (through-hole)
- Solder edge connectors
- Solder mounting hardware

### Step 4: Mounting
- Attach PCB to mounting plate
- Install M3 standoffs
- Mount polycarbonate panel
- Test touch through panel

### Step 5: Integration
- Connect to Teensy 4.1
- Test I2C communication
- Calibrate touch sensitivity
- Test LED feedback
- Verify SCH-BUS/1 enumeration

---

## Testing Checklist

### Hardware Testing
- [ ] All touch electrodes detect touch
- [ ] Touch sensitivity consistent across grid
- [ ] All LEDs display correct colors
- [ ] I2C communication with all MPR121s
- [ ] Power consumption within spec

### Panel Testing
- [ ] Touch works through 3mm polycarbonate
- [ ] LED visibility through panel
- [ ] No false touches (without contact)
- [ ] Velocity sensitivity feels natural
- [ ] Surface feels premium/smooth

### SCH-BUS/1 Testing
- [ ] All MPR121s enumerate with unique addresses
- [ ] Touch grid maps correctly (row/col addressing)
- [ ] LED feedback updates from host
- [ ] Velocity data sent correctly
- [ ] Hot-plug detection works

---

## Comparison: Custom PCB vs Tiles

| Feature | Custom PCB Grid | Tiles |
|---------|-----------------|-------|
| **Flexibility** | Design any size | Standard tile sizes |
| **Cost** | Lower per unit | Higher per tile |
| **Lead time** | 2 weeks (PCB) | 2 weeks (PCB) |
| **Repairs** | Replace entire PCB | Replace single tile |
| **Design work** | One-time per size | One tile design |
| **Scalability** | Design new PCB for new size | Add more tiles |
| **Best for** | Known sizes | Experimental layouts |

**Recommendation**:
- Use **custom PCB grids** for standard sizes (4×4, 8×8, 8×16)
- Use **tiles** for experimental/irregular layouts

---

## Success Criteria

1. ✅ **Touch electrodes work reliably**
2. ✅ **Touch works through 3mm polycarbonate**
3. ✅ **Multiple MPR121s on same I2C bus**
4. ✅ **LED feedback visible through panel**
5. ✅ **Velocity sensitivity accurate**
6. ✅ **Power consumption within limits**
7. ✅ **SCH-BUS/1 enumeration works**

---

## Example Projects

### Project 1: 8×8 Drum Machine
- 1× custom PCB (8×8 grid)
- Panel: 120mm × 120mm polycarbonate
- Cost: $113
- Timeline: 3 weeks (2 weeks PCB, 1 week assembly)

### Project 2: 8×16 Full Sequencer
- 1× custom PCB (8×16 grid)
- Panel: 240mm × 120mm polycarbonate
- Cost: $204
- Timeline: 3 weeks

### Project 3: 4×4 Expression Pads
- 1× custom PCB (4×4 grid)
- Panel: 60mm × 60mm polycarbonate
- Cost: $35
- Timeline: 3 weeks

---

## Next Steps

1. **Choose grid size** (4×4, 8×8, 8×16, custom)
2. **Design PCB** with that grid size
3. **Order prototype boards** (5 pieces)
4. **Assemble and test**
5. **Scale to larger grids** if needed
6. **Create drum machine software** integration
