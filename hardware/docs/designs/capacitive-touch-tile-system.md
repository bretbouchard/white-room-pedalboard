# Capacitive Touch Tile System - Modular Grid

## Overview

**Modular PCB tiles** that can be arranged in **any size grid** and mounted **behind a custom panel**. Each tile is a self-contained capacitive touch sensor with RGB LED feedback.

**Key Innovation**: Build any size touch grid by combining standard tiles!

---

## Tile Design

### Standard Tile: 4×4 Touch Grid

**PCB Size**: 60mm × 60mm (2.36" × 2.36")

**Components Per Tile**:
- MPR121 capacitive touch controller: 1 (12 channels, use 8 for 4×4)
- RGB LEDs: 16 (one per touch point)
- Current limiting resistors: 48 (3 per LED)
- 4× M3 mounting holes (corners)
- Edge connectors (2×8-pin headers on each side)

**Tile Features**:
- 16 touch points (4×4 grid)
- RGB LED under each touch point
- Edge connectors for tile-to-tile communication
- Power bus sharing across tiles
- Address assignment via jumpers

**Tile Top View**:
```
┌──────────────────────────────────────┐
│  ●  ●  ●  ●   (row 0)               │
│  ○  ○  ○  ○   (LED indicators)      │
│                                      │
│  ●  ●  ●  ●   (row 1)               │
│  ○  ○  ○  ○                          │
│                                      │
│  ●  ●  ●  ●   (row 2)               │
│  ○  ○  ○  ○                          │
│                                      │
│  ●  ●  ●  ●   (row 3)               │
│  ○  ○  ○  ○                          │
└──────────────────────────────────────┘
```

**Tile Edge Connectors**:
```
     [Top Edge Connector]
          │  │  │  │
┌──────────┼──┼──┼──┼──────────┐
│          │  │  │  │          │
│  [Tile PCB 60×60mm]            │
│          │  │  │  │          │
└──────────┼──┼──┼──┼──────────┘
          │  │  │  │
     [Bottom Edge Connector]
```

---

## Tile Types

### Tile-4x4 (Standard)
- 16 touch points (4×4)
- 16 RGB LEDs
- 1× MPR121 (use 8 of 12 channels, 4 spare)
- Base tile for all configurations

### Tile-2x8 (Wide)
- 16 touch points (2×8)
- 16 RGB LEDs
- 1× MPR121
- For building wide grids

### Tile-8x2 (Tall)
- 16 touch points (8×2)
- 16 RGB LEDs
- 1× MPR121
- For building tall grids

### Tile-1x4 (Edge Filler)
- 4 touch points (1×4)
- 4 RGB LEDs
- 1× MPR121 (use 4 of 12 channels, 8 spare)
- For filling edges to odd sizes

---

## Modular Grid Construction

### Build Any Size Grid!

**Example 1: 8×8 Grid** (4 tiles)
```
┌─────────┬─────────┐
│ Tile-4x4│ Tile-4x4│
│   #1    │   #2    │
├─────────┼─────────┤
│ Tile-4x4│ Tile-4x4│
│   #3    │   #4    │
└─────────┴─────────┘
```
**Result**: 8×8 = 64 touch points

---

**Example 2: 12×4 Grid** (3 tiles)
```
┌─────────┬─────────┬─────────┐
│ Tile-4x4│ Tile-4x4│ Tile-4x4│
│   #1    │   #2    │   #3    │
└─────────┴─────────┴─────────┘
```
**Result**: 12×4 = 48 touch points

---

**Example 3: 16×16 Grid** (16 tiles)
```
┌─────┬─────┬─────┬─────┐
│ #1  │ #2  │ #3  │ #4  │
├─────┼─────┼─────┼─────┤
│ #5  │ #6  │ #7  │ #8  │
├─────┼─────┼─────┼─────┤
│ #9  │ #10 │ #11 │ #12 │
├─────┼─────┼─────┼─────┤
│ #13 │ #14 │ #15 │ #16 │
└─────┴─────┴─────┴─────┘
```
**Result**: 16×16 = 256 touch points

---

**Example 4: Custom 5×5 Grid** (4 tiles + edge filler)
```
┌─────────┬─────────┬───┐
│ Tile-4x4│ Tile-4x4│1x4│
│   #1    │   #2    │#3 │
├─────────┼─────────┼───┤
│ Tile-4x4│ Tile-4x4│1x4│
│   #4    │   #5    │#6 │
└─────────┴─────────┴───┘
```
**Result**: 9×4 + 1×4 edge fill = custom configuration

---

## Tile Mounting System

### Behind-Panel Installation

**Panel Design**:
- **Material**: Polycarbonate 3mm (clear or frosted)
- **No cutouts needed** - tiles mount behind panel
- **Touch works through 3mm polycarbonate**
- **LED light shines through panel**

**Mounting Arrangement**:
```
┌─────────────────────────────────────┐
│   Polycarbonate Panel (3mm)         │ ← User touches here
│   (no cutouts, smooth surface)      │
├─────────────────────────────────────┤
│   [Tile PCBs mounted behind]        │ ← Tiles mounted here
│   ┌─────┬─────┬─────┬─────┐        │
│   │ #1  │ #2  │ #3  │ #4  │        │
│   ├─────┼─────┼─────┼─────┤        │
│   │ #5  │ #6  │ #7  │ #8  │        │
│   └─────┴─────┴─────┴─────┘        │
│                                      │
│   Mounting plate (aluminum 2mm)     │ ← Structural support
└─────────────────────────────────────┘
```

**Mounting Hardware**:
- M3 standoffs (10mm height) between panel and mounting plate
- Tiles sandwiched between panel and plate
- Standoffs at tile corners + inter-tile spacing
- M3 nuts and washers secure assembly

**Layer Stack-up**:
1. **Top**: Polycarbonate panel (3mm) - User touches here
2. **Middle**: Tile PCBs (1.6mm) - Touch sensors + LEDs
3. **Bottom**: Aluminum mounting plate (2mm) - Structural support
4. **Spacers**: M3 standoffs (10mm) - Create cavity for tiles

**Total Thickness**: 3 + 1.6 + 2 + 10 = 16.6mm (≈ 5/8")

---

## Tile Interconnection

### Edge Connector System

**Connector Type**: 2×8-pin shrouded headers (2.54mm pitch)

**Pin Assignment** (per edge):
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
│ Tile #1 ├────┤ Tile #2 ├────┤ Tile #3 │
└─────────┘    └─────────┘    └─────────┘
     │              │              │
     └──────────────┴──────────────┘
                    │
              [To Teensy 4.1]
```

**Power Distribution**:
- 5V rail runs through all tiles
- Each tile has local 3.3V LDO for MPR121
- Total current: Sum of all LED currents

**I2C Addressing**:
- Each MPR121 gets unique I2C address
- Address set via edge connector pins (ADDR0, ADDR1)
- Host assigns addresses on enumeration

---

## Panel Design

### Touch Electrodes on Tile PCB

**Electrode Layout** (on Tile-4x4):
```
┌────────────────────────────────────┐
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  │
│  │Pad0│  │Pad1│  │Pad2│  │Pad3│  │
│  │ ● │  │ ● │  │ ● │  │ ● │  │
│  │LED│  │LED│  │LED│  │LED│  │
│  └────┘  └────┘  └────┘  └────┘  │
│                                    │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  │
│  │Pad4│  │Pad5│  │Pad6│  │Pad7│  │
│  │ ● │  │ ● │  │ ● │  │ ● │  │
│  └────┘  └────┘  └────┘  └────┘  │
│                                    │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  │
│  │Pad8│  │Pad9│ │Pad10│ │Pad11│ │
│  │ ● │  │ ● │  │ ● │  │ ● │  │
│  └────┘  └────┘  └────┘  └────┘  │
│                                    │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  │
│  │Pad12│ │Pad13│ │Pad14│ │Pad15│ │
│  │ ● │  │ ● │  │ ● │  │ ● │  │
│  └────┘  └────┘  └────┘  └────┘  │
└────────────────────────────────────┘
```

**Electrode Specifications**:
- **Size**: 10mm diameter circle (78.5mm²)
- **Material**: Copper pad with ENIG finish (gold)
- **Spacing**: 15mm center-to-center
- **Clearance**: 5mm to ground plane
- **Guard ring**: 2mm ground ring around each pad

**PCB Stack-up** (4-layer):
- **Layer 1 (Top)**: Touch electrodes + LED footprints
- **Layer 2 (GND)**: Solid ground plane with guard rings
- **Layer 3 (Power)**: 5V LED power + 3.3V logic
- **Layer 4 (Bottom)**: Routing + MPR121 + connectors

**LED Placement**:
- LED mounted directly under touch pad
- 5mm RGB LED (common cathode)
- Light emits through panel (polycarbonate)
- No light pipe needed (LED shines through PCB)

---

## Panel Overlay

### No Cutouts Needed!

**Polycarbonate Panel** (3mm thick):
- **Smooth surface** - User touches here
- **No cutouts** - Touch works through panel
- **No buttons** - Completely flat surface
- **Backlighting** - LEDs shine through panel

**Optional Enhancements**:
- **Frosted finish** - Diffuses LED light evenly
- **Laser-etched labels** - Mark touch zones
- **Edge-lighting** - Backlight labels from sides
- **Anti-fingerprint coating** - Keep surface clean

**Labeling Options**:
1. **Laser etching**: Mark touch zones (10mm circles)
2. **Silkscreen overlay**: Print labels under panel
3. **Backlit film**: Print on transparency, backlight with LEDs
4. **No labels**: Clean minimal look

---

## Grid Configurations

### Common Grid Sizes

**8×8 Grid** (4 tiles):
- 64 touch points
- Panel size: 120mm × 120mm (4.7" × 4.7")
- Cost: $60 ($15 per tile)
- Use: Drum machine, clip launcher

**12×8 Grid** (6 tiles):
- 96 touch points
- Panel size: 180mm × 120mm (7" × 4.7")
- Cost: $90
- Use: Extended drum machine

**16×16 Grid** (16 tiles):
- 256 touch points
- Panel size: 240mm × 240mm (9.4" × 9.4")
- Cost: $240
- Use: Large control surface

**4×16 Grid** (4 tiles wide):
- 64 touch points
- Panel size: 60mm × 240mm (2.4" × 9.4")
- Cost: $60
- Use: Step sequencer strip

---

## SCH-BUS/1 Integration

### Tile Enumeration

**Startup Sequence**:
1. Host detects tile connection (via I2C scan)
2. Host assigns unique addresses to each MPR121
3. Host reads tile capabilities (size, LED config)
4. Host builds unified touch grid map
5. Hot-plug: Detect new tiles via I2C presence

**Manifest Example** (8×8 grid):
```json
{
  "module_type": "capacitive_touch_grid",
  "model": "tile_grid_8x8",
  "version": "1.0.0",
  "manufacturer": "White Room",

  "capabilities": [
    {
      "type": "touch_grid",
      "rows": 8,
      "cols": 8,
      "touch_points": 64,
      "tile_layout": [
        {"tile_id": 1, "rows": [0,1,2,3], "cols": [0,1,2,3]},
        {"tile_id": 2, "rows": [0,1,2,3], "cols": [4,5,6,7]},
        {"tile_id": 3, "rows": [4,5,6,7], "cols": [0,1,2,3]},
        {"tile_id": 4, "rows": [4,5,6,7], "cols": [4,5,6,7]}
      ]
    },
    {
      "type": "led_feedback",
      "led_count": 64,
      "rgb": true,
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
    "current_typical": 1500,
    "current_peak": 3000
  }
}
```

---

## Bill of Materials (Per Tile-4x4)

| Component | Qty | Cost | Source |
|-----------|-----|------|--------|
| MPR121 touch controller | 1 | $1.50 | On-hand |
| RGB LEDs (common cathode) | 16 | $3.20 | DigiKey |
| Resistors 150Ω (red) | 16 | $0.16 | On-hand |
| Resistors 100Ω (green/blue) | 32 | $0.32 | On-hand |
| 3.3V LDO (AMS1117-3.3) | 1 | $0.50 | On-hand |
| Capacitors 10µF | 2 | $0.10 | On-hand |
| Edge connectors 2×8-pin | 4 | $2.00 | DigiKey |
| Custom PCB (4-layer) | 1 | $15.00 | PCBWay |
| Polycarbonate panel (3mm) | 1 | $5.00 | McMaster |
| M3 standoffs 10mm | 4 | $1.00 | McMaster |
| **Total Per Tile** | | **$28.78** | |

**On-Hand Components**:
- MPR121 (×24 available)
- All resistors and capacitors
- LDO regulators

**Additional Cost**:
- LED + PCB + panel + standoffs + connectors = $27 per tile
- **Tile-4x4**: $28.78 per tile

---

## Power Requirements

### Per-Tile Power

**Tile-4x4**:
- LEDs: 16 × 60mA = 960mA (all white, 100%)
- Typical: 480mA (50% brightness)
- MPR121: 350µA (negligible)
- LDO quiescent: 5mA

**Grid Power**:
- 8×8 grid (4 tiles): 4 × 480mA = 1.92A typical
- 16×16 grid (16 tiles): 16 × 480mA = 7.68A typical

**Recommended Power Supplies**:
- 8×8 grid: 5V 3A
- 16×16 grid: 5V 10A

**Power Bus**:
- 5V rail runs through all tiles
- Each tile has local 3.3V LDO
- Thick traces (2mm) for power distribution

---

## Assembly Instructions

### Tile Assembly

**Step 1: SMT Assembly** (PCB factory)
- MPR121 chip (QFN-20)
- Resistors, capacitors
- LDO regulator

**Step 2: Through-Hole Assembly** (manual)
- RGB LEDs (16 per tile)
- Edge connectors (4 per tile)
- M3 mounting hardware

**Step 3: Testing**
- Verify all touch electrodes work
- Test all LED colors
- Check I2C communication
- Validate power consumption

### Grid Assembly

**Step 1: Plan Layout**
- Decide grid size (8×8, 12×8, 16×16, etc.)
- Calculate number of tiles needed
- Design panel size

**Step 2: Mount Tiles**
- Attach tiles to mounting plate
- Connect tiles via edge connectors
- Verify I2C chain works

**Step 3: Install Panel**
- Cut polycarbonate to size
- Drill mounting holes
- Mount panel over tiles using standoffs

**Step 4: Final Test**
- Test all touch points through panel
- Verify LED visibility
- Check SCH-BUS/1 enumeration
- Calibrate touch sensitivity

---

## Testing Checklist

### Per-Tile Testing
- [ ] All 16 touch electrodes detect touch
- [ ] All 16 LEDs display correct colors
- [ ] I2C communication works
- [ ] Power consumption within spec
- [ ] Touch sensitivity consistent

### Grid Testing
- [ ] All tiles enumerate with unique addresses
- [ ] Touch grid maps correctly (row/col addressing)
- [ ] LED feedback updates from host
- [ ] Hot-plug detection works
- [ ] Power distribution stable

### Panel Testing
- [ ] Touch works through 3mm polycarbonate
- [ ] LED visibility through panel
- [ ] No false touches (without contact)
- [ ] Velocity sensitivity feels natural
- [ ] Surface feels premium/smooth

---

## Comparison: Tile System vs Fixed Grid

| Feature | Tile System | Fixed Grid |
|---------|-------------|------------|
| Flexibility | Build any size | Fixed size |
| Cost | $29 per tile | Custom PCB per size |
| Assembly | Modular, expandable | One-time build |
| Repairs | Replace single tile | Replace entire PCB |
| Lead time | Stock tiles, build now | Custom PCB (2 weeks) |
| Panel | Simple rectangle | Custom cutout |
| Complexity | Moderate (edge connectors) | Simple (single PCB) |

**Tile System Benefits**:
- Start small, expand later
- Replace damaged tiles
- Experiment with layouts
- Lower initial investment

**Fixed Grid Benefits**:
- Lower total cost for large grids
- Simpler assembly
- No interconnection needed

---

## Success Criteria

1. ✅ **Single tile works standalone**
2. ✅ **Multiple tiles connect via edge connectors**
3. ✅ **Touch works through 3mm polycarbonate panel**
4. ✅ **LED feedback visible through panel**
5. ✅ **I2C addressing assigns unique addresses**
6. ✅ **Hot-plug detection works**
7. ✅ **Power consumption within limits**
8. ✅ **Grid can be any size (4×4, 8×8, 16×16, etc.)**

---

## Next Steps

1. **Design Tile-4x4 PCB** (standard tile)
2. **Order prototype boards** (5 pieces)
3. **Assemble and test single tile**
4. **Build 8×8 grid** (4 tiles)
5. **Design mounting system**
6. **Test touch through polycarbonate panel**
7. **Scale to larger grids**

---

## Example Projects

### Project 1: 8×8 Drum Machine
- 4× Tile-4x4
- Panel: 120mm × 120mm polycarbonate
- Cost: $115 ($29 × 4)
- Timeline: 2 weeks

### Project 2: 4×16 Step Sequencer
- 4× Tile-4x4 (arranged in line)
- Panel: 60mm × 240mm polycarbonate
- Cost: $115
- Timeline: 2 weeks

### Project 3: 16×16 Mega Grid
- 16× Tile-4x4
- Panel: 240mm × 240mm polycarbonate
- Cost: $464 ($29 × 16)
- Timeline: 4 weeks

### Project 4: Custom 12×12 Grid
- 9× Tile-4x4 (3×3 tile arrangement)
- Panel: 180mm × 180mm polycarbonate
- Cost: $261 ($29 × 9)
- Timeline: 3 weeks
