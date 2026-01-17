# Capacitive Touch XY Pad - Fixed KiCad Guide

**✅ Schematic file fixed! Now let's add components.**

---

## 🔧 Step 1: Configure Symbol Libraries

**IMPORTANT**: You must add the KiCad library path first!

1. **Open KiCad Project**:
   ```bash
   cd /Users/bretbouchard/apps/schill/white_room/hardware/kicad_projects/capacitive-touch-xy-pad
   open capacitive-touch-xy-pad.kicad_pro
   ```

2. **Open Schematic Editor** (press `Ctrl+E` or click schematic icon)

3. **Add Symbol Library Path**:
   - Click **Preferences → Manage Symbol Libraries**
   - Click **Global Libraries** tab OR **Project Specific Libraries** tab
   - Click **+** button to add library
   - Navigate to: `../../kicad_libraries/symbols`
   - Select all `.lib` files or add the entire folder
   - Click **OK**

4. **Verify Libraries Loaded**:
   - Press `A` (Add symbol)
   - You should see "RF_Module", "Device", "Connector", etc.

---

## 🔧 Step 2: Add Components

### Add ESP32 Module

1. Press `A` (Add symbol tool)
2. In the filter box, type: `ESP32-WROOM-32`
3. Select it from **RF_Module** library
4. Click **OK**
5. Click to place it in the center of schematic
6. Press `Esc` to exit add mode

### Add 12-Pin Header

1. Press `A`
2. Type: `Conn_01x12`
3. Select **Conn_01x12_Male** from **Connector** library
4. Place it to the right of ESP32
5. Press `Esc`

### Add 8 Resistors

1. Press `A`
2. Type: `R`
3. Select **R** from **Device** library
4. Place 8 resistors in a row below ESP32
5. Press `V` (edit value) on each resistor
6. Type: `1M` (for 1 megohm)
7. Press `Esc`

### Add 16 Test Points

1. Press `A`
2. Type: `TestPoint`
3. Select **TestPoint** from **Connector** library
4. Place 8 test points in a row above ESP32 (label these X1-X8)
5. Place 8 test points in a row below ESP32 (label these Y1-Y8)
6. Press `Esc`

### Add Power Symbols

1. Press `A`
2. Type: `+3.3V`
3. Place 3-4 times around the schematic
4. Press `A`
5. Type: `GND`
6. Place 3-4 times around the schematic
7. Press `Esc`

---

## 🔌 Step 3: Wire Everything

### Wire Power

1. Press `W` (Wire tool)
2. Click on +3.3V symbol, then click on ESP32 VCC pin
3. Wire +3.3V to header pin 1
4. Wire +3.3V to top of all 8 resistors
5. Wire GND to ESP32 GND pin
6. Wire GND to header pin 2

### Wire X Electrodes

1. Wire X1 test point to ESP32 GPIO4
2. Wire X2 test point to ESP32 GPIO5
3. Wire X3 test point to ESP32 GPIO6
4. Wire X4 test point to ESP32 GPIO7
5. Wire X5 test point to ESP32 GPIO8
6. Wire X6 test point to ESP32 GPIO9
7. Wire X7 test point to ESP32 GPIO10
8. Wire X8 test point to ESP32 GPIO11

Also wire to header:
- X1 → Header pin 3
- X2 → Header pin 4
- X3 → Header pin 5
- X4 → Header pin 6

### Wire Y Electrodes

1. Wire Y1 test point to R1 bottom, then to header pin 7
2. Wire Y2 test point to R2 bottom, then to header pin 8
3. Wire Y3 test point to R3 bottom, then to header pin 9
4. Wire Y4 test point to R4 bottom, then to header pin 10
5. Wire Y5 test point to R5 bottom, then to header pin 11
6. Wire Y6 test point to R6 bottom, then to header pin 12
7. Wire Y7 test point to R7 bottom (no header connection)
8. Wire Y8 test point to R8 bottom (no header connection)

---

## 🎨 Step 4: Add Labels

1. Press `L` (Label tool)
2. Click on wires to name them:
   - X1, X2, X3, X4, X5, X6, X7, X8 (for X electrodes)
   - Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8 (for Y electrodes)
   - +3.3V, GND (for power nets)

---

## ✅ Step 5: Annotate

1. Click **Tools → Annotation → Annotate Schematic**
2. Click **Annotate** button
3. Components will be numbered automatically (U1, R1-R8, J1, TP1-TP16)

---

## 🔍 Step 6: Electrical Rules Check

1. Click **Inspect → Electrical Rules Checker**
2. Click **Run**
3. Review errors:
   - **ERRORS**: Must fix (unconnected wires, shorts, etc.)
   - **WARNINGS**: Usually safe to ignore (unconnected inputs, etc.)

---

## 📤 Step 7: Assign Footprints

1. Click **Tools → Edit Symbol Fields**
2. Select all components
3. Click **Assign Footprints**
4. KiCad will suggest footprints:
   - ESP32-WROOM-32: `RF_Module:ESP32-WROOM-32`
   - Resistors: `Resistor_SMD:R_0603_1608Metric`
   - Test points: `TestPoint:TestPoint_Pad_D2.0mm`
   - Header: `Connector_PinHeader_2.54mm:PinHeader_1x12_P2.54mm_Vertical`
5. Click **Apply** then **OK**

---

## 🎯 Step 8: Generate Netlist

1. Click **File → Export → Netlist**
2. Select "Pcbnew" format
3. Click **Export**
4. Save as `capacitive-touch-xy-pad.net`

---

## 🚀 Next: PCB Layout

1. Switch to **PCB Editor** (press `Ctrl+B` or click PCB icon)
2. Click **Tools → Update PCB from Schematic**
3. Components will appear in PCB view
4. Arrange and design electrode pattern

---

## 💡 Keyboard Shortcuts

- `A` - Add symbol
- `W` - Wire tool
- `L` - Add label
- `V` - Edit value
- `R` - Rotate component
- `M` - Move component
- `Del` - Delete
- `Ctrl+Z` - Undo
- `Ctrl+E` - Open schematic editor
- `Ctrl+B` - Open PCB editor

---

## 📊 Component Checklist

- [ ] ESP32-WROOM-32 (U1)
- [ ] 12-pin header (J1)
- [ ] 8× 1MΩ resistors (R1-R8)
- [ ] 8× X test points (TP1-TP8)
- [ ] 8× Y test points (TP9-TP16)
- [ ] Power symbols (+3.3V, GND)
- [ ] All wires connected
- [ ] Labels added
- [ ] Annotated
- [ ] Footprints assigned
- [ ] ERC passed
- [ ] Netlist exported

---

## ✅ You're Ready!

Once you complete these steps, you'll have:
- ✅ Complete schematic
- ✅ All components wired correctly
- ✅ Footprints assigned
- ✅ Netlist ready for PCB layout

**Next**: Design the electrode pattern in PCB editor!

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform
