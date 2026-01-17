# Capacitive Touch XY Pad - KiCad Schematic Guide

**White Room Hardware Platform**
**Date**: January 16, 2026
**Status**: ✅ SPICE Validated | Ready for KiCad Implementation

---

## 📋 Schematic Overview

This document explains how to create the KiCad schematic for the capacitive touch XY pad.

### Components Required
1. **ESP32-WROOM-32** - Main microcontroller with built-in capacitive touch
2. **8 X Electrodes** (Test points) - Horizontal transmitters (GPIO 4-11)
3. **8 Y Electrodes** (Test points) - Vertical receivers (Touch pins)
4. **8 Pullup Resistors** (1MΩ) - One for each Y electrode
5. **12-Pin Header** - Interface to White Room platform

---

## 🔌 Pin Assignments

### ESP32 GPIO Assignments

#### X Electrodes (Transmitters)
| GPIO | Pin Name | Function | Connection |
|------|----------|----------|------------|
| IO4  | GPIO4    | X1       | X electrode 1 |
| IO5  | GPIO5    | X2       | X electrode 2 |
| IO6  | GPIO6    | X3       | X electrode 3 |
| IO7  | GPIO7    | X4       | X electrode 4 |
| IO8  | GPIO8    | X5       | X electrode 5 |
| IO9  | GPIO9    | X6       | X electrode 6 |
| IO10 | GPIO10   | X7       | X electrode 7 |
| IO11 | GPIO11   | X8       | X electrode 8 |

#### Y Electrodes (Receivers - Touch Pins)
| Touch Pin | ESP32 Pin | Function | Connection |
|-----------|-----------|----------|------------|
| T0        | GPIO4     | Y1       | Y electrode 1 (note: shared with X1) |
| T1        | GPIO0     | Y1       | Y electrode 1 |
| T2        | GPIO2     | Y2       | Y electrode 2 |
| T3        | GPIO15    | Y3       | Y electrode 3 |
| T4        | GPIO13    | Y4       | Y electrode 4 |
| T5        | GPIO12    | Y5       | Y electrode 5 |
| T6        | GPIO14    | Y6       | Y electrode 6 |
| T7        | GPIO27    | Y7       | Y electrode 7 |
| T8        | GPIO33    | Y8       | Y electrode 8 |
| T9        | GPIO32    | Y8       | Y electrode 8 (alt) |

**Note**: ESP32 has 10 touch pins (T0-T9). We'll use T1-T8 for our 8 Y electrodes.

### Interface Header (J1) - 12 Pins
| Pin | Signal    | Description               |
|-----|-----------|---------------------------|
| 1   | +3.3V     | Power supply              |
| 2   | GND       | Ground                    |
| 3   | X1        | X electrode 1             |
| 4   | X2        | X electrode 2             |
| 5   | X3        | X electrode 3             |
| 6   | X4        | X electrode 4             |
| 7   | Y1        | Y electrode 1 + pullup    |
| 8   | Y2        | Y electrode 2 + pullup    |
| 9   | Y3        | Y electrode 3 + pullup    |
| 10  | Y4        | Y electrode 4 + pullup    |
| 11  | Y5        | Y electrode 5 + pullup    |
| 12  | Y6        | Y electrode 6 + pullup    |

---

## 📐 Schematic Layout

### Step-by-Step Instructions

#### 1. Create New Project in KiCad
```bash
cd hardware/projects/capacitive-touch-xy-pad/schematics
kicad capacitive_touch_xy_pad.pro
```

#### 2. Add Component Libraries
In KiCad schematic editor:
- **Preferences → Manage Symbol Libraries**
- Add: `../../kicad_libraries/symbols` (relative path)

Libraries needed:
- `RF_Module.lib` (for ESP32-WROOM-32)
- `Connector.lib` (for headers and test points)
- `Device.lib` (for resistors)

#### 3. Place Components

**Main Components**:
1. **U1** - ESP32-WROOM-32 (center of schematic)
2. **J1** - Conn_01x12_Male (right side)
3. **X1-X8** - Test_Point (top row)
4. **Y1-Y8** - Test_Point (bottom row)
5. **R1-R8** - Resistor 1M (near Y electrodes)

#### 4. Wire Connections

**Power Connections**:
```
+3.3V → ESP32 VCC pin
+3.3V → J1 pin 1
+3.3V → R1-R8 (pin 1 of each resistor)

GND → ESP32 GND pin
GND → J1 pin 2
```

**X Electrodes (Transmitters)**:
```
ESP32 GPIO4  → X1 → J1 pin 3
ESP32 GPIO5  → X2 → J1 pin 4
ESP32 GPIO6  → X3 → J1 pin 5
ESP32 GPIO7  → X4 → J1 pin 6
ESP32 GPIO8  → X5
ESP32 GPIO9  → X6
ESP32 GPIO10 → X7
ESP32 GPIO11 → X8
```

**Y Electrodes (Receivers with Pullups)**:
```
Y1 → R1(pin 2) → J1 pin 7
Y2 → R2(pin 2) → J1 pin 8
Y3 → R3(pin 2) → J1 pin 9
Y4 → R4(pin 2) → J1 pin 10
Y5 → R5(pin 2) → J1 pin 11
Y6 → R6(pin 2) → J1 pin 12
Y7 → R7(pin 2)
Y8 → R8(pin 2)
```

**ESP32 Touch Pin Connections** (via software, not wired):
```
Touch T0 (GPIO4)  - Not used (conflict with X1)
Touch T1 (GPIO0)  → Y1
Touch T2 (GPIO2)  → Y2
Touch T3 (GPIO15) → Y3
Touch T4 (GPIO13) → Y4
Touch T5 (GPIO12) → Y5
Touch T6 (GPIO14) → Y6
Touch T7 (GPIO27) → Y7
Touch T8 (GPIO33) → Y8
```

#### 5. Add Labels
Add power flags:
- **PWR_FLAG** on +3.3V net
- **PWR_FLAG** on GND net

Add labels for clarity:
- "X_Electrodes" label for X1-X8
- "Y_Electrodes" label for Y1-Y8
- "To_White_Room" label for J1

---

## 🔧 Electrical Specifications

### Resistor Values
- **R1-R8**: 1MΩ, 0603 SMD
  - Purpose: Pullup for Y electrodes
  - Tolerance: 5% (J)
  - Power: 1/10W

### Power Requirements
- **Voltage**: 3.3V ±5%
- **Current**: < 10mA active, < 1mA sleep
- **Supply**: Clean, regulated 3.3V

### Signal Characteristics
- **Carrier Frequency**: 100kHz
- **Amplitude**: 3.3V (logic level)
- **Rise/Fall Time**: < 100ns
- **Capacitance Range**: 50-100pF (per intersection)

---

## 📊 Netlist File

A netlist file has been provided: `capacitive_touch_xy_pad.net`

**To import in KiCad**:
1. Open Schematic Editor
2. Tools → Import Netlist
3. Select `capacitive_touch_xy_pad.net`
4. KiCad will place components automatically
5. Manually arrange components for clean layout

---

## ✅ Schematic Checklist

- [ ] ESP32-WROOM-32 placed and powered
- [ ] All 8 X electrodes connected to GPIO
- [ ] All 8 Y electrodes connected to touch pins
- [ ] All 8 pullup resistors (1MΩ) installed
- [ ] 12-pin interface header connected
- [ ] Power flags added (+3.3V, GND)
- [ ] Labels added for clarity
- [ ] Electrical rules check (ERC) passes
- [ ] Netlist exported for PCB layout

---

## 🔍 ERC (Electrical Rules Check)

**Expected Warnings** (can be ignored):
- "Input pin not driven" for X electrodes (they're driven in software)
- "Power pin not powered" (if ESP32 symbol shows internal pins)

**Errors to Fix**:
- "Unconnected wire" - All pins must be connected
- "Short circuit" - Check for accidental overlaps
- "Multiple names for same net" - Use consistent net names

---

## 📱 Export to PDF

**To export schematic as PDF**:
1. File → Plot
2. Select "PDF" format
3. Enable all sheets
4. Set output directory
5. Click "Plot"

**Output**: `capacitive_touch_xy_pad_schematic.pdf`

---

## 🎯 Next Steps

After schematic is complete:
1. ✅ Run ERC to check for errors
2. ✅ Export netlist for PCB layout
3. ⏭️ Design PCB layout with electrode pattern
4. ⏭️ Generate Gerber files
5. ⏭️ Order prototype PCB

---

## 📚 Reference Documents

- **ESP32 Datasheet**: https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf
- **ESP32 Touch Sensing**: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/touch.html
- **KiCad Schematic Tutorial**: https://docs.kicad.org/6.0/en/eeschema/eeschema.html

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform - Capacitive Touch XY Pad
