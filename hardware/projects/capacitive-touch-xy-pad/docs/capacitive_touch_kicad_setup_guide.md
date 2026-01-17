# Capacitive Touch XY Pad - KiCad Setup Guide

**Your KiCad Project Files Are Ready!**

You've successfully created the KiCad project files. Now let's populate the schematic with components.

---

## ✅ What You Have Already

**Project Location**: `/Users/bretbouchard/apps/schill/white_room/hardware/kicad_projects/capacitive-touch-xy-pad/`

**Files Created**:
- ✅ `capacitive-touch-xy-pad.kicad_pro` - Project file
- ✅ `capacitive-touch-xy-pad.kicad_sch` - Schematic file (with symbol libraries loaded)
- ✅ `capacitive-touch-xy-pad.kicad_pcb` - PCB layout file (empty, ready for design)

---

## 🔧 Step-by-Step: Populate Schematic

### Step 1: Open KiCad Project

```bash
cd /Users/bretbouchard/apps/schill/white_room/hardware/kicad_projects/capacitive-touch-xy-pad
open capacitive-touch-xy-pad.kicad_pro
```

Or double-click the `.kicad_pro` file in Finder.

### Step 2: Open Schematic Editor

Click the **Schematic Editor** icon (looks like a schematic symbol) or press `Ctrl+E`.

### Step 3: Add ESP32 Module

1. Press `A` (Add symbol tool)
2. In the symbol chooser, type: `ESP32-WROOM-32`
3. Select it and click **OK**
4. Place it in the center of the schematic
5. Press `Esc` to exit add mode

### Step 4: Add 12-Pin Header

1. Press `A` (Add symbol)
2. Type: `Conn_01x12_Male`
3. Place it to the right of the ESP32

### Step 5: Add 8 Resistors (R1-R8)

1. Press `A`
2. Type: `R` (Device:R)
3. Set value to `1M` (press `V` after placing)
4. Place them below the ESP32
5. Repeat 8 times for R1 through R8

### Step 6: Add 16 Test Points (X1-X8, Y1-Y8)

1. Press `A`
2. Type: `TestPoint`
3. Place X1-X8 in a row above ESP32
4. Place Y1-Y8 in a row below ESP32

### Step 7: Add Power Symbols

1. Press `A`
2. Type: `+3.3V` - Place 2-3 times
3. Type: `GND` - Place 2-3 times

---

## 🔌 Step-by-Step: Wire Connections

### Power Connections

1. **Wire +3.3V**:
   - ESP32 pin 2 (VCC)
   - Header pin 1
   - All resistor pin 1 (top of each resistor)

2. **Wire GND**:
   - ESP32 pin 1 (GND)
   - Header pin 2

### X Electrodes (Top Row)

Wire test points to ESP32 GPIO:
```
X1 → ESP32 IO4  (GPIO4)
X2 → ESP32 IO5  (GPIO5)
X3 → ESP32 IO6  (GPIO6)
X4 → ESP32 IO7  (GPIO7)
X5 → ESP32 IO8  (GPIO8)
X6 → ESP32 IO9  (GPIO9)
X7 → ESP32 IO10 (GPIO10)
X8 → ESP32 IO11 (GPIO11)
```

Also wire X1-X4 to header:
```
X1 → Header pin 3
X2 → Header pin 4
X3 → Header pin 5
X4 → Header pin 6
```

### Y Electrodes (Bottom Row)

Wire test points through resistors:
```
Y1 → R1 pin 2 → Header pin 7
Y2 → R2 pin 2 → Header pin 8
Y3 → R3 pin 2 → Header pin 9
Y4 → R4 pin 2 → Header pin 10
Y5 → R5 pin 2 → Header pin 11
Y6 → R6 pin 2 → Header pin 12
Y7 → R7 pin 2 (not connected to header)
Y8 → R8 pin 2 (not connected to header)
```

---

## 🎨 Annotate Schematic

1. Press **Tools → Annotation → Annotate Schematic**
2. Click **Annotate** button
3. This assigns proper reference designators (U1, R1-R8, J1, TP1-TP16)

---

## ✅ Electrical Rules Check

1. Press **Inspect → Electrical Rules Checker**
2. Click **Run**
3. Fix any errors (ignore warnings about unconnected inputs)

**Expected Warnings** (safe to ignore):
- "Input pin not driven" for X electrodes (they're driven in software)
- "Power pin not powered" (if ESP32 symbol shows internal pins)

---

## 📤 Export Netlist

1. Press **File → Export → Netlist**
2. Select "Pcbnew" format
3. Save as `capacitive-touch-xy-pad.net`

---

## 🎯 Next: PCB Layout

After schematic is complete and validated:

1. Switch to **PCB Editor** (icon looks like a PCB)
2. Press **Tools → Update PCB from Schematic**
3. KiCad will import all components into PCB view
4. Arrange components and design the electrode pattern

---

## 💡 Tips

**Keyboard Shortcuts**:
- `A` - Add symbol
- `W` - Wire tool
- `V` - Edit value
- `R` - Rotate component
- `M` - Move component
- `Del` - Delete
- `Ctrl+Z` - Undo

**Adding Labels**:
- Press `L` to add label
- Type net name (e.g., "X1", "Y1", "+3.3V")
- Click to place

**Editing Component Values**:
- Click component
- Press `V`
- Type value (e.g., "1M" for resistors)

---

## 📱 Quick Reference

### Component Summary

| Ref | Component | Value | Quantity |
|-----|-----------|-------|----------|
| U1  | ESP32-WROOM-32 | - | 1 |
| J1  | Conn_01x12_Male | - | 1 |
| R1-R8 | Resistor | 1MΩ | 8 |
| X1-X8 | TestPoint | - | 8 |
| Y1-Y8 | TestPoint | - | 8 |

### Pin Mapping

**X Electrodes (GPIO 4-11)**:
- X1: GPIO4
- X2: GPIO5
- X3: GPIO6
- X4: GPIO7
- X5: GPIO8
- X6: GPIO9
- X7: GPIO10
- X8: GPIO11

**Y Electrodes (Touch pins T1-T8)**:
- Y1: T1 (GPIO0) + R1
- Y2: T2 (GPIO2) + R2
- Y3: T3 (GPIO15) + R3
- Y4: T4 (GPIO13) + R4
- Y5: T5 (GPIO12) + R5
- Y6: T6 (GPIO14) + R6
- Y7: T7 (GPIO27) + R7
- Y8: T8 (GPIO33) + R8

---

## 🚀 Ready to Build!

Once you complete the schematic and run ERC, you're ready to:
1. Update PCB from schematic
2. Design electrode pattern
3. Generate Gerber files
4. Order prototype PCB

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform
